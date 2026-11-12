from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from django.contrib.auth.hashers import make_password

from evaluations.demo_background import background_users, clear_background_activity, seed_background
from evaluations.demo_history import seed_avatars, seed_history
from evaluations.management.commands.seed_demo import COMMITTEE, DEMO_PASSWORD, FACULTY
from evaluations.models import Department, Pairing, Template

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Add past Fall 2023 to Fall 2025 observations, records, and surveys for the demo cast, "
        "profile pictures, and 100 background professors in other departments with activity "
        "across the cycle for the KPIs. Run seed_demo first. Safe to run again."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete and regenerate the background professors' activity.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        usernames = [person["username"] for person in [*FACULTY, COMMITTEE]]
        users = {user.username: user for user in User.objects.filter(username__in=usernames)}
        if len(users) != len(usernames):
            self.stderr.write("Run seed_demo first.")
            return

        if not Pairing.objects.filter(observee__in=users.values(), cycle__status="closed").exists():
            seed_history(
                Department.objects.get(department_code="CS"),
                users,
                published("observation"),
                published("survey"),
            )
        seed_avatars(users)

        if options["reset"]:
            clear_background_activity()
        if options["reset"] or not background_users().exists():
            seed_background(published("observation"), published("survey"), make_password(DEMO_PASSWORD))
        self.stdout.write(self.style.SUCCESS(f"Seeded past observations, surveys, profile pictures, and {background_users().count()} background professors."))


def published(kind):
    return Template.objects.filter(type=kind, status="published").order_by("-version", "-template_id").first()
