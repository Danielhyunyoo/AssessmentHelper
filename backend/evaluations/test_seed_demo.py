from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings

from rest_framework.test import APITestCase

from .models import Course, Cycle

User = get_user_model()


@override_settings(DEBUG=True)
class SeedDemoTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())

    def test_running_twice_creates_nothing_new(self):
        counts = (User.objects.count(), Course.objects.count(), Cycle.objects.count())

        call_command("seed_demo", stdout=StringIO())

        self.assertEqual(
            (User.objects.count(), Course.objects.count(), Cycle.objects.count()),
            counts,
        )

    def test_each_faculty_member_has_a_different_evaluation_status(self):
        expected = {
            "faculty_alice": "due",
            "faculty_bob": "overdue",
            "faculty_carol": "not_due",
            "faculty_dave": "undetermined",
        }

        for username, status in expected.items():
            with self.subTest(username=username):
                response = self.client.get("/api/dashboard/", HTTP_X_DEMO_USERNAME=username)
                self.assertEqual(response.data["evaluation_status"], status)

    def test_committee_demo_can_open_the_committee_dashboard(self):
        response = self.client.get("/api/committee/dashboard/", HTTP_X_DEMO_USERNAME="committee_demo")

        self.assertEqual(response.status_code, 200)
