"""Contest core: authentication, ownership and server trust boundaries.

Uses the existing demo accounts. Removes only records created by these tests;
does not seed, reset the database or modify existing notification read state.
"""

from datetime import datetime, timedelta, timezone
import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from bson import ObjectId
import jwt

from app import create_app
from auth import verify_password
from config import Config
from db import get_db


class SecurityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        with cls.app.app_context():
            cls.db = get_db()
            cls.anna = cls.db.users.find_one({"login": "anna"})
            cls.maksim = cls.db.users.find_one({"login": "maksim"})
        assert cls.anna and cls.maksim, "Existing demo accounts are required"

    @classmethod
    def tearDownClass(cls):
        cls.app.extensions["mongo_client"].close()

    def login(self, client, login="anna"):
        response = client.post(
            "/api/auth/login", json={"login": login, "password": "kampus2026"}
        )
        self.assertEqual(response.status_code, 200)
        return response

    def test_core_endpoints_require_authentication(self):
        client = self.app.test_client()
        for path in (
            "/api/auth/me", "/api/dashboard", "/api/schedule", "/api/grades",
            "/api/requests", "/api/notifications", "/api/plan",
            "/api/social/feed", "/api/social/threads",
            f"/api/requests/{ObjectId()}",
        ):
            with self.subTest(method="GET", path=path):
                self.assertEqual(client.get(path).status_code, 401)
        for path in (
            "/api/requests", "/api/notifications/read-all", "/api/plan",
            "/api/assistant", "/api/social/feed",
        ):
            with self.subTest(method="POST", path=path):
                self.assertEqual(client.post(path, json={}).status_code, 401)

    def test_two_profiles_have_required_fields_without_credentials(self):
        profiles = []
        required = {"fullName", "faculty", "direction", "course", "group"}
        for login, account in (("anna", self.anna), ("maksim", self.maksim)):
            client = self.app.test_client()
            self.login(client, login)
            response = client.get("/api/auth/me")
            self.assertEqual(response.status_code, 200)
            profile = response.json["user"]
            self.assertTrue(required <= profile.keys())
            self.assertTrue(all(profile[key] for key in required))
            self.assertEqual(profile["id"], str(account["_id"]))
            for forbidden in ("password", "password_hash", "token", "jwt"):
                self.assertNotIn(forbidden, profile)
            profiles.append(profile)
        self.assertNotEqual(profiles[0]["id"], profiles[1]["id"])
        self.assertNotEqual(profiles[0]["group"], profiles[1]["group"])
        self.assertNotEqual(profiles[0]["faculty"], profiles[1]["faculty"])

    def test_password_hashes_cookie_and_logout(self):
        for account in (self.anna, self.maksim):
            self.assertNotIn("password", account)
            self.assertTrue(account["password_hash"].startswith("scrypt:"))
            self.assertTrue(verify_password("kampus2026", account["password_hash"]))
            self.assertFalse(verify_password("wrong-password", account["password_hash"]))
        client = self.app.test_client()
        response = self.login(client)
        cookie = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Lax", cookie)
        self.assertIn("Path=/", cookie)
        self.assertEqual(client.post("/api/auth/logout").status_code, 200)
        self.assertEqual(client.get("/api/auth/me").status_code, 401)

    def test_tampered_expired_and_wrong_subject_tokens_are_rejected(self):
        now = datetime.now(timezone.utc)
        payload = {"sub": str(self.anna["_id"]), "iat": now, "exp": now + timedelta(hours=1)}
        tokens = (
            "not-a-token",
            jwt.encode(payload, "incorrect-secret", algorithm="HS256"),
            jwt.encode({**payload, "exp": now - timedelta(seconds=1)},
                       self.app.config["JWT_SECRET"], algorithm="HS256"),
            jwt.encode({**payload, "sub": "not-an-object-id"},
                       self.app.config["JWT_SECRET"], algorithm="HS256"),
        )
        for token in tokens:
            with self.subTest(token_kind=tokens.index(token)):
                client = self.app.test_client()
                client.set_cookie(self.app.config["COOKIE_NAME"], token)
                self.assertEqual(client.get("/api/auth/me").status_code, 401)

    def test_json_validation_and_login_injection_do_not_bypass_auth(self):
        client = self.app.test_client()
        response = client.post("/api/auth/login", json={
            "login": {"$ne": None}, "password": {"$ne": None},
        })
        self.assertIn(response.status_code, (400, 401))
        self.assertEqual(client.get("/api/auth/me").status_code, 401)
        self.login(client)
        for path in ("/api/requests", "/api/plan", "/api/assistant"):
            for raw in ('[1]', 'null', '"text"', '{broken'):
                with self.subTest(path=path, raw=raw):
                    response = client.post(path, data=raw, content_type="application/json")
                    self.assertEqual(response.status_code, 400)
        for payload in (
            {"type": {"$ne": None}},
            {"type": "certificate_education", "delivery": "unknown"},
        ):
            self.assertEqual(client.post("/api/requests", json=payload).status_code, 400)

    def test_request_owner_is_session_not_body_and_data_persists(self):
        client = self.app.test_client()
        self.login(client)
        marker = "__security_test_" + uuid4().hex
        response = client.post("/api/requests", json={
            "type": "certificate_education", "delivery": "electronic",
            "comment": marker, "user_id": str(self.maksim["_id"]),
        })
        self.assertEqual(response.status_code, 201)
        item = response.json["request"]
        request_id = ObjectId(item["id"])
        try:
            stored = self.db.requests.find_one({"_id": request_id})
            self.assertEqual(stored["user_id"], self.anna["_id"])
            self.assertEqual(stored["status"], "submitted")
            self.assertEqual(stored["comment"], marker)
            fresh = self.app.test_client()
            self.login(fresh)
            persisted = fresh.get(f"/api/requests/{request_id}")
            self.assertEqual(persisted.status_code, 200)
            self.assertEqual(persisted.json["request"]["comment"], marker)
            self.assertEqual(persisted.json["request"]["timeline"][0]["status"], "submitted")
            other = self.app.test_client()
            self.login(other, "maksim")
            self.assertEqual(other.get(f"/api/requests/{request_id}").status_code, 404)
            self.assertEqual(other.get(f"/api/requests/{request_id}/document").status_code, 404)
            self.assertNotIn(item["id"], [r["id"] for r in other.get("/api/requests").json["requests"]])
        finally:
            self.db.requests.delete_one({"_id": request_id, "user_id": self.anna["_id"], "comment": marker})
            self.db.notifications.delete_many({
                "user_id": self.anna["_id"], "title": f"Заявка {item['number']} принята",
            })

    def test_foreign_notification_cannot_be_read_or_marked(self):
        marker = "__security_test_" + uuid4().hex
        notification_id = self.db.notifications.insert_one({
            "audience": "user", "user_id": self.anna["_id"], "group": None,
            "category": "dean", "title": marker, "body": marker,
            "created_at": datetime.now(timezone.utc), "due_date": None, "read_by": [],
        }).inserted_id
        try:
            other = self.app.test_client()
            self.login(other, "maksim")
            items = other.get("/api/notifications").json["notifications"]
            self.assertNotIn(str(notification_id), [item["id"] for item in items])
            self.assertEqual(other.post(f"/api/notifications/{notification_id}/read").status_code, 404)
            stored = self.db.notifications.find_one({"_id": notification_id})
            self.assertEqual(stored["read_by"], [])
        finally:
            self.db.notifications.delete_one({"_id": notification_id, "title": marker})

    def test_foreign_origin_is_blocked_and_security_headers_are_set(self):
        client = self.app.test_client()
        response = client.post("/api/auth/login", json={
            "login": "anna", "password": "kampus2026",
        }, headers={"Origin": "https://attacker.example"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(client.get("/api/auth/me").status_code, 401)
        # Matching attacker-controlled Origin and Host must not establish trust.
        spoofed = client.post("/api/auth/login", json={
            "login": "anna", "password": "kampus2026",
        }, base_url="https://attacker.example", headers={"Origin": "https://attacker.example"})
        self.assertEqual(spoofed.status_code, 403)
        self.login(client)
        self.assertEqual(client.post("/api/requests", json={
            "type": "certificate_education",
        }, headers={"Origin": "https://attacker.example"}).status_code, 403)
        response = client.get("/api/auth/me", base_url="https://localhost")
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertIn("default-src 'self'", response.headers["Content-Security-Policy"])
        self.assertIn("max-age=", response.headers["Strict-Transport-Security"])

    def test_group_post_likes_comments_check_visibility_identity_and_retry(self):
        client, other = self.app.test_client(), self.app.test_client()
        self.login(client)
        self.login(other, "maksim")
        marker = "__security_test_" + uuid4().hex
        response = client.post("/api/social/feed", json={
            "body": marker, "scope": "group", "group": self.maksim["group"],
            "author_id": str(self.maksim["_id"]),
        })
        self.assertEqual(response.status_code, 201)
        post_id = ObjectId(response.json["item"]["id"])
        path = f"/api/social/feed/{post_id}"
        try:
            stored = self.db.social_posts.find_one({"_id": post_id})
            self.assertEqual(stored["group"], self.anna["group"])
            self.assertEqual(stored["author_id"], self.anna["_id"])
            self.assertEqual(other.get(path + "/comments").status_code, 404)
            self.assertEqual(other.post(path + "/like", json={"liked": True}).status_code, 404)
            self.assertEqual(other.post(path + "/comments", json={
                "body": marker, "clientId": str(uuid4()),
            }).status_code, 404)
            for invalid in (1, "true", None, [], {}):
                with self.subTest(liked=invalid):
                    self.assertEqual(client.post(path + "/like", json={"liked": invalid}).status_code, 400)
            for _ in range(2):
                liked = client.post(path + "/like", json={"liked": True})
                self.assertEqual(liked.status_code, 200)
                self.assertEqual(liked.json["item"]["likes"], 1)
                self.assertTrue(liked.json["item"]["liked"])
            self.assertEqual(client.post(path + "/like", json={"liked": False}).json["item"]["likes"], 0)
            self.assertEqual(client.post(path + "/comments", json={"body": marker, "clientId": "invalid"}).status_code, 400)
            payload = {
                "body": marker + " comment", "clientId": str(uuid4()),
                "author_id": str(self.maksim["_id"]),
            }
            one = client.post(path + "/comments", json=payload)
            two = client.post(path + "/comments", json=payload)
            self.assertEqual(one.status_code, 201)
            self.assertEqual(two.status_code, 201)
            self.assertEqual(one.json["item"]["id"], two.json["item"]["id"])
            self.assertEqual(two.json["count"], 1)
            self.assertEqual(one.json["item"]["author"]["id"], str(self.anna["_id"]))
            self.assertEqual(self.db.social_comments.count_documents({"post_id": post_id}), 1)
            items = client.get(path + "/comments").json["items"]
            self.assertEqual([item["body"] for item in items], [payload["body"]])
        finally:
            self.db.social_comments.delete_many({"post_id": post_id})
            self.db.social_posts.delete_one({"_id": post_id, "body": marker})

    def test_production_rejects_default_jwt_secret(self):
        class UnsafeConfig(Config):
            JWT_SECRET = "dev-only-secret-change-me"

        with patch.dict(os.environ, {"APP_ENV": "production"}):
            with self.assertRaisesRegex(RuntimeError, "JWT_SECRET must be set"):
                create_app(UnsafeConfig)


if __name__ == "__main__":
    unittest.main()
