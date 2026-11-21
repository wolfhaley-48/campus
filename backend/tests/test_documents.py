import unittest
from pathlib import Path

from app import app


class DocumentTest(unittest.TestCase):
    def test_document_requires_ready_request_and_owner(self):
        with app.test_client() as client:
            client.post('/api/auth/login', json={'login': 'anna', 'password': 'kampus2026'})
            requests = client.get('/api/requests').json['requests']
            ready = next(r for r in requests if r['status'] == 'ready' and r['delivery'] == 'electronic')
            path = f"/api/requests/{ready['id']}/document"
            response = client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, 'application/pdf')
            self.assertTrue(response.data.startswith(b'%PDF-'))
            Path('/tmp/campus-document.pdf').write_bytes(response.data)
            pending = next(r for r in requests if r['status'] != 'ready')
            self.assertEqual(client.get(f"/api/requests/{pending['id']}/document").status_code, 404)
            client.post('/api/auth/login', json={'login': 'maksim', 'password': 'kampus2026'})
            self.assertEqual(client.get(path).status_code, 404)
            client.post('/api/auth/logout')
            self.assertEqual(client.get(path).status_code, 401)
