"""Idempotent fictional histories; never reset student requests or personal plans."""
from datetime import datetime, timedelta, timezone


def apply_demo_scenarios(db):
    subjects = ['Иностранный язык', 'История', 'Математика', 'Информатика', 'Физическая культура', 'Экономика']
    for login, current in [('anna', 5), ('maksim', 3)]:
        user = db.users.find_one({'login': login})
        if not user:
            continue
        for semester in range(1, current + 1):
            if db.grades.count_documents({'user_id': user['_id'], 'semester': semester}):
                continue
            for index, subject in enumerate(subjects):
                failing = login == 'maksim' and index < 2
                db.grades.insert_one({'user_id': user['_id'], 'semester': semester, 'subject': subject,
                    'control': 'Экзамен' if index < 4 else 'Зачёт', 'grade': 2 if failing else (4 + index % 2 if index < 4 else 'Зачтено'),
                    'credits': 5, 'teacher': 'доц. Волкова И. С.', 'status': 'retake' if failing else 'passed',
                    'exam_date': None, 'comment': 'Нужна пересдача' if failing else None})
        if login == 'maksim':
            db.users.update_one({'_id': user['_id']}, {'$set': {'attendance': 43, 'academic_risk': True}})
            db.grades.update_many({'user_id': user['_id'], 'semester': 3,
                'subject': {'$in': ['Микроэкономика', 'Бухгалтерский учёт', 'Математика', 'Экономическая теория', 'Статистика', 'Иностранный язык']}},
                {'$set': {'grade': 2, 'status': 'retake', 'comment': 'Работа не зачтена. Нужна подготовка к пересдаче.'}})
            db.grades.update_many({'user_id': user['_id'], 'semester': 2, 'subject': {'$in': ['Математика','Микроэкономика','Бухгалтерский учёт']}},
                {'$set': {'grade': 2, 'status': 'retake', 'comment': 'Долг за предыдущий семестр'}})
            now = datetime.now(timezone.utc)
            for key, title, body, days in [
                ('retake', 'Пропущен срок записи на пересдачу', 'Свяжитесь с деканатом и подайте заявление на пересдачу. Дата требует согласования.', -2),
                ('coursework', 'Курсовая работа не сдана', 'Срок сдачи истёк. Согласуйте новый срок с преподавателем и добавьте подготовку в личный план.', -1),
                ('consultation', 'Консультация по математике', 'Подготовьте вопросы по несданным темам и проверьте расписание консультации у преподавателя.', 2),
            ]:
                db.notifications.update_one({'user_id':user['_id'], 'demo_scenario':key}, {'$setOnInsert': {
                    'audience':'user', 'group':None, 'category':'deadline', 'title':title, 'body':body,
                    'created_at':now, 'due_date':(now.date()+timedelta(days=days)).isoformat(), 'read_by':[]}}, upsert=True)
