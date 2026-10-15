from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Course, Signup

User = get_user_model()


class ProfessorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "course_code", "course_name", "semester"]


class SignupSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Signup
        fields = ["id", "course_id", "created_at"]
        read_only_fields = ["id", "created_at"]