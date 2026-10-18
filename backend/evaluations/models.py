from django.db import models
from django.contrib.auth.models import AbstractUser


class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    department_code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ("faculty", "Faculty"),
        ("admin", "Administrator"),
    ]

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="faculty"
    )

    academic_level = models.CharField(
        max_length=50,
        blank=True
    )

    last_evaluated_semester = models.CharField(
        max_length=20,
        blank=True
    )

    last_evaluated_year = models.IntegerField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name}" or self.username

class Course(models.Model):
    course_id = models.AutoField(primary_key=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="courses"
    )

    instructor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="courses_taught"
    )

    course_number = models.CharField(max_length=10)

    course_level = models.IntegerField()

    title = models.CharField(max_length=200, blank=True)

    classroom = models.CharField(max_length=100, blank=True)

    semester = models.CharField(max_length=20, blank=True)

    year = models.IntegerField(null=True, blank=True)

    section = models.CharField(max_length=10)

    schedule = models.CharField(max_length=255)

    def __str__(self):
        return (
            f"{self.department.department_code} "
            f"{self.course_number}.{self.section}"
        )

class Cycle(models.Model):
    cycle_id = models.AutoField(primary_key=True)

    semester = models.CharField(max_length=20)

    start_date = models.DateField()
    end_date = models.DateField()

    signup_deadline = models.DateField()
    observation_deadline = models.DateField()
    survey_deadline = models.DateField()

    status = models.CharField(
        max_length=20,
        default="planned"
    )

    def __str__(self):
        return f"{self.semester} - {self.cycle_id}"

class Signup(models.Model):
    signup_id = models.AutoField(primary_key=True)

    cycle = models.ForeignKey(
        Cycle,
        on_delete=models.PROTECT,
        related_name="signups"
    )

    matches_released_at = models.DateTimeField(
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="signups"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="signups",
        null=True,
        blank=True,
    )

    availability = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        default="pending"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "cycle"],
                name="unique_user_cycle_signup"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.cycle}"

class Pairing(models.Model):
    pairing_id = models.AutoField(primary_key=True)

    cycle = models.ForeignKey(
        Cycle,
        on_delete=models.PROTECT,
        related_name="pairings"
    )

    observer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="observer_pairings"
    )

    observee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="observee_pairings"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="pairings"
    )

    status = models.CharField(
        max_length=20,
        default="pending"
    )

    confirmed_datetime = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.observer} observing {self.observee}"

class Template(models.Model):
    template_id = models.AutoField(primary_key=True)

    name = models.CharField(max_length=100)

    type = models.CharField(
        max_length=50
    )

    version = models.IntegerField(default=1)

    instructions = models.TextField(blank=True)

    questions = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=20,
        default="draft"
    )

    def __str__(self):
        return f"{self.name} (Version {self.version})"

class Invitation(models.Model):
    invitation_id = models.AutoField(primary_key=True)

    cycle = models.ForeignKey(
        Cycle,
        on_delete=models.PROTECT,
        related_name="invitations"
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="sent_invitations"
    )

    recipient = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="received_invitations"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.PROTECT,
        related_name="invitations"
    )

    status = models.CharField(
        max_length=20,
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField(null=True, blank=True)

    responded_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return (
            f"{self.sender} -> {self.recipient} "
            f"({self.status})"
        )

class ProposedDate(models.Model):
    proposed_date_id = models.AutoField(primary_key=True)

    invitation = models.ForeignKey(
        Invitation,
        on_delete=models.CASCADE,
        related_name="proposed_dates"
    )

    proposed_datetime = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        default="proposed"
    )

    def __str__(self):
        return f"{self.proposed_datetime} - {self.status}"

class Observation(models.Model):
    observation_id = models.AutoField(primary_key=True)

    pairing = models.ForeignKey(
        Pairing,
        on_delete=models.PROTECT,
        related_name="observations"
    )

    template = models.ForeignKey(
        Template,
        on_delete=models.PROTECT,
        related_name="observations"
    )

    responses = models.JSONField(
        default=dict,
        blank=True
    )

    observee_signed = models.BooleanField(default=False)
    observer_signed = models.BooleanField(default=False)

    observee_signed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    observer_signed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    cancellation_reason = models.TextField(blank=True)

    unmatched_flag = models.BooleanField(default=False)

    status = models.CharField(
        max_length=30,
        default="draft"
    )

    def __str__(self):
        return f"Observation {self.observation_id} - {self.status}"

class Survey(models.Model):
    survey_id = models.AutoField(primary_key=True)

    pairing = models.ForeignKey(
        Pairing,
        on_delete=models.PROTECT,
        related_name="surveys"
    )

    respondent = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="surveys"
    )

    respondent_type = models.CharField(
        max_length=20,
        choices=[
            ("observer", "Observer"),
            ("observee", "Observee"),
        ]
    )

    survey_file = models.CharField(
        max_length=255,
        blank=True
    )

    score = models.IntegerField(
        null=True,
        blank=True
    )

    pain_points = models.TextField(blank=True)

    improvements = models.TextField(blank=True)

    submitted_at = models.DateTimeField(
        null=True,
        blank=True
    )

    template = models.ForeignKey(
        Template,
        on_delete=models.PROTECT,
        related_name="surveys",
        null=True,
        blank=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["pairing", "respondent_type"],
                name="unique_pairing_survey_role"
            )
        ]

    def __str__(self):
        return f"{self.respondent} - {self.respondent_type}"

class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    message = models.TextField()

    type = models.CharField(max_length=50)

    is_read = models.BooleanField(default=False)

    title = models.CharField(max_length=200, blank=True)

    is_urgent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    destination = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.user} - {self.type}"

class MatchCandidate(models.Model):
    signup = models.ForeignKey(
        Signup,
        on_delete=models.CASCADE,
        related_name="match_candidates"
    )

    observer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="candidate_matches"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["signup", "observer"],
                name="unique_signup_observer_candidate"
            )
        ]

class EvaluationCarryForward(models.Model):
    source_signup = models.OneToOneField(
        Signup, on_delete=models.PROTECT, related_name="carry_forward"
    )
    target_cycle = models.ForeignKey(
        Cycle, on_delete=models.PROTECT, related_name="carry_forwards_received"
    )
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="carry_forward_decisions"
    )

    def __str__(self):
        return f"{self.source_signup.user_id}: {self.source_signup.cycle_id} -> {self.target_cycle_id}"
