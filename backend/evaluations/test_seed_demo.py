from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings

from rest_framework.test import APITestCase

from .models import Course, Cycle, Signup, Template

User = get_user_model()


@override_settings(DEBUG=True)
class SeedDemoTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())

    def test_running_twice_creates_nothing_new(self):
        counts = (User.objects.count(), Course.objects.count(), Cycle.objects.count(), Template.objects.count())

        call_command("seed_demo", stdout=StringIO())

        self.assertEqual(
            (User.objects.count(), Course.objects.count(), Cycle.objects.count(), Template.objects.count()),
            counts,
        )

    def test_seeds_a_published_observation_template(self):
        template = Template.objects.get(type="observation", status="published")

        self.assertEqual(len(template.questions), 5)

    def test_keeps_a_template_the_committee_already_published(self):
        Template.objects.all().delete()
        Template.objects.create(name="Committee form", type="observation", status="published", questions=[])

        call_command("seed_demo", stdout=StringIO())

        self.assertEqual(list(Template.objects.values_list("name", flat=True)), ["Committee form"])

    def test_personas_list_the_seeded_accounts_in_order(self):
        response = self.client.get("/api/demo/personas/")

        self.assertEqual(
            [persona["name"] for persona in response.data],
            [f"Professor {letter}" for letter in "ABCDEFGH"] + ["Assessment Committee"],
        )
        self.assertEqual(response.data[0]["email"], "professora@utdallas.edu")
        self.assertEqual(response.data[-1]["role"], "admin")

    def test_an_old_named_account_is_renamed_and_keeps_its_signup(self):
        User.objects.filter(username="professor_a").update(username="faculty_alice")
        Signup.objects.create(user=User.objects.get(username="faculty_alice"), cycle=Cycle.objects.get(status="active"))

        call_command("seed_demo", stdout=StringIO())

        self.assertFalse(User.objects.filter(username="faculty_alice").exists())
        self.assertTrue(Signup.objects.filter(user__username="professor_a").exists())

    def test_demo_accounts_can_sign_in_by_email(self):
        for email, username in [
            ("professora@utdallas.edu", "professor_a"),
            ("committee@utdallas.edu", "committee_demo"),
        ]:
            with self.subTest(email=email):
                response = self.client.post(
                    "/api/auth/login/",
                    {"username": email, "password": "demo-password"},
                    format="json",
                )
                self.assertEqual(response.data["professor"]["username"], username)

    def test_each_faculty_member_has_a_different_evaluation_status(self):
        expected = {
            "professor_a": "due",
            "professor_b": "overdue",
            "professor_c": "not_due",
            "professor_d": "undetermined",
        }

        for username, status in expected.items():
            with self.subTest(username=username):
                response = self.client.get("/api/dashboard/", HTTP_X_DEMO_USERNAME=username)
                self.assertEqual(response.data["evaluation_status"], status)

    def test_committee_demo_can_open_the_committee_dashboard(self):
        response = self.client.get("/api/committee/dashboard/", HTTP_X_DEMO_USERNAME="committee_demo")

        self.assertEqual(response.status_code, 200)
