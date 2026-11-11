from datetime import timedelta
from io import StringIO
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Cycle, Observation, Pairing, Survey, Template
from django.contrib.auth import get_user_model


User = get_user_model()

SURVEYS_URL = "/api/surveys/"
SURVEY_TEMPLATE_URL = "/api/surveys/template/"
COMMITTEE_SURVEY_URL = "/api/committee/surveys/{survey_id}/"


@override_settings(DEBUG=True)
class ProcessSurveyTests(APITestCase):
    """
    API tests for the observer/observee process-survey workflow.

    These tests use the project's seeded demo accounts and its DEBUG-only
    X-Demo-Username authentication mechanism, matching test_demo_flow.py.
    """

    def setUp(self):
        call_command("seed_demo", stdout=StringIO())

        self.cycle = Cycle.objects.get(status="active")
        today = timezone.localdate()

        # Make surveys available today while keeping the cycle's date sequence valid.
        self.cycle.signup_deadline = today - timedelta(days=10)
        self.cycle.observation_deadline = today - timedelta(days=1)
        self.cycle.survey_deadline = today + timedelta(days=10)
        self.cycle.save(update_fields=[
            "signup_deadline",
            "observation_deadline",
            "survey_deadline",
        ])

        self.observer = User.objects.get(username="professor_b")
        self.observee = User.objects.get(username="professor_a")
        self.other_faculty = User.objects.get(username="professor_c")
        self.committee = User.objects.get(username="committee_demo")

        self.course = self.observee.courses_taught.first()
        if self.course is None:
            # The demo seed normally supplies this course; fail clearly if it does not.
            self.fail("seed_demo did not create a course for professor_a.")

        self.pairing = Pairing.objects.create(
            cycle=self.cycle,
            observer=self.observer,
            observee=self.observee,
            course=self.course,
            status="confirmed",
            confirmed_datetime=timezone.now() - timedelta(days=2),
        )

        self.observation_template = Template.objects.create(
            name="Survey test observation form",
            type="observation",
            status="published",
            questions=[],
        )
        Observation.objects.create(
            pairing=self.pairing,
            template=self.observation_template,
            responses={},
            observer_signed=True,
            observee_signed=True,
            status="completed",
        )

        self.survey_template = Template.objects.create(
            name="Process survey test form",
            type="survey",
            status="published",
            questions=[
                {
                    "id": "scheduling",
                    "text": "Was scheduling convenient?",
                    "type": "rating",
                    "required": True,
                    "min": 1,
                    "max": 5,
                },
                {
                    "id": "suggestions",
                    "text": "What could be improved?",
                    "type": "text",
                    "required": True,
                },
            ],
        )

    def act_as(self, username):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = username

    def valid_responses(self):
        return {
            "scheduling": 4,
            "suggestions": "More scheduling options would help.",
        }

    def create_survey(self, username, *, submit=False):
        self.act_as(username)
        return self.client.post(
            SURVEYS_URL,
            {
                "pairing_id": self.pairing.pk,
                "template_id": self.survey_template.pk,
                "responses": self.valid_responses(),
                "submit": submit,
            },
            format="json",
        )

    def test_observer_can_get_survey_template_after_observation_deadline(self):
        self.act_as(self.observer.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["respondent_type"], "observer")
        self.assertEqual(response.data["template"]["template_id"], self.survey_template.pk)

    def test_observee_can_get_survey_template_after_observation_deadline(self):
        self.act_as(self.observee.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["respondent_type"], "observee")
        self.assertEqual(response.data["template"]["template_id"], self.survey_template.pk)

    def test_observer_can_submit_process_survey(self):
        response = self.create_survey(self.observer.username, submit=True)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["respondent_type"], "observer")
        self.assertIsNotNone(response.data["submitted_at"])
        self.assertTrue(
            Survey.objects.filter(
                pairing=self.pairing,
                respondent=self.observer,
                respondent_type="observer",
            ).exists()
        )

    def test_observee_can_submit_process_survey(self):
        response = self.create_survey(self.observee.username, submit=True)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["respondent_type"], "observee")
        self.assertIsNotNone(response.data["submitted_at"])

    def test_observer_can_save_draft_then_submit_it(self):
        draft = self.create_survey(self.observer.username, submit=False)

        self.assertEqual(draft.status_code, status.HTTP_201_CREATED, draft.data)
        self.assertIsNone(draft.data["submitted_at"])

        self.act_as(self.observer.username)
        submitted = self.client.patch(
            f"{SURVEYS_URL}{draft.data['survey_id']}/",
            {
                "responses": self.valid_responses(),
                "submit": True,
            },
            format="json",
        )

        self.assertEqual(submitted.status_code, status.HTTP_200_OK, submitted.data)
        self.assertIsNotNone(submitted.data["submitted_at"])

    def test_nonparticipant_cannot_open_pairing_survey_template(self):
        self.act_as(self.other_faculty.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_nonparticipant_cannot_create_survey_for_pairing(self):
        response = self.create_survey(self.other_faculty.username, submit=True)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Survey.objects.filter(pairing=self.pairing).exists())

    def test_observer_cannot_upload_observee_supporting_file(self):
        draft = self.create_survey(self.observer.username, submit=False)
        self.assertEqual(draft.status_code, status.HTTP_201_CREATED, draft.data)

        self.act_as(self.observer.username)
        uploaded = SimpleUploadedFile(
            "supporting-note.pdf",
            b"%PDF-1.4 test content",
            content_type="application/pdf",
        )
        response = self.client.post(
            f"{SURVEYS_URL}{draft.data['survey_id']}/file/",
            {"survey_file": uploaded},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Survey.objects.get(pk=draft.data["survey_id"]).survey_file)

    def test_observee_can_upload_supporting_file_to_draft(self):
        # Use an isolated temporary media directory so this test does not leave
        # uploaded files in the developer's project media folder.
        with TemporaryDirectory() as media_dir:
            with override_settings(MEDIA_ROOT=media_dir):
                draft = self.create_survey(self.observee.username, submit=False)
                self.assertEqual(draft.status_code, status.HTTP_201_CREATED, draft.data)

                self.act_as(self.observee.username)
                uploaded = SimpleUploadedFile(
                    "supporting-note.pdf",
                    b"%PDF-1.4 test content",
                    content_type="application/pdf",
                )
                response = self.client.post(
                    f"{SURVEYS_URL}{draft.data['survey_id']}/file/",
                    {"survey_file": uploaded},
                    format="multipart",
                )

                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
                self.assertTrue(response.data["survey_file"])
                self.assertTrue(
                    Survey.objects.get(pk=draft.data["survey_id"]).survey_file
                )

    def test_submitted_survey_is_immutable(self):
        submitted = self.create_survey(self.observee.username, submit=True)
        self.assertEqual(submitted.status_code, status.HTTP_201_CREATED, submitted.data)

        self.act_as(self.observee.username)
        response = self.client.patch(
            f"{SURVEYS_URL}{submitted.data['survey_id']}/",
            {
                "responses": {
                    "scheduling": 2,
                    "suggestions": "Changed after submission.",
                },
                "submit": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_survey_is_unavailable_on_observation_deadline(self):
        self.cycle.observation_deadline = timezone.localdate()
        self.cycle.save(update_fields=["observation_deadline"])
        self.act_as(self.observer.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_survey_is_unavailable_after_survey_deadline(self):
        self.cycle.survey_deadline = timezone.localdate() - timedelta(days=1)
        self.cycle.save(update_fields=["survey_deadline"])
        self.act_as(self.observer.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_survey_requires_completed_fully_signed_observation(self):
        Observation.objects.filter(pairing=self.pairing).update(
            observee_signed=False,
            status="awaiting_observee_signature",
        )
        self.act_as(self.observer.username)

        response = self.client.get(
            SURVEY_TEMPLATE_URL,
            {"pairing_id": self.pairing.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_committee_can_view_submitted_survey(self):
        submitted = self.create_survey(self.observee.username, submit=True)
        self.assertEqual(submitted.status_code, status.HTTP_201_CREATED, submitted.data)

        self.act_as(self.committee.username)
        response = self.client.get(
            COMMITTEE_SURVEY_URL.format(survey_id=submitted.data["survey_id"])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["survey_id"], submitted.data["survey_id"])

    def test_faculty_cannot_view_committee_survey_detail(self):
        submitted = self.create_survey(self.observee.username, submit=True)
        self.assertEqual(submitted.status_code, status.HTTP_201_CREATED, submitted.data)

        self.act_as(self.observer.username)
        response = self.client.get(
            COMMITTEE_SURVEY_URL.format(survey_id=submitted.data["survey_id"])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
