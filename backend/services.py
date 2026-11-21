import re
from urllib.parse import urlencode
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from serializers import iso, serialize_grade, serialize_lesson, serialize_notification
from constants import REQUEST_STATUSES, REQUEST_TYPES

MOSCOW = ZoneInfo("Europe/Moscow")


def now_msk():
    return datetime.now(MOSCOW)


def monday_of_week(offset=0):
    today = now_msk().date()
    monday = today - timedelta(days=today.isoweekday() - 1)
    return monday + timedelta(weeks=offset)


def lessons_for(db, group, date):
    if date.isoweekday() == 7 or not group:
        return []
    return list(
        db.schedule.find({"group": group, "weekday": date.isoweekday()}).sort("start", 1)
    )


def lesson_status(lesson, now):
    if (lesson.get("change") or {}).get("kind") == "cancelled":
        return "cancelled"
    if lesson["end"] <= now.strftime("%H:%M"):
        return "past"
    if lesson["start"] <= now.strftime("%H:%M") <= lesson["end"]:
        return "now"
    return "upcoming"


def schedule_payload(db, user, offset=0):
    start = monday_of_week(offset)
    today = now_msk().date()
    now = now_msk()
    days = []
    for shift in range(7):
        date = start + timedelta(days=shift)
        lessons = []
        for doc in lessons_for(db, user.get("group"), date):
            item = serialize_lesson(doc, date)
            item["status"] = lesson_status(doc, now) if date == today else None
            lessons.append(item)
        days.append(
            {
                "date": date.isoformat(),
                "weekday": date.isoweekday(),
                "isToday": date == today,
                "lessons": lessons,
            }
        )
    return {
        "weekStart": start.isoformat(),
        "weekEnd": (start + timedelta(days=6)).isoformat(),
        "today": today.isoformat(),
        "days": days,
    }


def find_next_lesson(db, user):
    now = now_msk()
    today = now.date()
    for shift in range(8):
        date = today + timedelta(days=shift)
        for doc in lessons_for(db, user.get("group"), date):
            if (doc.get("change") or {}).get("kind") == "cancelled":
                continue
            if shift == 0 and doc["start"] <= now.strftime("%H:%M"):
                continue
            return {
                "date": date.isoformat(),
                "weekday": date.isoweekday(),
                "lesson": serialize_lesson(doc, date),
            }
    return None


def grades_payload(db, user_id):
    docs = list(db.grades.find({"user_id": user_id}))
    if not docs:
        return {"semesters": [], "summary": None}

    current_semester = max(doc["semester"] for doc in docs)
    by_semester = {}
    for doc in docs:
        by_semester.setdefault(doc["semester"], []).append(serialize_grade(doc))

    semesters = []
    for number in sorted(by_semester, reverse=True):
        subjects = sorted(by_semester[number], key=lambda item: item["subject"])
        numeric = [item["grade"] for item in subjects if isinstance(item["grade"], int)]
        semesters.append(
            {
                "number": number,
                "label": f"{number} семестр",
                "subjects": subjects,
                "average": round(sum(numeric) / len(numeric), 1) if numeric else None,
                "credits": sum(item["credits"] for item in subjects),
                "creditsEarned": sum(
                    item["credits"] for item in subjects if item["status"] == "passed"
                ),
            }
        )

    current = next(item for item in semesters if item["number"] == current_semester)
    numeric_all = [doc["grade"] for doc in docs if isinstance(doc["grade"], int)]
    debts = [
        doc for doc in docs if doc["status"] == "retake"
    ]
    summary = {
        "currentSemester": current_semester,
        "currentLabel": current["label"],
        "average": current["average"],
        "overallAverage": round(sum(numeric_all) / len(numeric_all), 1) if numeric_all else None,
        "creditsEarned": current["creditsEarned"],
        "creditsTotal": current["credits"],
        "debts": len(debts),
        "gradedCount": len([d for d in docs if isinstance(d["grade"], int)]),
    }
    return {"semesters": semesters, "summary": summary}


