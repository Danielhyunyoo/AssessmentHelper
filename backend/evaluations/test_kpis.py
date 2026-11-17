from datetime import date, datetime
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from rest_framework.test import APITestCase

from . import clock
from .models import Course, Cycle, MatchCandidate, Observation, Pairing, Signup, Survey, Template
from .proposal_kpis import overlaps

User = get_user_model()


def at(day, hour=10):
    return timezone.make_aware(datetime(day.year, day.month, day.day, hour))


@override_settings(DEBUG=True)
class ProposalKpiTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", stdout=StringIO())
        clock.set_simulated_date(date(2026, 11, 12))
        self.addCleanup(clock.set_simulated_date, None)
        self.cycle = Cycle.objects.get(status="active")
        self.people = {u.last_name: u for u in User.objects.filter(role="faculty")}
        self.observation_template = Template.objects.get(type="observation", status="published")
        self.survey_template = Template.objects.get(type="survey", status="published")
        self.client.defaults["HTTP_X_DEMO_USERNAME"] = "committee_demo"

    def signup(self, letter, released=False):
        course = Course.objects.filter(instructor=self.people[letter], semester="Fall", year=2026).first()
        return Signup.objects.create(cycle=self.cycle, user=self.people[letter], course=course,
                                     matches_released_at=at(date(2026, 10, 1)) if released else None)

    def pair(self, observee, observer, visit):
        course = Course.objects.filter(instructor=self.people[observee], semester="Fall", year=2026).first()
        return Pairing.objects.create(cycle=self.cycle, observee=self.people[observee], observer=self.people[observer],
                                      course=course, status="confirmed", confirmed_datetime=at(visit))

    def kpi(self, key):
        kpis = self.client.get("/api/committee/kpis/").data["kpis"]
        return next(k for k in kpis if k["key"] == key)

    def test_participation_divides_signups_by_due_and_overdue_faculty(self):
        for letter in "ABE":
            self.signup(letter)

        kpi = self.kpi("participation_rate")

        self.assertEqual((kpi["numerator"], kpi["denominator"], kpi["value"]), (3, 6, 50.0))

    def test_eligibility_rejects_another_level_and_a_schedule_conflict(self):
        Course.objects.create(department=self.people["H"].department, instructor=self.people["H"], course_number="2340",
                              section="009", course_level=2000, title="Conflict", schedule="MW 10:30 AM - 11:45 AM",
                              classroom="ECSS 2.410", semester="Fall", year=2026)
        signup = self.signup("A", released=True)
        for letter in "BCDH":
            MatchCandidate.objects.create(signup=signup, observer=self.people[letter])

        kpi = self.kpi("eligibility_accuracy")

        self.assertEqual((kpi["numerator"], kpi["denominator"], kpi["value"]), (2, 4, 50.0))

    def test_list_sufficiency_averages_eligible_candidates_per_released_list(self):
        signup = self.signup("A", released=True)
        for letter in "BD":
            MatchCandidate.objects.create(signup=signup, observer=self.people[letter])
        self.signup("B", released=True)

        kpi = self.kpi("list_sufficiency")

        self.assertEqual((kpi["numerator"], kpi["denominator"], kpi["value"]), (2, 2, 1.0))

    def test_observer_utilization_counts_observers_over_signups(self):
        for letter in "ABE":
            self.signup(letter)
        self.pair("A", "C", date(2026, 11, 20))

        kpi = self.kpi("observer_utilization")

        self.assertEqual((kpi["numerator"], kpi["denominator"], kpi["value"]), (1, 3, 33.33))

    def test_missing_observations_count_cancelled_visits_and_unsubmitted_records_after_the_deadline(self):
        cancelled = self.pair("A", "B", date(2026, 11, 2))
        Observation.objects.create(pairing=cancelled, template=self.observation_template, status="cancelled",
                                   cancellation_reason="Class was cancelled")
        self.pair("E", "H", date(2026, 11, 3))

        before_deadline = self.kpi("missing_observations")["value"]
        clock.set_simulated_date(date(2026, 12, 1))
        after_deadline = self.kpi("missing_observations")["value"]

        self.assertEqual((before_deadline, after_deadline), (1, 2))

    def test_survey_completion_counts_signups_that_finished_every_step(self):
        for letter in "ABE":
            self.signup(letter)
        for observee, observer, survey in (("A", "G", True), ("B", "F", False)):
            pairing = self.pair(observee, observer, date(2026, 10, 20))
            Observation.objects.create(pairing=pairing, template=self.observation_template, status="completed",
                                       observer_signed=True, observee_signed=True,
                                       observer_signed_at=at(date(2026, 10, 21)), observee_signed_at=at(date(2026, 10, 22)))
            if survey:
                Survey.objects.create(pairing=pairing, respondent=self.people[observee], respondent_type="observee",
                                      template=self.survey_template, responses={"score": 4}, score=4,
                                      submitted_at=at(date(2026, 12, 2)))

        clock.set_simulated_date(date(2026, 12, 2))
        kpi = self.kpi("process_completion")

        self.assertEqual((kpi["numerator"], kpi["denominator"], kpi["value"]), (1, 3, 33.33))

    def test_survey_completion_is_not_reported_before_surveys_open(self):
        self.signup("A")

        kpi = self.kpi("process_completion")

        self.assertEqual((kpi["value"], kpi["note"]), (None, "Surveys open after Nov 30"))

    def test_overlap_needs_a_shared_day_and_time(self):
        self.assertTrue(overlaps("MW 10:00 AM - 11:15 AM", "MW 11:00 AM - 12:15 PM"))
        self.assertFalse(overlaps("MW 10:00 AM - 11:15 AM", "TR 10:00 AM - 11:15 AM"))
        self.assertFalse(overlaps("MW 10:00 AM - 11:15 AM", "MW 11:15 AM - 12:30 PM"))
        self.assertFalse(overlaps("MW 10:00 AM - 11:15 AM", "To be announced"))

    def test_candidate_pool_lists_eligible_observers_first_with_reasons(self):
        signup = self.signup("A")

        pool = self.client.get(f"/api/committee/signups/{signup.pk}/candidate-pool/").data["candidates"]

        eligible = [c["name"] for c in pool if c["eligible"]]
        professor_c = next(c for c in pool if c["name"] == "Professor C")
        self.assertEqual(eligible, ["Professor B", "Professor D"])
        self.assertEqual([c["name"] for c in pool[:2]], eligible)
        self.assertEqual(professor_c["problems"], ["does not teach a course at this level"])
