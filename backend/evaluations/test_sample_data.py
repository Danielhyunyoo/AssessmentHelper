import tempfile
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings

from rest_framework.test import APITestCase

from .evaluation_status import evaluation_status_for
from .models import Course, Cycle, Observation, Pairing, Signup, Survey

User = get_user_model()


@override_settings(DEBUG=True, MEDIA_ROOT=tempfile.mkdtemp())
class SampleDataTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        call_command("seed_sample_data", stdout=StringIO())

    def statuses(self):
        cycle = Cycle.objects.get(status="active")
        return {user.last_name: evaluation_status_for(user, cycle)["status"] for user in User.objects.filter(role="faculty")}

    def test_past_records_keep_each_persona_status(self):
        self.assertEqual(
            {name: self.statuses()[name] for name in "ABCD"},
            {"A": "due", "B": "overdue", "C": "not_due", "D": "undetermined"},
        )

    def test_running_twice_creates_nothing_new(self):
        counts = (Pairing.objects.count(), Observation.objects.count(), Survey.objects.count())

        call_command("seed_sample_data", stdout=StringIO())

        self.assertEqual((Pairing.objects.count(), Observation.objects.count(), Survey.objects.count()), counts)

    def test_professor_a_sees_a_signed_past_record(self):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "professor_a"

        records = self.client.get("/api/observations/").data

        self.assertTrue(records)
        self.assertTrue(all(record["status"] == "completed" for record in records))

    def test_the_demo_cast_starts_the_active_cycle_without_activity(self):
        cast = User.objects.exclude(username__startswith="bg_")

        self.assertFalse(Pairing.objects.filter(cycle__status="active", observee__in=cast).exists())

    def test_every_persona_has_a_profile_picture(self):
        cast = User.objects.exclude(username__startswith="bg_")

        self.assertFalse(cast.filter(profile_photo="").exists() or cast.filter(profile_photo__isnull=True).exists())

    def test_adds_one_hundred_background_professors_outside_computer_science(self):
        background = User.objects.filter(username__startswith="bg_")

        self.assertEqual(background.count(), 100)
        self.assertFalse(background.filter(department__department_code="CS").exists())

    def test_demo_tools_list_only_the_named_personas(self):
        self.assertEqual(len(self.client.get("/api/demo/personas/").data), 9)

    def test_background_professors_stay_out_of_professor_a_candidate_pool(self):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "professor_a"
        course = Course.objects.get(instructor__username="professor_a", course_number="2337")
        signup = self.client.post("/api/signups/", {"course_id": course.course_id}, format="json").data
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "committee_demo"

        pool = self.client.get(f"/api/committee/signups/{signup['signup_id']}/candidate-pool/").data

        background_ids = set(User.objects.filter(username__startswith="bg_").values_list("pk", flat=True))
        self.assertFalse({c["id"] for c in pool["candidates"]} & background_ids)

    def test_reset_regenerates_the_same_activity(self):
        before = self.client_kpis()

        call_command("seed_sample_data", "--reset", stdout=StringIO())

        self.assertEqual(self.client_kpis(), before)

    def test_background_activity_covers_each_kpi_case(self):
        counts = self.client_kpis()

        self.assertGreater(counts["unmatched"], 0)
        self.assertGreater(counts["outstanding_records"], 0)
        self.assertTrue(Signup.objects.filter(cycle__status="active", user__username__startswith="bg_").exists())

    def client_kpis(self):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "committee_demo"
        return self.client.get("/api/committee/kpis/").data["counts"]
