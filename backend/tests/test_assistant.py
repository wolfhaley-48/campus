import io
import json
import unittest
from unittest.mock import patch

from assistant import ask_assistant


class AssistantTest(unittest.TestCase):
    def test_actions_are_allowlisted_without_credentials(self):
        data = {'answer': 'Открой план.', 'actionIds': ['time', 'https://evil.test', 'time']}
        env = {'ASSISTANT_PROVIDER': 'pollinations'}
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(data).encode())) as call:
            result = ask_assistant('Найди время', {'source': 'only-current-user'})
            self.assertEqual(result['actions'], [{'label': 'Выбрать время и сохранить задачу', 'href': '/plan'}])
            self.assertEqual(result['provider'], 'Pollinations')
            request = call.call_args.args[0]
            self.assertEqual(request.full_url, 'https://text.pollinations.ai/')
            self.assertIsNone(request.get_header('Authorization'))
            self.assertIn('only-current-user', request.data.decode())

    def test_malformed_json_is_recoverable(self):
        env = {'ASSISTANT_PROVIDER': 'pollinations'}
        for value in [[], None, 'text', {}]:
            with self.subTest(value=value), patch.dict('os.environ', env, clear=False), \
                    patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(value).encode())):
                with self.assertRaisesRegex(RuntimeError, 'недоступен'):
                    ask_assistant('hello', {})

    def test_task_intents_are_validated(self):
        data = {'answer': 'План.', 'actionIds': [], 'tasks': [
            {'title': 'Презентация', 'duration': 45}, {'title': 'bad', 'duration': True}]}
        env = {'ASSISTANT_PROVIDER': 'pollinations'}
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(data).encode())):
            result = ask_assistant('Подготовиться', {})
        self.assertEqual(len(result['tasks']), 1)
        self.assertIn('duration=45', result['tasks'][0]['href'])

    def test_deepseek_uses_json_mode_and_parses_fenced_answer(self):
        content = '```json\n{"answer":"Смотри расписание.","actionIds":["schedule"]}\n```'
        raw = {'choices': [{'message': {'content': content}}]}
        env = {
            'ASSISTANT_PROVIDER': 'deepseek',
            'DEEPSEEK_API_KEY': 'test-key',
            'DEEPSEEK_MODEL': 'deepseek-chat',
            'DEEPSEEK_BASE_URL': 'https://api.deepseek.test/v1',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(raw).encode())) as call:
            result = ask_assistant('Что в расписании?', {'today': []})
        request = call.call_args.args[0]
        self.assertEqual(request.full_url, 'https://api.deepseek.test/v1/chat/completions')
        self.assertEqual(request.get_header('Authorization'), 'Bearer test-key')
        payload = json.loads(request.data)
        self.assertEqual(payload['response_format'], {'type': 'json_object'})
        self.assertEqual(payload['model'], 'deepseek-chat')
        self.assertEqual(result['provider'], 'DeepSeek')
        self.assertEqual(result['answer'], 'Смотри расписание.')
        self.assertEqual(result['actions'], [{'label': 'Проверить расписание', 'href': '/schedule'}])

    def test_deepseek_without_key_fails_with_clear_message(self):
        env = {'ASSISTANT_PROVIDER': 'deepseek', 'DEEPSEEK_API_KEY': ''}
        with patch.dict('os.environ', env, clear=False):
            with self.assertRaisesRegex(RuntimeError, 'DeepSeek не настроен'):
                ask_assistant('hello', {})

    def test_deepseek_base_url_must_be_https(self):
        env = {
            'ASSISTANT_PROVIDER': 'deepseek',
            'DEEPSEEK_API_KEY': 'test-key',
            'DEEPSEEK_BASE_URL': 'http://api.deepseek.test',
        }
        with patch.dict('os.environ', env, clear=False):
            with self.assertRaisesRegex(RuntimeError, 'https://'):
                ask_assistant('hello', {})

    def test_unknown_provider_is_rejected(self):
        with patch.dict('os.environ', {'ASSISTANT_PROVIDER': 'other'}, clear=False):
            with self.assertRaisesRegex(RuntimeError, 'провайдера'):
                ask_assistant('hello', {})
