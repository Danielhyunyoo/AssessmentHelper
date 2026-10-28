from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from evaluations.models import (
    Course, Cycle, Department, EvaluationCarryForward, Invitation, Notification,
    Observation, Pairing, Signup, Survey,
)

User = get_user_model()

FALL_2026 = {
    "start_date": date(2026, 8, 24),
    "end_date": date(2026, 12, 18),
    "signup_deadline": date(2026, 10, 30),
    "observation_deadline": date(2026, 11, 30),
    "survey_deadline": date(2026, 12, 10),
    "status": "active",
}

FACULTY = [
    {"username": "faculty_alice", "first_name": "Alice", "academic_level": "assistant", "last_evaluated_year": 2025},
    {"username": "faculty_bob", "first_name": "Bob", "academic_level": "associate", "last_evaluated_year": 2023},
    {"username": "faculty_carol", "first_name": "Carol", "academic_level": "full", "last_evaluated_year": 2025},
    {"username": "faculty_dave", "first_name": "Dave", "academic_level": "assistant", "last_evaluated_year": None},
]

COMMITTEE = {"username": "committee_demo", "first_name": "Committee", "role": "admin"}

DEMO_PASSWORD = "demo-password"

COURSES = [
    ("faculty_alice", "2337", "001", "Computer Science II", "MWF 10:00-10:50", "ECSS 2.410", "Fall", 2026),
    ("faculty_alice", "3341", "001", "Probability and Statistics in Computer Science and Software Engineering", "TR 10:00-11:15", "ECSS 2.311", "Fall", 2026),
    ("faculty_alice", "1337", "002", "Computer Science I", "TR 1:00-2:15", "ECSS 2.306", "Spring", 2026),
    ("faculty_bob", "2305", "001", "Discrete Mathematics for Computing I", "TR 11:30-12:45", "ECSW 1.315", "Fall", 2026),
    ("faculty_carol", "3345", "001", "Data Structures and Introduction to Algorithmic Analysis", "MW 2:30-3:45", "ECSS 2.415", "Fall", 2026),
    ("faculty_dave", "2336", "001", "Computer Science II", "MWF 11:00-11:50", "ECSS 2.412", "Fall", 2026),
]


class Command(BaseCommand):
    help = (
        "Create or reset the demo cast: faculty_alice (due), faculty_bob (overdue), "
        "faculty_carol (not due), faculty_dave (undetermined), committee_demo, "
        "their CS courses, and the active Fall 2026 cycle. Safe to run again. "
        "Existing signups, pairings and observations are kept unless --reset is given. "
        "Every account signs in as <first name>@utdallas.edu with demo-password."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help=(
                "Delete every signup, invitation, pairing, observation, survey and "
                "notification that involves the demo cast, so faculty_alice starts unregistered."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.clear_demo_activity()

        department, _ = Department.objects.update_or_create(
            department_code="CS",
            defaults={"name": "Computer Science"},
        )

        users = {}
        for person in [*FACULTY, COMMITTEE]:
            fields = {
                "last_name": "Demo",
                "department": department,
                "role": "faculty",
                "email": f"{person['first_name'].lower()}@utdallas.edu",
                **person,
            }
            username = fields.pop("username")
            user, _ = User.objects.update_or_create(username=username, defaults=fields)
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
            users[username] = user

        Cycle.objects.update_or_create(semester="Fall 2026", defaults=FALL_2026)

        for username, number, section, title, schedule, classroom, semester, year in COURSES:
            Course.objects.update_or_create(
                department=department,
                course_number=number,
                section=section,
                semester=semester,
                year=year,
                defaults={
                    "instructor": users[username],
                    "course_level": int(number[0]) * 1000,
                    "title": title,
                    "schedule": schedule,
                    "classroom": classroom,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(users)} users and {len(COURSES)} courses. "
            f"Sign in as alice@utdallas.edu with {DEMO_PASSWORD}."
        ))

    def clear_demo_activity(self):
        cast = User.objects.filter(username__in=[p["username"] for p in [*FACULTY, COMMITTEE]])
        pairings = Pairing.objects.filter(Q(observer__in=cast) | Q(observee__in=cast))
        signups = Signup.objects.filter(user__in=cast)

        Survey.objects.filter(Q(pairing__in=pairings) | Q(respondent__in=cast)).delete()
        Observation.objects.filter(pairing__in=pairings).delete()
        pairings.delete()
        Invitation.objects.filter(Q(sender__in=cast) | Q(recipient__in=cast)).delete()
        EvaluationCarryForward.objects.filter(Q(source_signup__in=signups) | Q(created_by__in=cast)).delete()
        signups.delete()
        Notification.objects.filter(user__in=cast).delete()
