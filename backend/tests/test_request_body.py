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


if __name__ == '__main__':
    unittest.main()
