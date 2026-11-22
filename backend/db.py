from flask import current_app, g
from pymongo import ASCENDING, MongoClient


def get_db():
    if "db" not in g:
        client = current_app.extensions["mongo_client"]
        g.db = client[current_app.config["DB_NAME"]]
    return g.db


def init_db(app):
    client = MongoClient(
        app.config["MONGO_URI"],
        serverSelectionTimeoutMS=5000,
        tz_aware=True,
    )
    app.extensions["mongo_client"] = client

    db = client[app.config["DB_NAME"]]
    db.plan_tasks.create_index([("user_id", ASCENDING), ("date", ASCENDING), ("slot_ticks", ASCENDING)],
                               unique=True, partialFilterExpression={"slot_ticks": {"$exists": True}})
    db.plan_tasks.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
    db.social_posts.create_index('demo_key', unique=True, sparse=True)
    db.social_posts.create_index([('scope',ASCENDING),('group',ASCENDING),('_id',ASCENDING)])
    db.social_messages.create_index([('channel',ASCENDING),('_id',ASCENDING)])
    db.social_messages.create_index([('channel',ASCENDING),('author_id',ASCENDING),('client_id',ASCENDING)], unique=True, partialFilterExpression={'client_id':{'$exists':True}})
    db.social_reads.create_index([('user_id',ASCENDING),('channel',ASCENDING)],unique=True)
    db.users.create_index("login", unique=True)
    db.schedule.create_index([("group", ASCENDING), ("weekday", ASCENDING), ("start", ASCENDING)])
    db.grades.create_index([("user_id", ASCENDING), ("semester", ASCENDING)])
    db.requests.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    db.notifications.create_index([("audience", ASCENDING), ("created_at", ASCENDING)])


def close_db(_exc=None):
    # Клиент Mongo общий на процесс; здесь только отпускаем ссылку
    # на базу в контексте запроса.
    g.pop("db", None)
