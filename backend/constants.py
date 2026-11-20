REQUEST_TYPES = {
    "certificate_education": {
        "label": "Справка об обучении",
        "short": "Справка об обучении",
        "prefix": "СП",
        "description": "Подтверждает факт обучения, курс и форму обучения.",
        "eta": "1–2 рабочих дня",
    },
    "certificate_military": {
        "label": "Справка для военкомата",
        "short": "Для военкомата",
        "prefix": "СП",
        "description": "Форма для военного комиссариата, с подписью и печатью.",
        "eta": "2–3 рабочих дня",
    },
    "certificate_scholarship": {
        "label": "Справка о стипендии",
        "short": "О стипендии",
        "prefix": "СП",
        "description": "Сумма выплат за последние три месяца.",
        "eta": "1–2 рабочих дня",
    },
    "application_scholarship": {
        "label": "Заявление на стипендию",
        "short": "На стипендию",
        "prefix": "ЗВ",
        "description": "Академическая или социальная стипендия.",
        "eta": "до 5 рабочих дней",
    },
    "application_retake": {
        "label": "Заявление на пересдачу",
        "short": "На пересдачу",
        "prefix": "ЗВ",
        "description": "Пересдача зачёта или экзамена в текущую сессию.",
        "eta": "до 3 рабочих дней",
    },
    "application_leave": {
        "label": "Академический отпуск",
        "short": "Академотпуск",
        "prefix": "ЗВ",
        "description": "По медицинским или семейным обстоятельствам.",
        "eta": "до 10 рабочих дней",
    },
}

DELIVERY_OPTIONS = {
    "electronic": "Электронно, PDF в кабинете",
    "paper": "Бумажный оригинал в деканате",
}

REQUEST_STATUSES = {
    "submitted": {"label": "Подана", "step": 0},
    "in_progress": {"label": "В работе", "step": 1},
    "ready": {"label": "Готова", "step": 2},
    "rejected": {"label": "Отклонена", "step": 2},
}

STATUS_TIMELINE_LABELS = {
    "submitted": "Заявка подана",
    "in_progress": "Принята в работу",
    "ready": "Готова к выдаче",
    "rejected": "Отклонена",
}
