import io
import json
import unittest
from unittest.mock import patch
from assistant import ask_assistant


class AssistantTest(unittest.TestCase):
    def test_actions_are_allowlisted_without_credentials(self):
        data={'answer':'Открой план.', 'actionIds':['time','https://evil.test','time']}
        with patch('assistant.urlopen',return_value=io.BytesIO(json.dumps(data).encode())) as call:
            result=ask_assistant('Найди время',{'source':'only-current-user'})
            self.assertEqual(result['actions'],[{'label':'Выбрать время и сохранить задачу','href':'/plan'}])
            request=call.call_args.args[0]
            self.assertEqual(request.full_url,'https://text.pollinations.ai/')
            self.assertIsNone(request.get_header('Authorization'))
            self.assertIn('only-current-user',request.data.decode())

    def test_malformed_json_is_recoverable(self):
        for value in [[],None,'text',{}]:
            with self.subTest(value=value),patch('assistant.urlopen',return_value=io.BytesIO(json.dumps(value).encode())):
                with self.assertRaisesRegex(RuntimeError,'недоступен'):
                    ask_assistant('hello',{})

    def test_task_intents_are_validated(self):
        data={'answer':'План.', 'actionIds':[], 'tasks':[{'title':'Презентация','duration':45},{'title':'bad','duration':True}]}
        with patch('assistant.urlopen',return_value=io.BytesIO(json.dumps(data).encode())):
            result=ask_assistant('Подготовиться',{})
        self.assertEqual(len(result['tasks']),1)
        self.assertIn('duration=45',result['tasks'][0]['href'])
