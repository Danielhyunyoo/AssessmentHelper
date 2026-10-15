from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from .models import Course, EvaluationCycle, Signup
from .serializers import CourseSerializer, ProfessorSerializer, SignupSerializer

User = get_user_model()


def get_current_professor(request):
    """Resolve the current professor.

    Development only: unauthenticated requests may identify a demo user
    through X-Demo-Username while DEBUG is enabled.
    """
    if request.user.is_authenticated:
        return request.user

    if settings.DEBUG:
        username = request.headers.get("X-Demo-Username")
        if username:
            return get_object_or_404(User, username=username)

    from rest_framework.exceptions import NotAuthenticated
    raise NotAuthenticated(
        "Sign in first, or use X-Demo-Username with an existing demo user "
        "while DEBUG is enabled."
    )


def get_current_cycle():
    cycles = EvaluationCycle.objects.filter(is_current=True)

    if cycles.count() != 1:
        raise NotFound(
            "There must be exactly one current evaluation cycle configured."
        )

    return cycles.get()


@api_view(["GET"])
def my_professor(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    signup = Signup.objects.filter(
        professor=professor,
        cycle=cycle,
    ).select_related("course").first()

    data = {
        "professor": ProfessorSerializer(professor).data,
        "evaluation_cycle": cycle.name,
        "evaluation_status": "signed_up" if signup else "not_signed_up",
        "selected_course": (
            CourseSerializer(signup.course).data if signup else None
        ),
    }
    return Response(data)


@api_view(["GET"])
def my_courses(request):
    professor = get_current_professor(request)

    courses = Course.objects.filter(
        professor=professor,
        is_current=True,
    ).order_by("course_code")

    return Response(CourseSerializer(courses, many=True).data)


@api_view(["POST"])
def create_signup(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    course_id = serializer.validated_data["course_id"]

    course = get_object_or_404(
        Course,
        pk=course_id,
        professor=professor,
        is_current=True,
    )

    if Signup.objects.filter(professor=professor, cycle=cycle).exists():
        raise ValidationError(
            {"detail": "You have already signed up for this evaluation cycle."}
        )

    signup = Signup.objects.create(
        professor=professor,
        course=course,
        cycle=cycle,
    )

    return Response(
        SignupSerializer(signup).data,
        status=status.HTTP_201_CREATED,
    )