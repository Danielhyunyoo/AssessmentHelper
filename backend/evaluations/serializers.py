from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Course, Signup

User = get_user_model()


class ProfessorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "role",
            "academic_level",
        ]


class CourseSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(read_only=True)
    department_name = serializers.CharField(
        source="department.name",
        read_only=True,
    )
    department_code = serializers.CharField(
        source="department.department_code",
        read_only=True,
    )
    instructor_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "course_id",
            "department_id",
            "department_name",
            "department_code",
            "instructor_id",
            "course_number",
            "course_level",
            "section",
            "schedule",
        ]


class SignupCreateSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(min_value=1)


class SignupSerializer(serializers.ModelSerializer):
    cycle_id = serializers.IntegerField(read_only=True)
    course_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Signup
        fields = [
            "signup_id",
            "cycle_id",
            "course_id",
            "status",
            "availability",
        ]
