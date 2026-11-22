"""Fictional campus wall and member-scoped conversations."""

from datetime import datetime, timedelta, timezone
from uuid import UUID
from bson import ObjectId
from bson.errors import InvalidId
from flask import Blueprint, g, jsonify, request
from pymongo.errors import DuplicateKeyError
from werkzeug.exceptions import BadRequest, NotFound
from auth import login_required
from db import get_db

social = Blueprint("social", __name__, url_prefix="/api/social")


def oid(value):
    if not isinstance(value, str):
        raise BadRequest("Неверный указатель страницы")
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise BadRequest("Неверный указатель страницы")


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest("Ожидается JSON-объект")
    return data


@social.errorhandler(BadRequest)
def bad_request(error):
    return jsonify(message=error.description, error="bad_request"), 400


@social.errorhandler(NotFound)
def missing(error):
    return jsonify(message="Диалог не найден", error="not_found"), 404


def identity(user):
    return {
        "id": str(user["_id"]),
        "fullName": user["full_name"],
        "login": user["login"],
        "group": user["group"],
    }


def author(db, doc):
    user = db.users.find_one(
        {"_id": doc.get("author_id")}, {"full_name": 1, "login": 1, "group": 1}
    )
    return (
        identity(user)
        if user
        else {
            "id": "demo",
            "fullName": "Редакция Кампуса · демо",
            "login": "demo",
            "group": "",
        }
    )


def serialize(db, doc):
    return {
        "id": str(doc["_id"]),
        "body": doc["body"],
        "author": author(db, doc),
        "createdAt": doc["created_at"].isoformat(),
        "scope": doc.get("scope"),
        "demo": bool(doc.get("demo_key")),
    }


def channel_access(db, channel):
    if channel == f"group:{g.user['group']}":
        return
    if channel.startswith("dm:"):
        parts = channel[3:].split(":")
        if (
            len(parts) == 2
            and parts == sorted(set(parts))
            and str(g.user["_id"]) in parts
        ):
            try:
                ids = [ObjectId(value) for value in parts]
            except InvalidId:
                raise NotFound()
            if db.users.count_documents({"_id": {"$in": ids}}) == 2:
                return
    raise NotFound()


@social.get("/feed")
@login_required
def feed():
    db = get_db()
    query = {"$or": [{"scope": "all"}, {"scope": "group", "group": g.user["group"]}]}
    before = request.args.get("before")
    if before:
        query["_id"] = {"$lt": oid(before)}
    docs = list(db.social_posts.find(query).sort("_id", -1).limit(11))
    items = docs[:10]
    return jsonify(
        items=[serialize(db, d) for d in items],
        hasMore=len(docs) > 10,
        nextCursor=str(items[-1]["_id"]) if len(docs) > 10 else None,
    )


