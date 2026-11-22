import unittest

from app import app


class RequestBodyTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        app.extensions['mongo_client'].close()

    def test_non_object_body_returns_400(self):
        with app.test_client() as client:
            response = client.post('/api/auth/login', json={
                'login': 'anna', 'password': 'kampus2026',
            })
            self.assertEqual(response.status_code, 200)
            for path in ['/api/auth/login', '/api/requests']:
                for body in ['[1]', 'null', '"text"', 'invalid']:
                    with self.subTest(path=path, body=body):
                        response = client.post(path, data=body, content_type='application/json')
                        self.assertEqual(response.status_code, 400)
                        self.assertEqual(response.json['error'], 'bad_request')

    def test_api_without_slash_is_json_404(self):
        with app.test_client() as client:
            response = client.get('/api')
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json['error'], 'not_found')

    def test_untrusted_origin_is_rejected_before_login(self):
        with app.test_client() as client:
            response = client.post(
                '/api/auth/login',
                json={'login': 'anna', 'password': 'kampus2026'},
                headers={'Origin': 'https://evil.example'},
            )
            self.assertEqual(response.status_code, 403)
            self.assertEqual(response.json['error'], 'forbidden_origin')

class ScheduleRangeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from app import create_app
        cls.local_app = create_app()

    @classmethod
    def tearDownClass(cls):
        cls.local_app.extensions["mongo_client"].close()

    def test_scroll_can_cross_the_old_eight_week_boundary(self):
        with self.local_app.test_client() as client:
            self.assertEqual(client.post('/api/auth/login', json={'login': 'anna', 'password': 'kampus2026'}).status_code, 200)
            before = client.get('/api/schedule?week=8')
            after = client.get('/api/schedule?week=9')
            previous = client.get('/api/schedule?week=-9')
            self.assertEqual(after.status_code, 200)
            self.assertEqual(previous.status_code, 200)
            self.assertNotEqual(before.json['weekStart'], after.json['weekStart'])
            self.assertNotEqual(previous.json['weekStart'], after.json['weekStart'])


if __name__ == '__main__':
    unittest.main()
