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

    def test_protocol_fragments_in_answer_are_rejected(self):
        # Observed in production: valid outer JSON, broken protocol inside answer.
        answers = [
            "Начни подготовку.','actionIds':['grades'],'tasks':[]}}{",
            'Начни подготовку.","actionIds":["grades"],"tasks":[]}',
            'План: {"tasks":[{"title":"Подготовиться","duration":45}]}',
        ]
        env = {'ASSISTANT_PROVIDER': 'pollinations'}
        for answer in answers:
            data = {'answer': answer, 'actionIds': [], 'tasks': []}
            with self.subTest(answer=answer), patch.dict('os.environ', env, clear=False), \
                    patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(data).encode())):
                with self.assertRaisesRegex(RuntimeError, 'недоступен'):
                    ask_assistant('Помоги подготовиться', {})

    def test_auto_falls_back_when_answer_contains_broken_protocol(self):
        broken = {'answer': "Проверь оценки.','actionIds':['grades'],'tasks':[]}}{"}
        fallback = {'answer': 'Проверь оценки.', 'actionIds': ['grades']}
        env = {
            'ASSISTANT_PROVIDER': 'auto', 'DEEPSEEK_API_KEY': '',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODELS': 'nvidia/nemotron-3-ultra-550b-a55b:free',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', side_effect=[
                    io.BytesIO(json.dumps(broken).encode()),
                    io.BytesIO(json.dumps(fallback).encode()),
                ]) as call:
            result = ask_assistant('Помоги подготовиться', {})
        self.assertEqual(call.call_count, 2)
        self.assertEqual(result['provider'], 'Pollinations')
        self.assertEqual(result['answer'], 'Проверь оценки.')

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

    def test_openrouter_uses_free_model_headers_and_json_mode(self):
        content = '{"answer":"Проверь расписание.","actionIds":["schedule"]}'
        raw = {'choices': [{'message': {'content': content}}]}
        env = {
            'ASSISTANT_PROVIDER': 'openrouter',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODEL': 'nvidia/nemotron-3-ultra-550b-a55b:free',
            'OPENROUTER_BASE_URL': 'https://openrouter.test/api/v1',
            'OPENROUTER_SITE_URL': 'https://campus.test',
            'OPENROUTER_APP_NAME': 'Campus test',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(raw).encode())) as call:
            result = ask_assistant('Что в расписании?', {'today': []})
        request = call.call_args.args[0]
        self.assertEqual(request.full_url, 'https://openrouter.test/api/v1/chat/completions')
        self.assertEqual(request.get_header('Authorization'), 'Bearer test-openrouter-key')
        self.assertEqual(request.get_header('Http-referer'), 'https://campus.test')
        self.assertEqual(request.get_header('X-title'), 'Campus test')
        payload = json.loads(request.data)
        self.assertEqual(payload['model'], 'nvidia/nemotron-3-ultra-550b-a55b:free')
        self.assertEqual(payload['response_format'], {'type': 'json_object'})
        self.assertEqual(payload['max_tokens'], 4096)
        self.assertEqual(payload['reasoning'], {'effort': 'low'})
        self.assertEqual(result['provider'], 'OpenRouter')
        self.assertEqual(result['model'], 'nvidia/nemotron-3-ultra-550b-a55b:free')
        self.assertEqual(result['actions'], [{'label': 'Проверить расписание', 'href': '/schedule'}])

    def test_auto_prefers_openrouter_when_deepseek_key_is_absent(self):
        raw = {'answer': 'Открой план.', 'actionIds': ['time']}
        env = {
            'ASSISTANT_PROVIDER': 'auto',
            'DEEPSEEK_API_KEY': '',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODEL': 'nvidia/nemotron-3-ultra-550b-a55b:free',
            'OPENROUTER_BASE_URL': 'https://openrouter.test/api/v1',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', return_value=io.BytesIO(json.dumps(raw).encode())) as call:
            result = ask_assistant('Найди время', {})
        self.assertEqual(result['provider'], 'OpenRouter')
        self.assertEqual(result['model'], 'nvidia/nemotron-3-ultra-550b-a55b:free')
        self.assertEqual(call.call_args.args[0].full_url, 'https://openrouter.test/api/v1/chat/completions')

    def test_openrouter_tries_models_in_configured_order(self):
        first = 'baidu/ernie-5.5-flash-preview:free'
        second = 'nvidia/nemotron-3.5-lightning:free'
        raw = {'answer': 'Ответ второй модели.', 'actionIds': []}
        env = {
            'ASSISTANT_PROVIDER': 'openrouter',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODELS': f'{first},{second}',
            'OPENROUTER_BASE_URL': 'https://openrouter.test/api/v1',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', side_effect=[
                    OSError('rate limited'), io.BytesIO(json.dumps(raw).encode())
                ]) as call:
            result = ask_assistant('hello', {})
        models = [json.loads(item.args[0].data)['model'] for item in call.call_args_list]
        self.assertEqual(models, [first, second])
        self.assertEqual(result['provider'], 'OpenRouter')
        self.assertEqual(result['model'], second)

    def test_openrouter_chain_skips_invalid_answer(self):
        first = 'baidu/ernie-5.5-flash-preview:free'
        second = 'nvidia/nemotron-3.5-lightning:free'
        broken = {'answer': "Ответ.','actionIds':['grades']}", 'actionIds': []}
        valid = {'answer': 'Ответ второй модели.', 'actionIds': ['grades']}
        env = {
            'ASSISTANT_PROVIDER': 'openrouter',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODELS': f'{first},{second}',
            'OPENROUTER_BASE_URL': 'https://openrouter.test/api/v1',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', side_effect=[
                    io.BytesIO(json.dumps(broken).encode()),
                    io.BytesIO(json.dumps(valid).encode()),
                ]) as call:
            result = ask_assistant('hello', {})
        models = [json.loads(item.args[0].data)['model'] for item in call.call_args_list]
        self.assertEqual(models, [first, second])
        self.assertEqual(result['provider'], 'OpenRouter')
        self.assertEqual(result['model'], second)
        self.assertEqual(result['answer'], 'Ответ второй модели.')

    def test_auto_falls_back_to_pollinations_after_openrouter_chain_fails(self):
        fallback = {'answer': 'Резервный ответ.', 'actionIds': []}
        env = {
            'ASSISTANT_PROVIDER': 'auto',
            'DEEPSEEK_API_KEY': '',
            'OPENROUTER_API_KEY': 'test-openrouter-key',
            'OPENROUTER_MODELS': 'baidu/ernie-5.5-flash-preview:free,nvidia/nemotron-3.5-lightning:free',
            'OPENROUTER_BASE_URL': 'https://openrouter.test/api/v1',
        }
        with patch.dict('os.environ', env, clear=False), \
                patch('assistant.urlopen', side_effect=[
                    OSError('upstream down'), OSError('upstream down'),
                    io.BytesIO(json.dumps(fallback).encode())
                ]) as call:
            result = ask_assistant('hello', {})
        self.assertEqual(result['provider'], 'Pollinations')
        self.assertEqual(result['answer'], 'Резервный ответ.')
        self.assertEqual(call.call_count, 3)

    def test_openrouter_without_key_fails_with_clear_message(self):
        env = {'ASSISTANT_PROVIDER': 'openrouter', 'OPENROUTER_API_KEY': ''}
        with patch.dict('os.environ', env, clear=False):
            with self.assertRaisesRegex(RuntimeError, 'OpenRouter не настроен'):
                ask_assistant('hello', {})

    def test_openrouter_base_url_must_be_https(self):
        env = {
            'ASSISTANT_PROVIDER': 'openrouter',
            'OPENROUTER_API_KEY': 'test-key',
            'OPENROUTER_BASE_URL': 'http://openrouter.test/api/v1',
        }
        with patch.dict('os.environ', env, clear=False):
            with self.assertRaisesRegex(RuntimeError, 'https://'):
                ask_assistant('hello', {})

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
