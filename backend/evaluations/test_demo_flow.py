from datetime import datetime, time, timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, Cycle, Invitation, Notification, Signup

User = get_user_model()

AVAILABILITY = "/api/signups/availability/"
CYCLE_DATES = "/api/committee/cycle-dates/"


@override_settings(DEBUG=True)
class DemoFlowTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        self.cycle = Cycle.objects.get(status="active")

        self.cycle.signup_deadline = timezone.localdate() + timedelta(days=7)
        self.cycle.observation_deadline = timezone.localdate() + timedelta(days=30)
        self.cycle.survey_deadline = timezone.localdate() + timedelta(days=40)

        self.cycle.save(update_fields=[
            "signup_deadline",
            "observation_deadline",
            "survey_deadline",
        ])
        self.professor_a = User.objects.get(username="professor_a")
        self.professor_b = User.objects.get(username="professor_b")
        self.course = Course.objects.get(instructor=self.professor_a, course_number="2337", year=2026)
        self.act_as("professor_a")
        self.client.post("/api/signups/", {"course_id": self.course.course_id}, format="json")

    def act_as(self, username):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = username

    def future_datetimes(self, count, start=1):
        today = timezone.localdate()
        return [
            timezone.make_aware(datetime.combine(today + timedelta(days=start + i), time(10))).isoformat()
            for i in range(count)
        ]

    def save_availability(self, values):
        return self.client.patch(AVAILABILITY, {"available_datetimes": values}, format="json")

    def test_saved_availability_survives_a_refresh(self):
        values = self.future_datetimes(4)

        self.save_availability(values)

        self.assertEqual(len(self.client.get(AVAILABILITY).data["available_datetimes"]), 4)

    def test_availability_accepts_four_to_eight_or_none(self):
        for count in (0, 4, 8):
            with self.subTest(count=count):
                self.assertEqual(self.save_availability(self.future_datetimes(count)).status_code, status.HTTP_200_OK)

    def test_availability_rejects_fewer_than_four_or_more_than_eight(self):
        for count in (1, 3, 9):
            with self.subTest(count=count):
                self.assertEqual(self.save_availability(self.future_datetimes(count)).status_code, status.HTTP_400_BAD_REQUEST)

    def test_availability_rejects_duplicates(self):
        values = self.future_datetimes(3)

        response = self.save_availability(values + values[:1])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_availability_rejects_past_and_late_dates(self):
        for start in (-5, 28):
            with self.subTest(start=start):
                self.assertEqual(self.save_availability(self.future_datetimes(4, start=start)).status_code, status.HTTP_400_BAD_REQUEST)

    def test_availability_requires_a_selected_course(self):
        Signup.objects.filter(user=self.professor_a).update(course=None)

        response = self.save_availability(self.future_datetimes(4))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_committee_can_change_cycle_dates(self):
        self.act_as("committee_demo")

        response = self.client.patch(CYCLE_DATES, {"signup_deadline": "2026-11-01"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.cycle.refresh_from_db()
        self.assertEqual(self.cycle.signup_deadline.isoformat(), "2026-11-01")

    def test_cycle_end_cannot_be_before_start(self):
        self.act_as("committee_demo")

        response = self.client.patch(CYCLE_DATES, {"end_date": "2000-01-01"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_faculty_cannot_change_cycle_dates(self):
        response = self.client.patch(CYCLE_DATES, {"signup_deadline": "2026-11-01"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_releasing_the_same_list_twice_sends_one_notification(self):
        signup = Signup.objects.get(user=self.professor_a)
        self.act_as("committee_demo")

        for _ in range(2):
            self.client.post(f"/api/committee/signups/{signup.pk}/release-candidates/", {"observer_ids": [self.professor_b.pk]}, format="json")

        self.assertEqual(Notification.objects.filter(user=self.professor_a, title="Observer candidates available").count(), 1)

    def test_saved_dates_released_list_and_invitation(self):
        values = self.future_datetimes(4)
        self.save_availability(values)
        signup = Signup.objects.get(user=self.professor_a)

        self.act_as("committee_demo")
        released = self.client.post(
            f"/api/committee/signups/{signup.pk}/release-candidates/", {"observer_ids": [self.professor_b.pk]}, format="json",
        )
        self.act_as("professor_a")
        sent = self.client.post("/api/invitations/send/", {"observer_id": self.professor_b.pk, "proposed_datetimes": values}, format="json")

        self.assertEqual(released.status_code, status.HTTP_200_OK, released.data)
        self.assertEqual(sent.status_code, status.HTTP_201_CREATED, sent.data)
        self.assertEqual(Invitation.objects.get(sender=self.professor_a).proposed_dates.count(), 4)


@override_settings(DEBUG=True)
class DemoDateTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        self.addCleanup(self.client.put, "/api/demo/date/", {"date": None}, format="json")

    def test_simulated_date_closes_registration(self):
        self.client.put("/api/demo/date/", {"date": "2026-12-01"}, format="json")
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "professor_a"

        response = self.client.post("/api/signups/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clearing_the_simulated_date_returns_to_today(self):
        self.client.put("/api/demo/date/", {"date": "2026-12-01"}, format="json")

        response = self.client.put("/api/demo/date/", {"date": None}, format="json")

        self.assertIsNone(response.data["simulated_date"])
        self.assertEqual(response.data["today"], timezone.localdate())

    def test_reset_clears_registrations_and_the_simulated_date(self):
        self.client.put("/api/demo/date/", {"date": "2026-12-01"}, format="json")
        professor_a = User.objects.get(username="professor_a")
        Signup.objects.create(user=professor_a, cycle=Cycle.objects.get(status="active"))

        self.client.post("/api/demo/reset/")

        self.assertFalse(Signup.objects.filter(user=professor_a).exists())
        self.assertIsNone(self.client.get("/api/demo/date/").data["simulated_date"])

    def test_reset_rebuilds_an_empty_database(self):
        call_command("seed_demo", "--reset", stdout=StringIO())
        Course.objects.all().delete()
        Cycle.objects.all().delete()
        User.objects.all().delete()
        self.assertFalse(self.client.get("/api/demo/personas/").data)

        response = self.client.post("/api/demo/reset/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self.client.get("/api/demo/personas/").data), 9)
        self.assertTrue(Cycle.objects.filter(status="active").exists())

    def test_reset_works_with_a_stale_session_cookie(self):
        self.client.cookies["sessionid"] = "no-such-session"

        response = self.client.post("/api/demo/reset/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @override_settings(DEBUG=False)
    def test_demo_date_is_hidden_outside_demo_mode(self):
        self.assertEqual(self.client.get("/api/demo/date/").status_code, status.HTTP_404_NOT_FOUND)