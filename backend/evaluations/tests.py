from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import override_settings

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, Cycle, Department, Signup

User = get_user_model()


@override_settings(DEBUG=True)
class EvaluationAPITests(APITestCase):
    def setUp(self):
        self.department = Department.objects.create(
            name="Computer Science",
            department_code="CS",
        )

        self.professor = User.objects.create_user(
            username="professor_a",
            password="test-password",
            first_name="Professor",
            last_name="A",
        )

        self.other_professor = User.objects.create_user(
            username="professor_b",
            password="test-password",
            first_name="Professor",
            last_name="B",
        )

        self.cycle = Cycle.objects.create(
            semester="Fall 2026",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=60),
            signup_deadline=date.today() + timedelta(days=14),
            observation_deadline=date.today() + timedelta(days=30),
            survey_deadline=date.today() + timedelta(days=45),
            status="active",
        )

        self.course = Course.objects.create(
            department=self.department,
            instructor=self.professor,
            course_number="2337",
            course_level=2000,
            section="001",
            schedule="MWF 10:00-10:50",
        )

        self.other_course = Course.objects.create(
            department=self.department,
            instructor=self.other_professor,
            course_number="2305",
            course_level=2000,
            section="001",
            schedule="TR 11:30-12:45",
        )

        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "professor_a"

    def test_professor_endpoint_returns_initial_status(self):
        response = self.client.get("/api/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["professor"]["username"], "professor_a")
        self.assertEqual(response.data["evaluation_cycle"], "Fall 2026")
        self.assertEqual(response.data["evaluation_status"], "not_signed_up")
        self.assertIsNone(response.data["selected_course"])

    def test_courses_endpoint_returns_only_own_courses(self):
        response = self.client.get("/api/me/courses/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["course_number"], "2337")

    def test_signup_succeeds_and_updates_status(self):
        response = self.client.post(
            "/api/signups/",
            {"course_id": self.course.course_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Signup.objects.count(), 1)

        status_response = self.client.get("/api/me/")

        self.assertEqual(
            status_response.data["evaluation_status"],
            "signed_up",
        )
        self.assertEqual(
            status_response.data["selected_course"]["course_id"],
            self.course.course_id,
        )

    def test_duplicate_signup_is_rejected(self):
        Signup.objects.create(
            user=self.professor,
            course=self.course,
            cycle=self.cycle,
        )

        response = self.client.post(
            "/api/signups/",
            {"course_id": self.course.course_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Signup.objects.count(), 1)

    def test_cannot_sign_up_for_another_professors_course(self):
        response = self.client.post(
            "/api/signups/",
            {"course_id": self.other_course.course_id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Signup.objects.count(), 0)

    def test_missing_demo_identity_is_rejected(self):
        self.client.defaults.pop("HTTP_X_DEMO_USERNAME", None)

        response = self.client.get("/api/me/courses/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_invalid_course_id_is_rejected(self):
        response = self.client.post(
            "/api/signups/",
            {"course_id": 99999},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Signup.objects.count(), 0)
