from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from evaluations.models import (
    Course, Cycle, Department, EvaluationCarryForward, Invitation, Notification,
    Observation, Pairing, Signup, Survey, Template,
)

User = get_user_model()

OBSERVATION_TEMPLATE = {
    "name": "Peer classroom observation",
    "type": "observation",
    "status": "published",
    "instructions": "Rate each area from 1 (needs improvement) to 5 (excellent), then add comments.",
    "questions": [
        {"id": "organization", "text": "Class was organized and objectives were clear", "type": "rating", "required": True, "min": 1, "max": 5},
        {"id": "clarity", "text": "Explanations were clear and accurate", "type": "rating", "required": True, "min": 1, "max": 5},
        {"id": "engagement", "text": "Students were engaged and participating", "type": "rating", "required": True, "min": 1, "max": 5},
        {"id": "strengths", "text": "Strengths observed", "type": "text", "required": True},
        {"id": "suggestions", "text": "Suggestions for improvement", "type": "text", "required": False},
    ],
}

FALL_2026 = {
    "start_date": date(2026, 8, 24),
    "end_date": date(2026, 12, 18),
    "signup_deadline": date(2026, 11, 30),
    "observation_deadline": date(2026, 11, 30),
    "survey_deadline": date(2026, 12, 10),
    "status": "active",
}

def professor(letter, academic_level, last_evaluated_year):
    return {
        "username": f"professor_{letter.lower()}",
        "first_name": "Professor",
        "last_name": letter,
        "email": f"professor{letter.lower()}@utdallas.edu",
        "academic_level": academic_level,
        "last_evaluated_year": last_evaluated_year,
    }


FACULTY = [
    professor("A", "assistant", 2025),
    professor("B", "associate", 2023),
    professor("C", "full", 2025),
    professor("D", "assistant", None),
    professor("E", "associate", 2024),
    professor("F", "full", 2023),
    professor("G", "assistant", 2025),
    professor("H", "associate", 2024),
]

RENAMED_USERNAMES = {
    "faculty_alice": "professor_a",
    "faculty_bob": "professor_b",
    "faculty_carol": "professor_c",
    "faculty_dave": "professor_d",
    "faculty_juan": "professor_e",
    "faculty_diego": "professor_f",
    "faculty_valeria": "professor_g",
    "faculty_maria": "professor_h",
}

COMMITTEE = {
    "username": "committee_demo",
    "first_name": "Assessment",
    "last_name": "Committee",
    "email": "committee@utdallas.edu",
    "role": "admin",
}

DEMO_PASSWORD = "demo-password"

COURSES = [
    ("professor_a", "2337", "001", "Computer Science II", "MW 10:00 AM - 11:15 AM", "ECSS 2.410", "Fall", 2026),
    ("professor_a", "3341", "001", "Probability and Statistics in Computer Science and Software Engineering", "TR 10:00 AM - 11:15 AM", "ECSS 2.311", "Fall", 2026),
    ("professor_a", "1337", "002", "Computer Science I", "TR 1:00 PM - 2:15 PM", "ECSS 2.306", "Spring", 2026),
    ("professor_b", "2305", "001", "Discrete Mathematics for Computing I", "TR 11:30 AM - 12:45 PM", "ECSW 1.315", "Fall", 2026),
    ("professor_c", "3345", "001", "Data Structures and Introduction to Algorithmic Analysis", "MW 2:30 PM - 3:45 PM", "ECSS 2.415", "Fall", 2026),
    ("professor_d", "2336", "001", "Computer Science II", "MW 11:30 AM - 12:45 PM", "ECSS 2.412", "Fall", 2026),
    ("professor_e", "3354", "001", "Software Engineering", "TR 2:30 PM - 3:45 PM", "ECSS 2.305", "Fall", 2026),
    ("professor_f", "4337", "001", "Programming Language Paradigms", "MW 1:00 PM - 2:15 PM", "ECSS 2.203", "Fall", 2026),
    ("professor_g", "3377", "001", "Systems Programming in UNIX and Other Environments", "TR 8:30 AM - 9:45 AM", "ECSS 2.306", "Fall", 2026),
    ("professor_h", "4348", "001", "Operating Systems Concepts", "MW 8:30 AM - 9:45 AM", "ECSS 2.311", "Fall", 2026),
]


class Command(BaseCommand):
    help = (
        "Create or reset the demo cast: Professor A (due), Professor B (overdue), "
        "Professor C (not due), Professor D (undetermined), Professors E to H, "
        "the Assessment Committee, their CS courses, and the active Fall 2026 cycle. "
        "Safe to run again. Existing signups, pairings and observations are kept unless "
        "--reset is given. Every account signs in with demo-password, for example "
        "professora@utdallas.edu or committee@utdallas.edu."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help=(
                "Delete every signup, invitation, pairing, observation, survey and "
                "notification that involves the demo cast, so Professor A starts unregistered."
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

        for old_username, new_username in RENAMED_USERNAMES.items():
            if not User.objects.filter(username=new_username).exists():
                User.objects.filter(username=old_username).update(username=new_username)

        users = {}
        for person in [*FACULTY, COMMITTEE]:
            fields = {"department": department, "role": "faculty", **person}
            username = fields.pop("username")
            user, _ = User.objects.update_or_create(username=username, defaults=fields)
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
            users[username] = user

        Cycle.objects.update_or_create(semester="Fall 2026", defaults=FALL_2026)

        if not Template.objects.filter(type="observation", status="published").exists():
            Template.objects.create(**OBSERVATION_TEMPLATE)

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
            f"Sign in as professora@utdallas.edu with {DEMO_PASSWORD}."
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
        Template.objects.exclude(
            pk__in=Observation.objects.values_list("template_id", flat=True)
        ).exclude(
            pk__in=Survey.objects.exclude(template__isnull=True).values_list(
                "template_id", flat=True
            )
        ).delete()
