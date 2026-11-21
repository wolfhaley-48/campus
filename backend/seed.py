from datetime import datetime, timedelta, timezone

from pymongo import MongoClient

from auth import hash_password
from config import Config
from constants import REQUEST_TYPES

PASSWORD = "kampus2026"

UTCNOW = datetime.now(timezone.utc)


def ago(days=0, hours=0, minutes=0):
    return UTCNOW - timedelta(days=days, hours=hours, minutes=minutes)


def lesson(group, weekday, start, end, subject, kind, room, building, teacher, change=None):
    return {
        "group": group,
        "weekday": weekday,
        "start": start,
        "end": end,
        "subject": subject,
        "type": kind,
        "room": room,
        "building": building,
        "teacher": teacher,
        "change": change,
    }


def grade(user_id, semester, subject, control, value, credits, teacher, status, exam_date=None):
    return {
        "user_id": user_id,
        "semester": semester,
        "subject": subject,
        "control": control,
        "grade": value,
        "credits": credits,
        "teacher": teacher,
        "status": status,
        "exam_date": exam_date,
        "comment": None,
    }


from demo_scenarios import apply_demo_scenarios

def main():
    client = MongoClient(Config.MONGO_URI, tz_aware=True, serverSelectionTimeoutMS=5000)
    db = client[Config.DB_NAME]

    for name in ["users", "schedule", "grades", "requests", "notifications", "counters", "plan_tasks"]:
        db[name].delete_many({})

    anna_id = db.users.insert_one(
        {
            "login": "anna",
            "password_hash": hash_password(PASSWORD),
            "full_name": "Смирнова Анна Викторовна",
            "first_name": "Анна",
            "faculty": "Факультет цифровых технологий",
            "direction_code": "09.03.03",
            "direction": "Прикладная информатика",
            "course": 3,
            "group": "ПИ-23-1",
            "student_card": "230145",
            "email": "a.smirnova@example.edu",
            "study_form": "Очная",
            "enrolled_year": 2023,
            "attendance": 94,
            "avatar_hue": 218,
        }
    ).inserted_id

    maxim_id = db.users.insert_one(
        {
            "login": "maksim",
            "password_hash": hash_password(PASSWORD),
            "full_name": "Орлов Максим Дмитриевич",
            "first_name": "Максим",
            "faculty": "Факультет экономики и управления",
            "direction_code": "38.03.01",
            "direction": "Экономика",
            "course": 2,
            "group": "ЭК-24-2",
            "student_card": "240318",
            "email": "m.orlov@example.edu",
            "study_form": "Очная",
            "enrolled_year": 2024,
            "attendance": 88,
            "avatar_hue": 28,
        }
    ).inserted_id

    db.users.create_index("login", unique=True)

    schedule = [
        # ПИ-23-1, Анна
        lesson("ПИ-23-1", 1, "09:00", "10:30", "Математический анализ", "Лекция", "214", "Корпус А", "доц. Ковалёв А. Н."),
        lesson("ПИ-23-1", 1, "10:45", "12:15", "Базы данных", "Лаборатория", "308", "Корпус Б", "ст. преп. Лебедева М. С."),
        lesson("ПИ-23-1", 1, "12:45", "14:15", "Физика", "Практика", "117", "Корпус А", "проф. Гусев В. П."),
        lesson("ПИ-23-1", 2, "09:00", "10:30", "Иностранный язык", "Практика", "402", "Корпус В", "преп. Морозова Е. А."),
        lesson(
            "ПИ-23-1", 2, "10:45", "12:15", "Алгоритмы и структуры данных", "Лекция",
            "101", "Корпус Б", "проф. Соколов Д. И.",
            {"kind": "moved", "note": "Перенос из ауд. 210, корпус А"},
        ),
        lesson("ПИ-23-1", 2, "12:45", "14:15", "Физическая культура", "Практика", "Спортзал", "Корпус Г", "ст. преп. Титов Р. С."),
        lesson("ПИ-23-1", 3, "10:45", "12:15", "Базы данных", "Лекция", "214", "Корпус А", "доц. Лебедева М. С."),
        lesson("ПИ-23-1", 3, "12:45", "14:15", "Теория вероятностей", "Практика", "118", "Корпус А", "доц. Никитина О. В."),
        lesson(
            "ПИ-23-1", 3, "14:30", "16:00", "Курсовой проект", "Консультация",
            "312", "Корпус Б", "проф. Соколов Д. И.",
            {"kind": "cancelled", "note": "Отменена: преподаватель на конференции"},
        ),
        lesson("ПИ-23-1", 4, "09:00", "10:30", "Математический анализ", "Практика", "207", "Корпус А", "доц. Ковалёв А. Н."),
        lesson("ПИ-23-1", 4, "10:45", "12:15", "Веб-технологии", "Лаборатория", "305", "Корпус Б", "ст. преп. Егоров П. А."),
        lesson("ПИ-23-1", 4, "12:45", "14:15", "Философия", "Лекция", "120", "Корпус А", "проф. Белова Т. С."),
        lesson("ПИ-23-1", 5, "09:00", "10:30", "Алгоритмы и структуры данных", "Практика", "310", "Корпус Б", "проф. Соколов Д. И."),
        lesson("ПИ-23-1", 5, "10:45", "12:15", "Иностранный язык", "Практика", "402", "Корпус В", "преп. Морозова Е. А."),
        lesson(
            "ПИ-23-1", 5, "12:45", "14:15", "Теория вероятностей", "Лекция",
            "101", "Корпус Б", "доц. Никитина О. В.",
            {"kind": "substitute", "note": "Замена: доц. Никитина О. В."},
        ),
        lesson("ПИ-23-1", 6, "10:45", "12:15", "Веб-технологии", "Практика", "305", "Корпус Б", "ст. преп. Егоров П. А."),
        # ЭК-24-2, Максим
        lesson("ЭК-24-2", 1, "09:00", "10:30", "Микроэкономика", "Лекция", "201", "Корпус А", "доц. Романова И. К."),
        lesson("ЭК-24-2", 1, "10:45", "12:15", "Математика", "Практика", "305", "Корпус А", "ст. преп. Зайцев Н. П."),
        lesson("ЭК-24-2", 1, "12:45", "14:15", "Статистика", "Лекция", "118", "Корпус Б", "проф. Мельникова С. Ю."),
        lesson("ЭК-24-2", 2, "09:00", "10:30", "Бухгалтерский учёт", "Практика", "220", "Корпус Б", "доц. Фомина Л. А."),
        lesson("ЭК-24-2", 2, "10:45", "12:15", "Иностранный язык", "Практика", "401", "Корпус В", "преп. Морозова Е. А."),
        lesson("ЭК-24-2", 3, "10:45", "12:15", "Экономическая теория", "Лекция", "202", "Корпус А", "проф. Романова И. К."),
        lesson("ЭК-24-2", 3, "12:45", "14:15", "Физическая культура", "Практика", "Спортзал", "Корпус Г", "ст. преп. Титов Р. С."),
        lesson(
            "ЭК-24-2", 4, "09:00", "10:30", "Статистика", "Лаборатория",
            "306", "Корпус Б", "проф. Мельникова С. Ю.",
            {"kind": "moved", "note": "Перенос из ауд. 118"},
        ),
        lesson("ЭК-24-2", 4, "10:45", "12:15", "Экономическая теория", "Практика", "202", "Корпус А", "проф. Романова И. К."),
        lesson("ЭК-24-2", 5, "09:00", "10:30", "Математика", "Практика", "305", "Корпус А", "ст. преп. Зайцев Н. П."),
        lesson(
            "ЭК-24-2", 5, "10:45", "12:15", "История экономики", "Лекция",
            "121", "Корпус А", "доц. Киселёв П. А.",
            {"kind": "cancelled", "note": "Отменена, материалы отправлены на почту"},
        ),
        lesson("ЭК-24-2", 6, "10:45", "12:15", "Бухгалтерский учёт", "Практика", "220", "Корпус Б", "доц. Фомина Л. А."),
    ]
    db.schedule.insert_many(schedule)

    grades = [
        # Анна, 5 семестр (текущий)
        grade(anna_id, 5, "Базы данных", "Экзамен", None, 5, "доц. Лебедева М. С.", "planned", "2026-12-18"),
        grade(anna_id, 5, "Математический анализ", "Экзамен", None, 5, "доц. Ковалёв А. Н.", "planned", "2026-12-15"),
        grade(anna_id, 5, "Физика", "Экзамен", None, 4, "проф. Гусев В. П.", "planned", "2026-12-21"),
        grade(anna_id, 5, "Алгоритмы и структуры данных", "Экзамен", None, 5, "проф. Соколов Д. И.", "planned", "2026-12-23"),
        grade(anna_id, 5, "Теория вероятностей", "Зачёт", "Зачтено", 4, "доц. Никитина О. В.", "passed"),
        grade(anna_id, 5, "Веб-технологии", "Зачёт", "Зачтено", 4, "ст. преп. Егоров П. А.", "passed"),
        grade(anna_id, 5, "Философия", "Зачёт", "Зачтено", 3, "проф. Белова Т. С.", "passed"),
        grade(anna_id, 5, "Курсовой проект", "Курсовая", None, 2, "проф. Соколов Д. И.", "planned", "2026-12-24"),
        # Анна, 4 семестр
        grade(anna_id, 4, "Базы данных", "Экзамен", 5, 5, "доц. Лебедева М. С.", "passed"),
        grade(anna_id, 4, "Математический анализ", "Экзамен", 4, 5, "доц. Ковалёв А. Н.", "passed"),
        grade(anna_id, 4, "Теория вероятностей", "Зачёт", "Зачтено", 4, "доц. Никитина О. В.", "passed"),
        grade(anna_id, 4, "Веб-технологии", "Зачёт", "Зачтено", 4, "ст. преп. Егоров П. А.", "passed"),
        grade(anna_id, 4, "Алгоритмы и структуры данных", "Экзамен", 4, 5, "проф. Соколов Д. И.", "passed"),
        grade(anna_id, 4, "Философия", "Зачёт", "Зачтено", 3, "проф. Белова Т. С.", "passed"),
        grade(anna_id, 4, "Экономика", "Зачёт", "Зачтено", 2, "доц. Романова И. К.", "passed"),
        grade(anna_id, 4, "Курсовой проект", "Курсовая", 5, 2, "проф. Соколов Д. И.", "passed"),
        # Максим, 3 семестр (текущий)
        grade(maxim_id, 3, "Микроэкономика", "Экзамен", None, 5, "доц. Романова И. К.", "planned", "2026-12-16"),
        grade(maxim_id, 3, "Бухгалтерский учёт", "Экзамен", None, 5, "доц. Фомина Л. А.", "planned", "2026-12-19"),
        grade(maxim_id, 3, "Математика", "Экзамен", None, 5, "ст. преп. Зайцев Н. П.", "planned", "2026-12-22"),
        grade(maxim_id, 3, "Экономическая теория", "Экзамен", None, 5, "проф. Романова И. К.", "planned", "2026-12-24"),
        grade(maxim_id, 3, "Статистика", "Зачёт", "Зачтено", 4, "проф. Мельникова С. Ю.", "passed"),
        grade(maxim_id, 3, "История экономики", "Зачёт", "Зачтено", 3, "доц. Киселёв П. А.", "passed"),
        grade(maxim_id, 3, "Иностранный язык", "Зачёт", "Зачтено", 3, "преп. Морозова Е. А.", "passed"),
        grade(maxim_id, 3, "Философия", "Зачёт", "Зачтено", 3, "проф. Белова Т. С.", "passed"),
        # Максим, 2 семестр
        grade(maxim_id, 2, "Микроэкономика", "Экзамен", 4, 5, "доц. Романова И. К.", "passed"),
        grade(maxim_id, 2, "Математика", "Экзамен", 4, 5, "ст. преп. Зайцев Н. П.", "passed"),
        grade(maxim_id, 2, "Статистика", "Зачёт", "Зачтено", 4, "проф. Мельникова С. Ю.", "passed"),
        grade(maxim_id, 2, "Бухгалтерский учёт", "Экзамен", 5, 5, "доц. Фомина Л. А.", "passed"),
        grade(maxim_id, 2, "История экономики", "Зачёт", "Зачтено", 3, "доц. Киселёв П. А.", "passed"),
        grade(maxim_id, 2, "Экономическая теория", "Экзамен", 4, 5, "проф. Романова И. К.", "passed"),
        grade(maxim_id, 2, "Иностранный язык", "Зачёт", "Зачтено", 3, "преп. Морозова Е. А.", "passed"),
    ]
    db.grades.insert_many(grades)

    requests = [
        {
            "user_id": anna_id,
            "number": "СП-2026-1042",
            "type": "certificate_education",
            "delivery": "electronic",
            "comment": "Нужна для оформления банковской карты.",
            "status": "ready",
            "timeline": [
                {"status": "submitted", "label": "Заявка подана", "at": ago(days=5), "note": None},
                {"status": "in_progress", "label": "Принята в работу", "at": ago(days=4), "note": None},
                {"status": "ready", "label": "Готова к выдаче", "at": ago(hours=3), "note": "PDF сформирован"},
            ],
            "result_note": "PDF готов в разделе «Заявки». Оригинал можно забрать в деканате, ауд. 115.",
            "created_at": ago(days=5),
            "updated_at": ago(hours=3),
        },
        {
            "user_id": anna_id,
            "number": "ЗВ-2026-1010",
            "type": "application_scholarship",
            "delivery": "paper",
            "comment": "Академическая стипендия, первый курс обучения.",
            "status": "in_progress",
            "timeline": [
                {"status": "submitted", "label": "Заявка подана", "at": ago(days=2), "note": None},
                {"status": "in_progress", "label": "Принята в работу", "at": ago(days=1), "note": "Проверяет стипендиальная комиссия"},
            ],
            "result_note": None,
            "created_at": ago(days=2),
            "updated_at": ago(days=1),
        },
        {
            "user_id": anna_id,
            "number": "СП-2026-1049",
            "type": "certificate_military",
            "delivery": "paper",
            "comment": "",
            "status": "submitted",
            "timeline": [
                {"status": "submitted", "label": "Заявка подана", "at": ago(hours=2), "note": None},
            ],
            "result_note": None,
            "created_at": ago(hours=2),
            "updated_at": ago(hours=2),
        },
        {
            "user_id": maxim_id,
            "number": "СП-2026-1046",
            "type": "certificate_education",
            "delivery": "electronic",
            "comment": "Для работодателя.",
            "status": "in_progress",
            "timeline": [
                {"status": "submitted", "label": "Заявка подана", "at": ago(days=1), "note": None},
                {"status": "in_progress", "label": "Принята в работу", "at": ago(hours=8), "note": None},
            ],
            "result_note": None,
            "created_at": ago(days=1),
            "updated_at": ago(hours=8),
        },
        {
            "user_id": maxim_id,
            "number": "ЗВ-2026-1011",
            "type": "application_retake",
            "delivery": "paper",
            "comment": "Экономическая теория, пересдача 26 ноября.",
            "status": "submitted",
            "timeline": [
                {"status": "submitted", "label": "Заявка подана", "at": ago(hours=1), "note": None},
            ],
            "result_note": None,
            "created_at": ago(hours=1),
            "updated_at": ago(hours=1),
        },
    ]
    db.requests.insert_many(requests)

    db.counters.insert_many(
        [
            {"_id": "requests-СП-2026", "seq": 51},
            {"_id": "requests-ЗВ-2026", "seq": 12},
        ]
    )

    today = UTCNOW.date()
    notifications = [
        {
            "audience": "all",
            "group": None,
            "user_id": None,
            "category": "dean",
            "title": "Сессия начнётся 15 декабря",
            "body": "Расписание экзаменов опубликовано. Даты и аудитории — в разделе «Успеваемость».",
            "created_at": ago(days=1),
            "due_date": "2026-12-15",
            "read_by": [],
        },
        {
            "audience": "all",
            "group": None,
            "user_id": None,
            "category": "dean",
            "title": "Выбор дисциплин на весну",
            "body": "До 30 ноября выберите курсы по выбору. Список и часы — в деканате и у куратора.",
            "created_at": ago(days=2),
            "due_date": (today + timedelta(days=11)).isoformat(),
            "read_by": [anna_id],
        },
        {
            "audience": "all",
            "group": None,
            "user_id": None,
            "category": "dean",
            "title": "Деканат принимает до 19:00",
            "body": "В дни сессии окно №4 работает до 19:00, кроме субботы и воскресенья.",
            "created_at": ago(days=6),
            "due_date": None,
            "read_by": [anna_id, maxim_id],
        },
        {
            "audience": "group",
            "group": "ПИ-23-1",
            "user_id": None,
            "category": "schedule",
            "title": "Перенос занятия: алгоритмы и структуры данных",
            "body": "Вторник, 10:45. Занятие пройдёт в ауд. 101, корпус Б вместо ауд. 210.",
            "created_at": ago(hours=3),
            "due_date": None,
            "read_by": [],
        },
        {
            "audience": "group",
            "group": "ПИ-23-1",
            "user_id": None,
            "category": "deadline",
            "title": "Заявление на стипендию",
            "body": "Успейте подать заявление в разделе «Заявки». Проверьте номер карты в профиле.",
            "created_at": ago(hours=5),
            "due_date": (today + timedelta(days=6)).isoformat(),
            "read_by": [],
        },
        {
            "audience": "group",
            "group": "ПИ-23-1",
            "user_id": None,
            "category": "schedule",
            "title": "Консультация по курсовому проекту отменена",
            "body": "Среда, 14:30. Новое время — 26 ноября в 15:00, ауд. 312.",
            "created_at": ago(days=1, hours=2),
            "due_date": None,
            "read_by": [anna_id],
        },
        {
            "audience": "group",
            "group": "ЭК-24-2",
            "user_id": None,
            "category": "schedule",
            "title": "Лаборатория по статистике перенесена",
            "body": "Четверг, 09:00. Занятие пройдёт в ауд. 306, корпус Б.",
            "created_at": ago(hours=4),
            "due_date": None,
            "read_by": [],
        },
        {
            "audience": "group",
            "group": "ЭК-24-2",
            "user_id": None,
            "category": "deadline",
            "title": "Пересдача по экономической теории — 26 ноября",
            "body": "Заявление уже можно подать в разделе «Заявки». Возьмите зачётку.",
            "created_at": ago(days=1),
            "due_date": (today + timedelta(days=7)).isoformat(),
            "read_by": [],
        },
        {
            "audience": "user",
            "group": None,
            "user_id": anna_id,
            "category": "request",
            "title": "Заявка СП-2026-1042 готова",
            "body": "Справка об обучении ждёт вас в разделе «Заявки». PDF уже доступен.",
            "created_at": ago(hours=3),
            "due_date": None,
            "read_by": [],
        },
        {
            "audience": "user",
            "group": None,
            "user_id": maxim_id,
            "category": "request",
            "title": "Заявка СП-2026-1046 в работе",
            "body": "Справка об обучении готовится. Обычно это занимает 1–2 рабочих дня.",
            "created_at": ago(hours=5),
            "due_date": None,
            "read_by": [],
        },
    ]
    db.notifications.insert_many(notifications)

    apply_demo_scenarios(db)
    print("Демо-данные загружены.")
    print(f"База: {Config.DB_NAME}")
    print(f"Анна:   login=anna   password={PASSWORD}")
    print(f"Максим: login=maksim password={PASSWORD}")
    print(f"Записей: {len(schedule)} занятий, {db.grades.count_documents({})} оценок, {len(requests)} заявок, {db.notifications.count_documents({})} уведомлений")
    client.close()


if __name__ == "__main__":
    main()
