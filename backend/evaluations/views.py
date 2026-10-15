from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotAuthenticated, NotFound, ValidationError
from rest_framework.response import Response

from .models import Course, Cycle, Signup
from .serializers import (
    CourseSerializer,
    ProfessorSerializer,
    SignupCreateSerializer,
    SignupSerializer,
)

User = get_user_model()


def get_current_professor(request):
    """Return the authenticated user or a DEBUG-only demo user."""
    if request.user.is_authenticated:
        return request.user

    if settings.DEBUG:
        username = request.headers.get("X-Demo-Username")
        if username:
            return get_object_or_404(User, username=username)

    raise NotAuthenticated(
        "Sign in first, or use X-Demo-Username with an existing demo user "
        "while DEBUG is enabled."
    )


def get_current_cycle():
    """Return the one active evaluation cycle."""
    cycles = Cycle.objects.filter(status="active")

    if cycles.count() != 1:
        raise NotFound(
            "There must be exactly one active evaluation cycle configured."
        )

    return cycles.get()


@api_view(["GET"])
def my_professor(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    signup = (
        Signup.objects.filter(user=professor, cycle=cycle)
        .select_related("course")
        .first()
    )

    data = {
        "professor": ProfessorSerializer(professor).data,
        "evaluation_cycle": cycle.semester,
        "evaluation_status": "signed_up" if signup else "not_signed_up",
        "selected_course": (
            CourseSerializer(signup.course).data if signup else None
        ),
    }

    return Response(data)


@api_view(["GET"])
def my_courses(request):
    professor = get_current_professor(request)

    courses = (
        Course.objects.filter(instructor=professor)
        .select_related("department")
        .order_by("department__department_code", "course_number", "section")
    )

    return Response(CourseSerializer(courses, many=True).data)


@api_view(["POST"])
def create_signup(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    serializer = SignupCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    course_id = serializer.validated_data["course_id"]

    course = get_object_or_404(
        Course,
        pk=course_id,
        instructor=professor,
    )

    if Signup.objects.filter(user=professor, cycle=cycle).exists():
        raise ValidationError(
            {"detail": "You have already signed up for this evaluation cycle."}
        )

    signup = Signup.objects.create(
        user=professor,
        course=course,
        cycle=cycle,
    )

    return Response(
        SignupSerializer(signup).data,
        status=status.HTTP_201_CREATED,
    )