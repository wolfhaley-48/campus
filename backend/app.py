import os

from flask import Flask, g, jsonify, request, send_from_directory
from werkzeug.security import safe_join

from api import bp
from social import social
from auth import load_user
from config import Config
from db import close_db, init_db


def create_app(config_class=Config):
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config_class)

    if os.getenv("APP_ENV", "development").strip().lower() == "production":
        if app.config["JWT_SECRET"] == "dev-only-secret-change-me":
            raise RuntimeError("JWT_SECRET must be set when APP_ENV=production")
        if not app.config["COOKIE_SECURE"]:
            app.logger.warning("COOKIE_SECURE=0: включите HTTPS и поставьте COOKIE_SECURE=1")

    if os.getenv("TRUST_PROXY", "0").lower() in {"1", "true", "yes"}:
        from werkzeug.middleware.proxy_fix import ProxyFix

        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    init_db(app)
    app.teardown_appcontext(close_db)
    app.register_blueprint(bp)
    app.register_blueprint(social)

    @app.before_request
    def before_request():
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("Origin")
            host = request.host
            allowed = set(app.config["FRONTEND_ORIGINS"]) | {
                f"https://{host}",
                f"http://{host}",
            }
            if origin and origin not in allowed:
                return jsonify(error="forbidden_origin", message="Запрос с чужого источника"), 403
        g.user = load_user()

    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "font-src 'self' data:; "
            "img-src 'self' data: blob:; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        if request.is_secure:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        elif request.path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify(error="not_found"), 404
        return error

    @app.errorhandler(500)
    def server_error(error):
        app.logger.exception("Unhandled error")
        return jsonify(error="server_error", message="Внутренняя ошибка сервера"), 500

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify(error="not_found"), 404

        dist = app.config["FRONTEND_DIST"]
        full_path = safe_join(str(dist), path) if path else None
        if path and full_path and os.path.isfile(full_path):
            return send_from_directory(dist, path)

        index = dist / "index.html"
        if index.is_file():
            return send_from_directory(dist, "index.html")

        return jsonify(
            status="ok",
            message="API запущен. Для интерфейса соберите frontend (npm run build) или запустите Vite на порту 5173.",
        )

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
