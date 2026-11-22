import unittest
from uuid import uuid4
from bson import ObjectId
from app import create_app
from db import get_db


class SocialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        with cls.app.app_context():
            cls.db = get_db()
            cls.anna = cls.db.users.find_one({"login": "anna"})
            cls.max = cls.db.users.find_one({"login": "maksim"})
            stranger = {
                **cls.anna,
                "_id": ObjectId(),
                "login": "__social_test_stranger",
                "group": "TEST-OTHER",
            }
            cls.stranger_id = stranger["_id"]
            cls.db.users.insert_one(stranger)
        cls.a = cls.app.test_client()
        cls.m = cls.app.test_client()
        cls.s = cls.app.test_client()
        for client, login in [
            (cls.a, "anna"),
            (cls.m, "maksim"),
            (cls.s, "__social_test_stranger"),
        ]:
            assert (
                client.post(
                    "/api/auth/login", json={"login": login, "password": "kampus2026"}
                ).status_code
                == 200
            )
        cls.prefix = "__social_test_" + uuid4().hex
        cls.dm = "dm:" + ":".join(sorted([str(cls.anna["_id"]), str(cls.max["_id"])]))

    @classmethod
    def tearDownClass(cls):
        cls.db.social_posts.delete_many({"body": {"$regex": "^" + cls.prefix}})
        cls.db.social_messages.delete_many({"body": {"$regex": "^" + cls.prefix}})
        cls.db.social_reads.delete_many({"user_id": cls.stranger_id})
        cls.db.users.delete_one({"_id": cls.stranger_id})
        cls.app.extensions["mongo_client"].close()

    def test_group_messages_are_member_only_and_body_is_validated(self):
        path = "/api/social/threads/group:" + self.anna["group"] + "/messages"
        response = self.a.post(
            path, json={"body": self.prefix + " hello group", "clientId": str(uuid4())}
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.m.get(path).status_code, 404)
        self.assertEqual(
            self.s.post(
                path, json={"body": "no", "clientId": str(uuid4())}
            ).status_code,
            404,
        )
        for data in [
            [],
            None,
            {"body": " "},
            {"body": "x" * 2001, "clientId": str(uuid4())},
        ]:
            self.assertEqual(self.a.post(path, json=data).status_code, 400)
        self.assertEqual(self.a.get(path + "?before=invalid").status_code, 400)

    def test_dm_persists_is_idempotent_and_checks_participants(self):
        path = "/api/social/threads/" + self.dm + "/messages"
        payload = {"body": self.prefix + " private", "clientId": str(uuid4())}
        one = self.a.post(path, json=payload)
        two = self.a.post(path, json=payload)
        self.assertEqual(one.status_code, 201)
        self.assertEqual(one.json["item"]["id"], two.json["item"]["id"])
        self.assertIn(
            payload["body"], [item["body"] for item in self.m.get(path).json["items"]]
        )
        self.assertEqual(self.s.get(path).status_code, 404)
        self.assertEqual(self.s.post(path, json=payload).status_code, 404)
        read = "/api/social/threads/" + self.dm + "/read"
        self.assertEqual(
            self.m.post(read, json={"lastId": one.json["item"]["id"]}).status_code, 200
        )
        room = next(
            room
            for room in self.m.get("/api/social/threads").json["threads"]
            if room["id"] == self.dm
        )
        self.assertEqual(room["unread"], 0)

    def test_wall_visibility_cursor_and_no_private_notifications(self):
        private = self.a.post(
            "/api/social/feed",
            json={"body": self.prefix + " group post", "scope": "group"},
        ).json["item"]
        public = self.a.post(
            "/api/social/feed",
            json={"body": self.prefix + " public post", "scope": "all"},
        ).json["item"]
        other = self.m.get("/api/social/feed").json
        ids = [item["id"] for item in other["items"]]
        self.assertIn(public["id"], ids)
        self.assertNotIn(private["id"], ids)
        first = self.a.get("/api/social/feed").json
        self.assertLessEqual(len(first["items"]), 10)
        if first["hasMore"]:
            second = self.a.get("/api/social/feed?before=" + first["nextCursor"]).json
            self.assertFalse(
                set(item["id"] for item in first["items"])
                & set(item["id"] for item in second["items"])
            )
        self.assertNotIn("password", str(first))
        self.assertNotIn("studentCard", str(first))
        self.assertEqual(self.a.get("/api/social/feed?before=no").status_code, 400)
        self.assertEqual(
            self.app.test_client().get("/api/social/feed").status_code, 401
        )