@social.post("/feed")
@login_required
def publish():
    data = body()
    text = data.get("body")
    scope = data.get("scope", "group")
    if (
        not isinstance(text, str)
        or not text.strip()
        or len(text) > 2000
        or scope not in ("all", "group")
    ):
        raise BadRequest("Напиши пост до 2000 символов и выбери, кому его показать")
    db = get_db()
    doc = {
        "body": text.strip(),
        "scope": scope,
        "group": g.user["group"] if scope == "group" else None,
        "author_id": g.user["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    doc["_id"] = db.social_posts.insert_one(doc).inserted_id
    return jsonify(item=serialize(db, doc)), 201


@social.get("/threads")
@login_required
def threads():
    db = get_db()
    me = str(g.user["_id"])
    rooms = [
        {
            "id": f"group:{g.user['group']}",
            "title": f"Чат группы · {g.user['group']}",
            "kind": "group",
        }
    ]
    peers = list(
        db.users.find(
            {"_id": {"$ne": g.user["_id"]}}, {"full_name": 1, "login": 1, "group": 1}
        )
        .sort("full_name", 1)
        .limit(100)
    )
    for peer in peers:
        rooms.append(
            {
                "id": "dm:" + ":".join(sorted([me, str(peer["_id"])])),
                "title": peer["full_name"],
                "kind": "dm",
                "peer": identity(peer),
            }
        )
    for room in rooms:
        latest = db.social_messages.find_one(
            {"channel": room["id"]}, sort=[("_id", -1)]
        )
        read = db.social_reads.find_one(
            {"user_id": g.user["_id"], "channel": room["id"]}
        )
        query = {"channel": room["id"], "author_id": {"$ne": g.user["_id"]}}
        if read:
            query["_id"] = {"$gt": read["last_id"]}
        room["unread"] = db.social_messages.count_documents(query)
        room["preview"] = (
            latest["body"][:100] if latest else "Пока тихо. Напиши первым."
        )
        room["updatedAt"] = latest["created_at"].isoformat() if latest else None
    return jsonify(threads=rooms)


@social.get("/threads/<path:channel>/messages")
@login_required
def messages(channel):
    db = get_db()
    channel_access(db, channel)
    query = {"channel": channel}
    before = request.args.get("before")
    after = request.args.get("after")
    if before and after:
        raise BadRequest("Выбери одно направление загрузки")
    if before or after:
        query["_id"] = {"$lt" if before else "$gt": oid(before or after)}
    docs = list(
        db.social_messages.find(query).sort("_id", 1 if after else -1).limit(31)
    )
    items = docs[:30]
    if not after:
        items.reverse()
    return jsonify(
        items=[serialize(db, d) for d in items],
        hasMore=len(docs) > 30,
        nextCursor=str(items[0]["_id"]) if items and not after else None,
    )


@social.post("/threads/<path:channel>/messages")
@login_required
def send(channel):
    db = get_db()
    channel_access(db, channel)
    data = body()
    text = data.get("body")
    client_id = data.get("clientId")
    if not isinstance(text, str) or not text.strip() or len(text) > 2000:
        raise BadRequest("Сообщение должно содержать от 1 до 2000 символов")
    try:
        UUID(client_id)
    except (ValueError, TypeError, AttributeError):
        raise BadRequest("Не удалось определить отправку. Попробуй ещё раз")
    key = {"channel": channel, "author_id": g.user["_id"], "client_id": client_id}
    doc = {**key, "body": text.strip(), "created_at": datetime.now(timezone.utc)}
    try:
        doc["_id"] = db.social_messages.insert_one(doc).inserted_id
    except DuplicateKeyError:
        doc = db.social_messages.find_one(key)
    return jsonify(item=serialize(db, doc)), 201


@social.post("/threads/<path:channel>/read")
@login_required
def read(channel):
    db = get_db()
    channel_access(db, channel)
    last = oid(body().get("lastId"))
    if not db.social_messages.find_one({"_id": last, "channel": channel}):
        raise NotFound()
    db.social_reads.update_one(
        {"user_id": g.user["_id"], "channel": channel},
        {"$max": {"last_id": last}},
        upsert=True,
    )
    return jsonify(ok=True)


def seed_social_demo(db):
    topics = [
        "Кто на настолки после пар? Встречаемся в студклубе в 17:00. Правила объясним на месте.",
        "Собираем команду на студенческий хакатон. Ищем дизайн, код и идеи. Можно без опыта.",
        "В библиотеке появился тихий зал для командной работы. Место можно уточнить у стойки.",
        "Кино после учёбы: выбираем фильм в студклубе. Приноси свой вариант.",
        "Перед сессией выбери одну тему на сегодня и найди окно в личном плане. Маленький шаг тоже считается.",
        "Это демо-стена Кампуса: новости и люди здесь вымышлены. Личные заявки остаются только у владельца.",
        "Нужен напарник для английского? Обменяйтесь расписаниями в личке и устройте разговорный перерыв.",
        "Ищем музыку для студенческого плейлиста. Какой трек спасает тебя по дороге на первую пару?",
        "Дизайнерский разбор в пятницу: приноси свой первый макет. Обсудим решения, а не автора.",
        "Кто готовит портфолио к стажировке? Можно собрать мини-группу и дать друг другу обратную связь.",
        "Студклуб собирает книжный обмен. Прочитал — передай дальше. Учебники тоже можно.",
        "Потерял зонт у библиотеки? Загляни на стойку находок. Не публикуй чужие документы на стене.",
        "После длинного дня полезно выйти из корпуса и пройтись. Кто составит компанию на короткий круг?",
        "У тебя есть идея для проекта, но нет команды? Напиши, какую задачу хочешь решить и кто нужен.",
        "Тренировка по волейболу для новичков. Уточняй время у спортивного клуба, форму можно обычную.",
        "Придумали тему для мини-подкаста: как пережить первую защиту проекта. Делитесь историями.",
        "Кто делает конспекты в электронном виде? Обсудим удобные способы в чате группы.",
        "Для тех, кто пропустил пару: сначала спроси материалы у одногруппников, потом отметь подготовку в плане.",
        "Собираем идеи для студенческой фотопрогулки. Можно с телефоном, камера не обязательна.",
        "Устроим вечер коротких презентаций: пять минут на идею, которую хочется кому-то рассказать.",
        "Напоминание команды студклуба: не выкладывай чужие фото без согласия. Хороший движ комфортен всем.",
        "Хочешь потренировать собеседование? Найди партнёра и разберите по три вопроса друг для друга.",
        "Вопрос дня: где у тебя лучше получается сосредоточиться — в библиотеке, дома или с командой?",
        "Если всё накопилось, начни не с идеального плана, а с одного конкретного дела на 30 минут.",
        "Ищем добровольцев для тестирования студенческих проектов. Пять минут обратной связи очень помогают.",
        "Кто умеет монтировать короткие видео? Нужна помощь с роликом студклуба, идеи тоже пригодятся.",
        "На стене можно звать людей на совместную подготовку. Дату экзамена всё равно сверяй с расписанием.",
        "Субботний обмен навыками: расскажи о том, что умеешь, и о том, чему хочешь научиться.",
        "Ищем ведущего для викторины. Важнее любопытство и чувство юмора, опыт не обязателен.",
        "Кто собирает команду на проект по базам данных? Можно начать с короткого знакомства в личке.",
        "Хорошая обратная связь начинается с конкретного наблюдения: что сработало, где возник вопрос.",
        "Завтра можно сделать паузу между задачами. Свободное окно — это ещё и время отдохнуть.",
        "Студенческий клуб обсуждает новый формат встреч. Что удобнее: короткие воркшопы или открытые разборы?",
        "Хочешь показать свою работу? Опиши, кому она помогает и какую задачу решает. Картинка не обязательна.",
        "Командный созвон не должен занимать весь вечер. Согласуйте три вопроса заранее и проверьте свободное время.",
        "На связи Кампус. Твоя группа, личка и план находятся рядом — можно начинать с того, что важно сейчас.",
    ]
    now = datetime.now(timezone.utc)
    # Insert oldest first so cursor ordering matches the fictional chronology.
    for index in range(35, -1, -1):
        db.social_posts.update_one(
            {"demo_key": f"wall-{index}"},
            {
                "$set": {"body": topics[index % len(topics)]},
                "$setOnInsert": {
                    "scope": "all",
                    "group": None,
                    "author_id": None,
                    "created_at": now - timedelta(hours=index * 3),
                },
            },
            upsert=True,
        )
