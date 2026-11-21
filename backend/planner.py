from datetime import timedelta

from services import lessons_for, now_msk


def minutes(value):
    hour, minute = map(int, value.split(':'))
    return hour * 60 + minute


def clock(value):
    return f'{value // 60:02d}:{value % 60:02d}'


def free_windows(lessons, tasks, duration, start=540, end=1080):
    busy = sorted((minutes(item['start']), minutes(item['end'])) for item in [*lessons, *tasks]
                  if (item.get('change') or {}).get('kind') != 'cancelled')
    windows = []
    cursor = start
    for left, right in busy + [(end, end)]:
        left = min(left, end)
        if left - cursor >= duration:
            windows.append({'start': clock(cursor), 'end': clock(min(left, end)),
                            'suggestedEnd': clock(cursor + duration)})
        cursor = max(cursor, right)
        if cursor >= end:
            break
    return windows


def plan_payload(db, user, duration):
    now = now_msk()
    tasks = list(db.plan_tasks.find({'user_id': user['_id']}).sort([('date', 1), ('start', 1)]))
    days = []
    for shift in range(7):
        date = now.date() + timedelta(days=shift)
        today_start = max(540, ((now.hour * 60 + now.minute + 14) // 15) * 15) if shift == 0 else 540
        lessons = lessons_for(db, user.get('group'), date)
        daily_tasks = [t for t in tasks if t['date'] == date.isoformat()]
        days.append({'date': date.isoformat(), 'windows': free_windows(lessons, daily_tasks, duration, today_start),
                     'lessonCount': sum((l.get('change') or {}).get('kind') != 'cancelled' for l in lessons)})
    return {'days': days, 'tasks': [{'id': str(t['_id']), 'title': t['title'], 'date': t['date'],
                                   'start': t['start'], 'end': t['end']} for t in tasks], 'duration': duration}
