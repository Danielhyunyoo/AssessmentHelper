from datetime import timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, Cycle, MatchCandidate, Observation, Pairing, Signup, Template

User = get_user_model()


@override_settings(DEBUG=True)
class WorkflowTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        self.cycle = Cycle.objects.get(status="active")
        self.alice = User.objects.get(username="faculty_alice")
        self.bob = User.objects.get(username="faculty_bob")
        self.committee = User.objects.get(username="committee_demo")
        self.alice_course = Course.objects.get(instructor=self.alice, course_number="2337")

    def as_user(self, user):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = user.username

    def released_signup(self):
        signup = Signup.objects.create(user=self.alice, cycle=self.cycle, course=self.alice_course,
                                       matches_released_at=timezone.now())
        MatchCandidate.objects.create(signup=signup, observer=self.bob)
        return signup

    def future_dates(self, count):
        start = timezone.now() + timedelta(days=1)
        return [(start + timedelta(hours=i)).isoformat() for i in range(count)]

    def test_observer_can_sign_after_the_visit(self):
        pairing = Pairing.objects.create(cycle=self.cycle, observer=self.bob, observee=self.alice,
                                         course=self.alice_course, status="confirmed",
                                         confirmed_datetime=timezone.now() - timedelta(hours=1))
        template = Template.objects.create(name="Peer observation", type="observation", status="published",
                                           questions=[{"id": "clarity", "text": "Clarity", "type": "rating",
                                                       "required": True, "min": 1, "max": 5}])
        observation = Observation.objects.create(pairing=pairing, template=template, responses={"clarity": 4})
        self.as_user(self.bob)

        response = self.client.post(f"/api/observations/{observation.pk}/sign/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "awaiting_observee_signature")

    def test_new_signup_after_the_deadline_is_rejected(self):
        Cycle.objects.filter(pk=self.cycle.pk).update(signup_deadline=timezone.localdate() - timedelta(days=1))
        self.as_user(self.alice)

        response = self.client.post("/api/signups/", {"course_id": self.alice_course.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Signup.objects.exists())

    def test_invitation_needs_four_to_eight_dates(self):
        self.released_signup()
        self.as_user(self.alice)

        too_few = self.client.post("/api/invitations/send/",
                                   {"observer_id": self.bob.pk, "proposed_datetimes": self.future_dates(3)},
                                   format="json")
        enough = self.client.post("/api/invitations/send/",
                                  {"observer_id": self.bob.pk, "proposed_datetimes": self.future_dates(4)},
                                  format="json")

        self.assertEqual(too_few.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(enough.status_code, status.HTTP_201_CREATED)

    def test_committee_members_are_not_observer_candidates(self):
        signup = Signup.objects.create(user=self.alice, cycle=self.cycle, course=self.alice_course)
        self.as_user(self.committee)

        pool = self.client.get(f"/api/committee/signups/{signup.pk}/candidate-pool/")
        release = self.client.post(f"/api/committee/signups/{signup.pk}/release-candidates/",
                                   {"observer_ids": [self.committee.pk]}, format="json")

        self.assertNotIn(self.committee.pk, [c["id"] for c in pool.data["candidates"]])
        self.assertEqual(release.status_code, status.HTTP_400_BAD_REQUEST)
