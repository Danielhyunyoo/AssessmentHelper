from datetime import date, timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from . import clock
from .models import Course, Cycle, Invitation, MatchCandidate, Notification, Pairing, Signup

User = get_user_model()


@override_settings(DEBUG=True)
class InvitationTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        clock.set_simulated_date(date(2026, 9, 1))
        self.addCleanup(clock.set_simulated_date, None)
        self.cycle = Cycle.objects.get(status="active")
        self.professor_a, self.professor_b, self.professor_c, self.professor_d = (
            User.objects.get(username=f"professor_{letter}") for letter in "abcd"
        )
        course = Course.objects.get(instructor=self.professor_a, course_number="2337")
        signup = Signup.objects.create(user=self.professor_a, cycle=self.cycle, course=course,
                                       matches_released_at=clock.now())
        for observer in (self.professor_b, self.professor_c, self.professor_d):
            MatchCandidate.objects.create(signup=signup, observer=observer)

    def as_user(self, user):
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = user.username

    def jump(self, days):
        clock.set_simulated_date(date(2026, 9, 1) + timedelta(days=days))

    def invite(self, observer):
        self.as_user(self.professor_a)
        dates = [f"2026-09-{day:02d}T10:00:00" for day in (7, 9, 14, 16, 21)]
        return self.client.post("/api/invitations/send/",
                                {"observer_id": observer.pk, "proposed_datetimes": dates}, format="json")

    def accept(self, observer, invitation_id, date_index=0):
        self.as_user(observer)
        invitation = Invitation.objects.get(pk=invitation_id)
        proposed = invitation.proposed_dates.order_by("proposed_datetime")[date_index]
        return self.client.post(f"/api/invitations/{invitation_id}/respond/",
                                {"action": "accept", "proposed_date_id": proposed.pk}, format="json")

    def confirm(self, invitation_id):
        self.as_user(self.professor_a)
        return self.client.post("/api/pairings/confirm/", {"invitation_id": invitation_id}, format="json")

    def titles(self, user):
        return list(Notification.objects.filter(user=user).values_list("title", flat=True))

    def test_confirming_one_of_two_accepted_observers_closes_the_other(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        c = self.invite(self.professor_c).data["invitation_id"]
        self.accept(self.professor_b, b, 1)
        self.accept(self.professor_c, c, 2)

        response = self.confirm(b)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Invitation.objects.get(pk=b).status, "confirmed")
        self.assertEqual(Invitation.objects.get(pk=c).status, "closed")
        self.assertIn("Invitation closed", self.titles(self.professor_c))

    def test_only_one_observer_can_be_confirmed(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        c = self.invite(self.professor_c).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.accept(self.professor_c, c)
        self.confirm(b)

        again = self.confirm(b)
        other = self.confirm(c)

        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(other.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pairing.objects.filter(observee=self.professor_a).count(), 1)

    def test_only_the_invited_observer_can_respond(self):
        b = self.invite(self.professor_b).data["invitation_id"]

        response = self.accept(self.professor_d, b)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Invitation.objects.get(pk=b).status, "pending")

    def test_only_the_sender_can_confirm(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.as_user(self.professor_b)

        response = self.client.post("/api/pairings/confirm/", {"invitation_id": b}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Pairing.objects.exists())

    def test_an_invitation_cannot_be_answered_twice(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.accept(self.professor_b, b, 0)

        second = self.accept(self.professor_b, b, 1)

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_unanswered_invitation_expires_after_48_hours(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.jump(2)

        self.as_user(self.professor_a)
        self.client.get("/api/invitations/")
        late = self.accept(self.professor_b, b)

        self.assertEqual(Invitation.objects.get(pk=b).status, "expired")
        self.assertEqual(late.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invitation expired", self.titles(self.professor_a))
        self.assertIn("Invitation expired", self.titles(self.professor_b))

    def test_expiry_is_announced_once(self):
        self.invite(self.professor_b)
        self.jump(3)
        self.as_user(self.professor_a)

        self.client.get("/api/invitations/")
        self.client.get("/api/dashboard/")

        self.assertEqual(self.titles(self.professor_a).count("Invitation expired"), 1)

    def test_observer_is_reminded_once_a_day_before_expiry(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        Invitation.objects.filter(pk=b).update(expires_at=clock.now() + timedelta(hours=20))
        self.as_user(self.professor_b)

        self.client.get("/api/invitations/received/")
        self.client.get("/api/notifications/")

        self.assertEqual(self.titles(self.professor_b).count("Invitation expires soon"), 1)

    def test_no_reminder_while_more_than_a_day_is_left(self):
        self.invite(self.professor_b)
        self.as_user(self.professor_b)

        self.client.get("/api/invitations/received/")

        self.assertNotIn("Invitation expires soon", self.titles(self.professor_b))

    def test_an_expired_or_declined_observer_can_be_invited_again(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        c = self.invite(self.professor_c).data["invitation_id"]
        self.as_user(self.professor_c)
        self.client.post(f"/api/invitations/{c}/respond/", {"action": "decline"}, format="json")
        self.jump(2)

        again_b = self.invite(self.professor_b)
        again_c = self.invite(self.professor_c)

        self.assertEqual(Invitation.objects.get(pk=b).status, "expired")
        self.assertEqual(again_b.status_code, status.HTTP_201_CREATED)
        self.assertEqual(again_c.status_code, status.HTTP_201_CREATED)

    def test_an_open_invitation_blocks_a_duplicate(self):
        self.invite(self.professor_b)

        duplicate = self.invite(self.professor_b)

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_observee_can_reject_an_accepted_response(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.as_user(self.professor_a)

        response = self.client.post(f"/api/invitations/{b}/reject/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Invitation.objects.get(pk=b).status, "rejected")
        self.assertIn("Invitation withdrawn", self.titles(self.professor_b))
        self.assertEqual(self.confirm(b).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.invite(self.professor_b).status_code, status.HTTP_201_CREATED)

    def test_sent_invitations_name_the_observer(self):
        self.invite(self.professor_b)

        sent = self.client.get("/api/invitations/").data

        self.assertEqual(sent[0]["recipient"]["last_name"], "B")

    def test_only_the_sender_can_reject(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.as_user(self.professor_b)

        response = self.client.post(f"/api/invitations/{b}/reject/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_confirmed_invitation_cannot_be_rejected(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.confirm(b)
        self.as_user(self.professor_a)

        response = self.client.post(f"/api/invitations/{b}/reject/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reject_all_withdraws_every_open_invitation(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        c = self.invite(self.professor_c).data["invitation_id"]
        d = self.invite(self.professor_d).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.as_user(self.professor_d)
        self.client.post(f"/api/invitations/{d}/respond/", {"action": "decline"}, format="json")
        self.as_user(self.professor_a)

        response = self.client.post("/api/invitations/reject-all/")

        self.assertEqual(sorted(response.data["rejected_ids"]), sorted([b, c]))
        self.assertEqual(Invitation.objects.get(pk=d).status, "declined")
        self.assertIn("Invitation withdrawn", self.titles(self.professor_c))

    def test_both_participants_see_the_visit_until_it_happens(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        self.accept(self.professor_b, b)
        self.confirm(b)

        seen = []
        for user in (self.professor_a, self.professor_b, self.professor_c):
            self.as_user(user)
            seen.append(len(self.client.get("/api/pairings/scheduled/").data))
        self.jump(7)
        self.as_user(self.professor_b)
        after = self.client.get("/api/pairings/scheduled/").data

        self.assertEqual(seen, [1, 1, 0])
        self.assertEqual(after, [])

    def test_process_invitations_command_expires_overdue_invitations(self):
        b = self.invite(self.professor_b).data["invitation_id"]
        Invitation.objects.filter(pk=b).update(expires_at=timezone.now() - timedelta(minutes=1))
        clock.set_simulated_date(None)

        call_command("process_invitations")

        self.assertEqual(Invitation.objects.get(pk=b).status, "expired")
