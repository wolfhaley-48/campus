import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
    DB_NAME = os.getenv("DB_NAME", "campus_demo")

    # In production set a long random JWT_SECRET in .env — never ship the default.
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "12"))

    COOKIE_NAME = os.getenv("COOKIE_NAME", "campus_session")
    COOKIE_SECURE = _bool("COOKIE_SECURE", "0")

    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

    LOGIN_RATE_LIMIT = int(os.getenv("LOGIN_RATE_LIMIT", "10"))
    LOGIN_RATE_WINDOW = int(os.getenv("LOGIN_RATE_WINDOW", "300"))

    FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
