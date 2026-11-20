from constants import REQUEST_STATUSES, REQUEST_TYPES


def iso(value):
    return value.isoformat() if value else None


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "login": user["login"],
        "fullName": user["full_name"],
        "firstName": user.get("first_name") or user["full_name"].split()[1],
        "faculty": user["faculty"],
        "direction": user["direction"],
        "directionCode": user["direction_code"],
        "course": user["course"],
        "group": user["group"],
        "studentCard": user["student_card"],
        "email": user["email"],
        "studyForm": user["study_form"],
        "enrolledYear": user["enrolled_year"],
        "attendance": user.get("attendance"),
        "avatarHue": user.get("avatar_hue", 220),
    }


def serialize_lesson(doc, date=None):
    change = doc.get("change")
    return {
        "id": str(doc["_id"]),
        "subject": doc["subject"],
        "type": doc["type"],
        "start": doc["start"],
        "end": doc["end"],
        "room": doc["room"],
        "building": doc["building"],
        "teacher": doc["teacher"],
        "date": date.isoformat() if date else None,
        "change": change,
    }


def serialize_grade(doc):
    return {
        "id": str(doc["_id"]),
        "subject": doc["subject"],
        "control": doc["control"],
        "grade": doc["grade"],
        "credits": doc["credits"],
        "teacher": doc["teacher"],
        "semester": doc["semester"],
        "status": doc["status"],
        "examDate": doc.get("exam_date"),
        "comment": doc.get("comment"),
    }


def serialize_request(doc):
    request_type = REQUEST_TYPES.get(doc["type"], {})
    status_meta = REQUEST_STATUSES.get(doc["status"], {})
    return {
        "id": str(doc["_id"]),
        "number": doc["number"],
        "type": doc["type"],
        "typeLabel": request_type.get("label", doc.get("type_label", "Заявка")),
        "description": request_type.get("description"),
        "delivery": doc["delivery"],
        "comment": doc.get("comment", ""),
        "status": doc["status"],
        "statusLabel": status_meta.get("label", doc["status"]),
        "statusStep": status_meta.get("step", 0),
        "timeline": [
            {
                "status": event["status"],
                "label": event["label"],
                "at": iso(event["at"]),
                "note": event.get("note"),
            }
            for event in doc.get("timeline", [])
        ],
        "resultNote": doc.get("result_note"),
        "createdAt": iso(doc["created_at"]),
        "updatedAt": iso(doc["updated_at"]),
    }


def serialize_notification(doc, user_id):
    return {
        "id": str(doc["_id"]),
        "category": doc["category"],
        "title": doc["title"],
        "body": doc["body"],
        "createdAt": iso(doc["created_at"]),
        "dueDate": doc.get("due_date"),
        "isRead": user_id in doc.get("read_by", []),
    }
