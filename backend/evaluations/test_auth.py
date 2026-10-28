from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Course, Cycle, Department

User = get_user_model()


@override_settings(DEBUG=False)
class SessionAuthTests(APITestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)

        department = Department.objects.create(name="Computer Science", department_code="CS")
        self.alice = User.objects.create_user(
            username="alice", password="alice-pass", email="alice@utdallas.edu"
        )
        self.bob = User.objects.create_user(username="bob", password="bob-pass")
        self.committee = User.objects.create_user(
            username="committee", password="committee-pass", role="admin"
        )

        Cycle.objects.create(
            semester="Fall 2026",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=60),
            signup_deadline=date.today() + timedelta(days=14),
            observation_deadline=date.today() + timedelta(days=30),
            survey_deadline=date.today() + timedelta(days=45),
            status="active",
        )
        for instructor, number in [(self.alice, "2337"), (self.bob, "2305")]:
            Course.objects.create(
                department=department,
                instructor=instructor,
                course_number=number,
                course_level=2000,
                section="001",
                semester="Fall",
                year=2026,
                schedule="MWF 10:00-10:50",
            )

    def csrf(self):
        self.client.get("/api/auth/csrf/")
        return self.client.cookies["csrftoken"].value

    def login(self, username, password):
        return self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
            HTTP_X_CSRFTOKEN=self.csrf(),
        )

    def test_login_starts_a_session(self):
        response = self.login("alice", "alice-pass")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["professor"]["username"], "alice")
        self.assertEqual(self.client.get("/api/me/").data["professor"]["username"], "alice")

    def test_login_reports_the_role(self):
        response = self.login("committee", "committee-pass")

        self.assertEqual(response.data["professor"]["role"], "admin")

    def test_login_accepts_email(self):
        response = self.login("Alice@UTDallas.edu", "alice-pass")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["professor"]["username"], "alice")

    def test_shared_email_is_rejected(self):
        self.bob.email = "alice@utdallas.edu"
        self.bob.save()

        response = self.login("alice@utdallas.edu", "alice-pass")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_password_is_rejected(self):
        response = self.login("alice", "wrong")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(self.client.get("/api/auth/session/").data["professor"])

    def test_login_without_csrf_token_is_rejected(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "alice-pass"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def login_from(self, origin):
        return self.client.post(
            "/api/auth/login/",
            {"username": "alice", "password": "alice-pass"},
            format="json",
            HTTP_X_CSRFTOKEN=self.csrf(),
            HTTP_ORIGIN=origin,
        )

    def test_login_from_the_vite_dev_server_passes_the_origin_check(self):
        self.assertEqual(self.login_from("http://localhost:5173").status_code, status.HTTP_200_OK)

    def test_login_from_an_unknown_origin_is_rejected(self):
        self.assertEqual(self.login_from("http://evil.example").status_code, status.HTTP_403_FORBIDDEN)

    def test_logout_ends_the_session(self):
        self.login("alice", "alice-pass")

        response = self.client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=self.csrf())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/me/").status_code, status.HTTP_403_FORBIDDEN)

    def test_session_endpoint_returns_the_signed_in_user(self):
        self.login("bob", "bob-pass")

        response = self.client.get("/api/auth/session/")

        self.assertEqual(response.data["professor"]["username"], "bob")

    def test_session_endpoint_without_login_returns_null(self):
        response = self.client.get("/api/auth/session/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["professor"])

    def test_demo_header_is_ignored_when_debug_is_off(self):
        response = self.client.get("/api/me/", HTTP_X_DEMO_USERNAME="alice")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(DEBUG=True, ASSESSMENT_HELPER_DEMO_AUTH=False)
    def test_demo_header_can_be_turned_off_in_debug(self):
        response = self.client.get("/api/me/", HTTP_X_DEMO_USERNAME="alice")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(DEBUG=True)
    def test_demo_header_works_in_debug_by_default(self):
        response = self.client.get("/api/me/", HTTP_X_DEMO_USERNAME="alice")

        self.assertEqual(response.data["professor"]["username"], "alice")

    def test_each_account_sees_only_its_own_courses(self):
        for username, number in [("alice", "2337"), ("bob", "2305")]:
            self.login(username, f"{username}-pass")

            numbers = [c["course_number"] for c in self.client.get("/api/me/courses/").data]

            self.assertEqual(numbers, [number])
