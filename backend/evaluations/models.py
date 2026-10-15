from django.conf import settings
from django.db import models


class Course(models.Model):
    professor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses",
    )
    course_code = models.CharField(max_length=20)
    course_name = models.CharField(max_length=200)
    semester = models.CharField(max_length=50)
    is_current = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.course_code} - {self.course_name}"


class EvaluationCycle(models.Model):
    name = models.CharField(max_length=100)
    is_current = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Signup(models.Model):
    professor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="evaluation_signups",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="signups",
    )
    cycle = models.ForeignKey(
        EvaluationCycle,
        on_delete=models.CASCADE,
        related_name="signups",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["professor", "cycle"],
                name="unique_professor_signup_per_cycle",
            )
        ]

    def __str__(self):
        return f"{self.professor} - {self.course} ({self.cycle})"