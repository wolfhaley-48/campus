import time
from datetime import datetime, timedelta, timezone
from functools import wraps
from threading import Lock

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from flask import current_app, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db


def hash_password(password: str) -> str:
    return generate_password_hash(password, method="scrypt")


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def make_token(user_id: ObjectId) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=current_app.config["JWT_TTL_HOURS"]),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def set_session_cookie(response, token: str):
    response.set_cookie(
        current_app.config["COOKIE_NAME"],
        token,
        max_age=current_app.config["JWT_TTL_HOURS"] * 3600,
        httponly=True,
        secure=current_app.config["COOKIE_SECURE"],
        samesite="Lax",
        path="/",
    )


def clear_session_cookie(response):
    response.delete_cookie(
        current_app.config["COOKIE_NAME"],
        path="/",
        secure=current_app.config["COOKIE_SECURE"],
        httponly=True,
        samesite="Lax",
    )


def load_user():
    token = request.cookies.get(current_app.config["COOKIE_NAME"])
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"],
        )
        user_id = ObjectId(payload["sub"])
    except (jwt.PyJWTError, InvalidId, KeyError, TypeError):
        return None
    return get_db().users.find_one({"_id": user_id})


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if g.user is None:
            return jsonify(error="unauthorized", message="Требуется вход"), 401
        return fn(*args, **kwargs)

    return wrapper


# Простой ограничитель попыток входа. В MVP живёт в памяти процесса;
# при нескольких воркерах счётчик у каждого свой, это осознанное упрощение.
_ATTEMPTS: dict[str, list[float]] = {}
_ATTEMPTS_LOCK = Lock()


def login_allowed(key: str) -> bool:
    now = time.time()
    window = current_app.config["LOGIN_RATE_WINDOW"]
    limit = current_app.config["LOGIN_RATE_LIMIT"]
    with _ATTEMPTS_LOCK:
        recent = [stamp for stamp in _ATTEMPTS.get(key, []) if now - stamp < window]
        _ATTEMPTS[key] = recent
        return len(recent) < limit


def login_failed(key: str):
    with _ATTEMPTS_LOCK:
        _ATTEMPTS.setdefault(key, []).append(time.time())


def login_succeeded(key: str):
    with _ATTEMPTS_LOCK:
        _ATTEMPTS.pop(key, None)
