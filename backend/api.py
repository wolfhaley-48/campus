from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, current_app, g, jsonify, request, send_file
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import BadRequest

from auth import (
    clear_session_cookie,
    hash_password,
    login_allowed,
    login_failed,
    login_required,
    login_succeeded,
    make_token,
    set_session_cookie,
    verify_password,
)
from constants import (
    DELIVERY_OPTIONS,
    REQUEST_STATUSES,
    REQUEST_TYPES,
    STATUS_TIMELINE_LABELS,
)
from db import get_db
from documents import request_pdf
from planner import plan_payload, minutes
from assistant import ask_assistant, student_context
from serializers import serialize_request, serialize_user
from services import (
    dashboard_payload,
    grades_payload,
    now_msk,
    notifications_payload,
    schedule_payload,
    visible_notifications_query,
)

bp = Blueprint("api", __name__, url_prefix="/api")

# Тратим то же время на несуществующий логин, чтобы по задержке нельзя
# было отличить «нет такого пользователя» от «неверный пароль».
DUMMY_HASH = hash_password("dummy-password-for-timing")


def _json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest("Ожидается JSON-объект")
    return data


@bp.errorhandler(BadRequest)
def invalid_body(error):
    return jsonify(error="bad_request", message=error.description), 400


@bp.get("/health")
def health():
    get_db().command("ping")
    return jsonify(status="ok", time=datetime.now(timezone.utc).isoformat())


@bp.post("/auth/login")
def login():
    data = _json_body()
    login_value = str(data.get("login", "")).strip().lower()[:64]
    password = str(data.get("password", ""))[:200]
    if not login_value or not password:
        return jsonify(error="bad_request", message="Укажите логин и пароль"), 400

    key = f"{request.remote_addr}:{login_value}"
    if not login_allowed(key):
        return (
            jsonify(
                error="too_many_attempts",
                message="Слишком много попыток входа. Попробуйте через несколько минут.",
            ),
            429,
        )

    user = get_db().users.find_one({"login": login_value})
    password_hash = user["password_hash"] if user else DUMMY_HASH
    password_ok = verify_password(password, password_hash)

    if not user or not password_ok:
        login_failed(key)
        return jsonify(error="invalid_credentials", message="Неверный логин или пароль"), 401

    login_succeeded(key)
    response = jsonify(user=serialize_user(user))
    set_session_cookie(response, make_token(user["_id"]))
    return response


@bp.post("/auth/logout")
def logout():
    response = jsonify(ok=True)
    clear_session_cookie(response)
    return response


@bp.get("/auth/me")
@login_required
def me():
    return jsonify(user=serialize_user(g.user))


@bp.get("/dashboard")
@login_required
def dashboard():
    return jsonify(dashboard_payload(get_db(), g.user))


@bp.get("/schedule")
@login_required
def schedule():
    try:
        offset = int(request.args.get("week", 0))
    except (TypeError, ValueError):
        offset = 0
    offset = max(-8, min(8, offset))
    return jsonify(schedule_payload(get_db(), g.user, offset))


@bp.get("/grades")
@login_required
def grades():
    return jsonify(grades_payload(get_db(), g.user["_id"]))


@bp.get("/requests")
@login_required
def list_requests():
    db = get_db()
    items = list(
        db.requests.find({"user_id": g.user["_id"]}).sort("created_at", -1)
    )
    return jsonify(
        requests=[serialize_request(doc) for doc in items],
        types=[
            {
                "key": key,
                "label": meta["label"],
                "description": meta["description"],
                "eta": meta["eta"],
            }
            for key, meta in REQUEST_TYPES.items()
        ],
        delivery=[
            {"key": key, "label": label} for key, label in DELIVERY_OPTIONS.items()
        ],
        statuses=[
            {"key": key, "label": meta["label"], "step": meta["step"]}
            for key, meta in REQUEST_STATUSES.items()
        ],
    )


