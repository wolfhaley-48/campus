import unittest
from app import app
from db import get_db
from demo_scenarios import apply_demo_scenarios
from services import grades_payload


class DemoScenarioTest(unittest.TestCase):
    def test_histories_and_risk_are_distinct_and_idempotent(self):
        with app.app_context():
            db=get_db()
            before=db.grades.count_documents({})
            apply_demo_scenarios(db)
            self.assertEqual(db.grades.count_documents({}), before)
            anna=db.users.find_one({'login':'anna'})
            maxim=db.users.find_one({'login':'maksim'})
            a=grades_payload(db,anna['_id']);m=grades_payload(db,maxim['_id'])
            self.assertEqual([s['number'] for s in a['semesters']],[5,4,3,2,1])
            self.assertEqual([s['number'] for s in m['semesters']],[3,2,1])
            self.assertEqual(a['summary']['debts'],0)
            self.assertGreaterEqual(m['summary']['debts'],8)
            self.assertTrue(maxim['academic_risk'])
