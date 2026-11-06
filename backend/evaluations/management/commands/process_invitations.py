from django.core.management.base import BaseCommand

from evaluations.views import process_invitation_deadlines


class Command(BaseCommand):
    help = "Expire unanswered invitations and send reminders a day before they expire. Run hourly."

    def handle(self, *args, **options):
        process_invitation_deadlines()