def visible_notifications_query(user):
    return {
        "$or": [
            {"audience": "all"},
            {"audience": "group", "group": user.get("group")},
            {"audience": "user", "user_id": user["_id"]},
        ]
    }


def notifications_payload(db, user, limit=None):
    query = visible_notifications_query(user)
    cursor = db.notifications.find(query).sort("created_at", -1)
    if limit:
        cursor = cursor.limit(limit)
    docs = list(cursor)
    items = [serialize_notification(doc, user["_id"]) for doc in docs]
    for doc, item in zip(docs, items):
        if doc.get("category") == "request":
            number = re.search(r"(?:СП|ЗВ)-[0-9]{4}-[0-9]{4,}", doc.get("title", ""))
            related = db.requests.find_one({"user_id": user["_id"], "number": number.group()}) if number else None
            if related:
                item["action"] = {"label": "Открыть заявку", "href": f"/requests/{related['_id']}"}
        elif doc.get("category") == "schedule":
            item["action"] = {"label": "Посмотреть расписание", "href": "/schedule"}
        elif doc.get("category") == "deadline":
            text = (doc.get("title", "") + " " + doc.get("body", "")).lower()
            kind = "application_retake" if "пересдач" in text else "application_scholarship" if "стипенди" in text else None
            item["action"] = {"label": "Подать заявление" if kind else "Найти время на подготовку",
                              "href": f"/requests?new=1&type={kind}" if kind else "/plan?" + urlencode({"task":doc["title"], "duration":60})}
    unread = db.notifications.count_documents(
        {**query, "read_by": {"$ne": user["_id"]}}
    )
    return {"notifications": items, "unread": unread}


def dashboard_payload(db, user):
    today = now_msk().date()
    now = now_msk()
    today_lessons = []
    for doc in lessons_for(db, user.get("group"), today):
        item = serialize_lesson(doc, today)
        item["status"] = lesson_status(doc, now)
        today_lessons.append(item)

    grades = grades_payload(db, user["_id"])
    summary = grades.get("summary") or {}

    active_requests = list(
        db.requests.find(
            {"user_id": user["_id"], "status": {"$in": ["submitted", "in_progress"]}}
        ).sort("created_at", -1)
    )
    recent_requests = list(
        db.requests.find({"user_id": user["_id"]}).sort("created_at", -1).limit(2)
    )
    deadlines = list(
        db.notifications.find(
            {
                "$and": [
                    visible_notifications_query(user),
                    {"category": "deadline"},
                    {"due_date": {"$gte": today.isoformat()}},
                ]
            }
        ).sort("due_date", 1).limit(3)
    )
    notifications = notifications_payload(db, user, limit=3)

    return {
        "today": {
            "date": today.isoformat(),
            "weekday": today.isoweekday(),
            "lessons": today_lessons,
        },
        "nextLesson": find_next_lesson(db, user),
        "stats": {
            "average": summary.get("average") or summary.get("overallAverage"),
            "currentAverage": summary.get("average"),
            "creditsEarned": summary.get("creditsEarned"),
            "creditsTotal": summary.get("creditsTotal"),
            "debts": summary.get("debts", 0),
            "attendance": user.get("attendance"),
            "activeRequests": len(active_requests),
        },
        "deadlines": [serialize_notification(doc, user["_id"]) for doc in deadlines],
        "notifications": notifications["notifications"],
        "unread": notifications["unread"],
        "requests": [
            {
                "id": str(doc["_id"]),
                "number": doc["number"],
                "status": doc["status"],
                "statusLabel": REQUEST_STATUSES.get(doc["status"], {}).get("label", doc["status"]),
                "type": doc["type"],
                "typeLabel": REQUEST_TYPES.get(doc["type"], {}).get("label", "Заявка"),
                "createdAt": iso(doc["created_at"]),
            }
            for doc in recent_requests
        ],
    }
