from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, Cycle, Notification, Signup

User = get_user_model()


@override_settings(DEBUG=True)
class RegistrationDemoTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        self.alice = User.objects.get(username="faculty_alice")
        self.alice_fall_courses = Course.objects.filter(instructor=self.alice, semester="Fall", year=2026)
        self.course = self.alice_fall_courses.get(course_number="2337")
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "faculty_alice"

    def course_notifications(self):
        return Notification.objects.filter(user=self.alice, type="registration")

    def test_alice_sees_only_her_current_sections(self):
        response = self.client.get("/api/me/courses/")

        self.assertGreaterEqual(len(response.data), 2)
        self.assertEqual(
            {course["course_id"] for course in response.data},
            set(self.alice_fall_courses.values_list("course_id", flat=True)),
        )
        self.assertIn("Computer Science II", [course["title"] for course in response.data])

    def test_selected_course_survives_a_refresh(self):
        self.client.post("/api/signups/", {"course_id": self.course.course_id}, format="json")

        me = self.client.get("/api/me/")
        registration = self.client.get("/api/registration/status/")

        self.assertEqual(me.data["registration_status"], "signed_up")
        self.assertEqual(me.data["selected_course"]["course_id"], self.course.course_id)
        self.assertEqual(registration.data["selected_course_id"], self.course.course_id)

    def test_repeated_signup_creates_one_registration_and_one_notification(self):
        for _ in range(3):
            self.client.post("/api/signups/", {"course_id": self.course.course_id}, format="json")

        self.assertEqual(Signup.objects.filter(user=self.alice).count(), 1)
        self.assertEqual(self.course_notifications().count(), 1)

    def test_repeated_course_selection_creates_one_notification(self):
        self.client.post("/api/signups/", {}, format="json")
        for _ in range(3):
            self.client.patch("/api/signups/course/", {"course_id": self.course.course_id}, format="json")

        self.assertEqual(Signup.objects.get(user=self.alice).course, self.course)
        self.assertEqual(self.course_notifications().count(), 1)

    def test_confirmation_notification_is_listed_after_a_refresh(self):
        self.client.post("/api/signups/", {"course_id": self.course.course_id}, format="json")

        response = self.client.get("/api/notifications/")

        titles = [n["title"] for n in response.data["notifications"]]
        self.assertIn("Course selection saved", titles)

    def test_faculty_cannot_use_committee_actions(self):
        signup = Signup.objects.create(user=self.alice, cycle=Cycle.objects.get(status="active"), course=self.course)
        requests = [
            ("get", "/api/committee/dashboard/", None),
            ("get", "/api/committee/faculty/", None),
            ("post", "/api/committee/faculty/remind/", {"user_ids": [self.alice.pk]}),
            ("post", f"/api/committee/signups/{signup.pk}/release-candidates/", {"observer_ids": []}),
        ]

        for method, url, data in requests:
            with self.subTest(url=url):
                response = getattr(self.client, method)(url, data, format="json")
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reset_returns_alice_to_unregistered(self):
        self.client.post("/api/signups/", {"course_id": self.course.course_id}, format="json")

        call_command("seed_demo", "--reset", stdout=StringIO())

        me = self.client.get("/api/me/")
        self.assertEqual(me.data["registration_status"], "not_signed_up")
        self.assertFalse(Notification.objects.filter(user=self.alice).exists())
