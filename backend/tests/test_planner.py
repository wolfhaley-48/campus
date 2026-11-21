import unittest
from planner import free_windows
from app import app


class PlannerTest(unittest.TestCase):
    def test_merges_overlaps_and_ignores_cancelled(self):
        lessons = [{'start':'09:00', 'end':'10:30'}, {'start':'10:00','end':'11:00'},
                   {'start':'12:00', 'end':'13:00','change':{'kind':'cancelled'}}]
        tasks = [{'start':'13:00','end':'14:00'}]
        self.assertEqual(free_windows(lessons, tasks, 60), [
            {'start':'11:00','end':'13:00','suggestedEnd':'12:00'},
            {'start':'14:00','end':'18:00','suggestedEnd':'15:00'}])
        self.assertEqual(free_windows([{'start':'20:00','end':'21:00'}], [], 90, 1020), [])
        self.assertEqual(free_windows([], [], 30, 1100), [])

    def test_save_conflict_isolation_delete(self):
        with app.test_client() as client:
            client.post('/api/auth/login', json={'login':'anna','password':'kampus2026'})
            plan = client.get('/api/plan?duration=45').json
            day = next(day for day in plan['days'] if day['windows'])
            slot = day['windows'][0]
            payload = {'title':'__test_plan__','duration':45,'date':day['date'],'start':slot['start']}
            response = client.post('/api/plan', json=payload)
            self.assertEqual(response.status_code, 201)
            try:
                tasks = client.get('/api/plan').json['tasks']
                task = next(t for t in tasks if t['title'] == '__test_plan__')
                self.assertEqual(client.post('/api/plan', json=payload).status_code, 409)
                client.post('/api/auth/login', json={'login':'maksim','password':'kampus2026'})
                self.assertNotIn(task['id'], [t['id'] for t in client.get('/api/plan').json['tasks']])
                self.assertEqual(client.delete('/api/plan/'+task['id']).status_code,404)
            finally:
                client.post('/api/auth/login', json={'login':'anna','password':'kampus2026'})
                if 'task' in locals(): client.delete('/api/plan/'+task['id'])
            self.assertEqual(client.get('/api/plan?duration=15').status_code,400)
            self.assertEqual(client.post('/api/plan',json={'title':'','duration':45}).status_code,400)