@bp.post("/requests")
@login_required
def create_request():
    data = _json_body()
    request_type = str(data.get("type", "")).strip()
    delivery = str(data.get("delivery", "electronic")).strip()
    comment = str(data.get("comment", "")).strip()[:600]

    if request_type not in REQUEST_TYPES:
        return jsonify(error="bad_request", message="Неизвестный тип заявки"), 400
    if delivery not in DELIVERY_OPTIONS:
        return jsonify(error="bad_request", message="Неизвестный способ получения"), 400

    db = get_db()
    now = datetime.now(timezone.utc)
    year = now_msk().year
    prefix = REQUEST_TYPES[request_type]["prefix"]

    counter = db.counters.find_one_and_update(
        {"_id": f"requests-{prefix}-{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    number = f"{prefix}-{year}-{1000 + counter['seq']:04d}"

    doc = {
        "user_id": g.user["_id"],
        "number": number,
        "type": request_type,
        "delivery": delivery,
        "comment": comment,
        "status": "submitted",
        "timeline": [
            {
                "status": "submitted",
                "label": STATUS_TIMELINE_LABELS["submitted"],
                "at": now,
                "note": None,
            }
        ],
        "result_note": None,
        "created_at": now,
        "updated_at": now,
    }
    result = db.requests.insert_one(doc)
    doc["_id"] = result.inserted_id

    db.notifications.insert_one(
        {
            "audience": "user",
            "group": None,
            "user_id": g.user["_id"],
            "category": "request",
            "title": f"Заявка {number} принята",
            "body": (
                f"{REQUEST_TYPES[request_type]['label']}. "
                "Статус можно отслеживать в разделе «Заявки»."
            ),
            "created_at": now,
            "due_date": None,
            "read_by": [],
        }
    )

    return jsonify(request=serialize_request(doc)), 201


@bp.get("/requests/<request_id>")
@login_required
def get_request(request_id):
    try:
        oid = ObjectId(request_id)
    except (InvalidId, TypeError):
        return jsonify(error="not_found", message="Заявка не найдена"), 404

    doc = get_db().requests.find_one({"_id": oid, "user_id": g.user["_id"]})
    if not doc:
        return jsonify(error="not_found", message="Заявка не найдена"), 404
    return jsonify(request=serialize_request(doc))


@bp.get("/requests/<request_id>/document")
@login_required
def download_request(request_id):
    try:
        oid = ObjectId(request_id)
    except (InvalidId, TypeError):
        return jsonify(error="not_found"), 404
    doc = get_db().requests.find_one({
        "_id": oid, "user_id": g.user["_id"],
        "status": "ready", "delivery": "electronic",
    })
    if not doc:
        return jsonify(error="not_found", message="Документ недоступен"), 404
    return send_file(request_pdf(doc, g.user), mimetype="application/pdf",
                     as_attachment=True, download_name=f"campus-{doc['_id']}.pdf")


@bp.post("/assistant")
@login_required
def assistant_reply():
    data = _json_body()
    query = data.get("query")
    if not isinstance(query, str) or not query.strip() or len(query) > 1200:
        return jsonify(error="bad_request", message="Напишите запрос до 1200 символов"), 400
    key = f"assistant:{g.user['_id']}"
    if not login_allowed(key):
        return jsonify(error="too_many_attempts", message="Лимит запросов. Попробуйте через несколько минут."), 429
    login_failed(key)
    try:
        return jsonify(ask_assistant(query.strip(), student_context(get_db(), g.user)))
    except RuntimeError as error:
        return jsonify(error="assistant_unavailable", message=str(error)), 503


@bp.get("/plan")
@login_required
def get_plan():
    duration = request.args.get("duration", 45, type=int)
    if duration not in (30, 45, 60, 90):
        return jsonify(error="bad_request", message="Выберите длительность задачи"), 400
    return jsonify(plan_payload(get_db(), g.user, duration))


@bp.post("/plan")
@login_required
def add_plan_task():
    data = _json_body()
    title = data.get("title")
    duration = data.get("duration")
    if not isinstance(title, str) or not title.strip() or len(title) > 120 or type(duration) is not int or duration not in (30, 45, 60, 90):
        return jsonify(error="bad_request", message="Укажите задачу до 120 символов и длительность"), 400
    plan = plan_payload(get_db(), g.user, duration)
    day = next((d for d in plan["days"] if d["date"] == data.get("date")), None)
    window = next((w for w in day["windows"] if w["start"] == data.get("start")), None) if day else None
    if not window:
        return jsonify(error="conflict", message="Это окно уже недоступно. Обновите план."), 409
    start = minutes(window["start"])
    try:
        get_db().plan_tasks.insert_one({"user_id": g.user["_id"], "title": title.strip(), "date": day["date"],
                                       "start": window["start"], "end": window["suggestedEnd"],
                                       "slot_ticks": list(range(start // 15, (start + duration + 14) // 15))})
    except DuplicateKeyError:
        return jsonify(error="conflict", message="Это время уже занято. Обновите план."), 409
    return jsonify(ok=True), 201


@bp.delete("/plan/<task_id>")
@login_required
def remove_plan_task(task_id):
    try:
        oid = ObjectId(task_id)
    except (InvalidId, TypeError):
        return jsonify(error="not_found"), 404
    result = get_db().plan_tasks.delete_one({"_id": oid, "user_id": g.user["_id"]})
    return (jsonify(ok=True), 200) if result.deleted_count else (jsonify(error="not_found"), 404)


@bp.get("/notifications")
@login_required
def notifications():
    return jsonify(notifications_payload(get_db(), g.user))


@bp.post("/notifications/read-all")
@login_required
def read_all_notifications():
    db = get_db()
    db.notifications.update_many(
        visible_notifications_query(g.user),
        {"$addToSet": {"read_by": g.user["_id"]}},
    )
    return jsonify(ok=True, unread=0)


@bp.post("/notifications/<notification_id>/read")
@login_required
def read_notification(notification_id):
    try:
        oid = ObjectId(notification_id)
    except (InvalidId, TypeError):
        return jsonify(error="not_found", message="Уведомление не найдено"), 404

    db = get_db()
    query = {
        "$and": [
            {"_id": oid},
            visible_notifications_query(g.user),
        ]
    }
    if not db.notifications.find_one(query, {"_id": 1}):
        return jsonify(error="not_found", message="Уведомление не найдено"), 404

    db.notifications.update_one({"_id": oid}, {"$addToSet": {"read_by": g.user["_id"]}})
    unread = db.notifications.count_documents(
        {**visible_notifications_query(g.user), "read_by": {"$ne": g.user["_id"]}}
    )
    return jsonify(ok=True, unread=unread)
