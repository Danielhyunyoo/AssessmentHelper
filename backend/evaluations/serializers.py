from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Course, Signup, Notification

User = get_user_model()


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class ProfessorSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()

    def get_department_name(self, obj):
        if obj.department_id:
            return obj.department.name
        return None

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "academic_level",
            "department_name",
            "last_evaluated_semester",
            "last_evaluated_year",
        ]

class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, allow_blank=False)
    last_name = serializers.CharField(max_length=150, allow_blank=False)
    phone = serializers.CharField(max_length=30, allow_blank=True, required=False)

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
            "title",
            "classroom",
        ]


class SignupCreateSerializer(serializers.Serializer):
    course_id = serializers.IntegerField(min_value=1, required=False)


class CourseSelectionSerializer(serializers.Serializer):
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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "notification_id",
            "title",
            "message",
            "type",
            "is_urgent",
            "is_read",
            "created_at",
            "destination",
        ]
        read_only_fields = fields


class CandidateApprovalSerializer(serializers.Serializer):
    observer_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False, max_length=5
    )

    def validate_observer_ids(self, values):
        if len(values) != len(set(values)):
            raise serializers.ValidationError("Observer IDs must be distinct.")
        return values


class InvitationCreateSerializer(serializers.Serializer):
    observer_id = serializers.IntegerField(min_value=1)
    proposed_datetimes = serializers.ListField(
        child=serializers.DateTimeField(), min_length=4, max_length=8
    )

    def validate_proposed_datetimes(self, values):
        if len(values) != len(set(values)):
            raise serializers.ValidationError("Dates must be distinct.")
        return values


class InvitationResponseSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "decline"])
    proposed_date_id = serializers.IntegerField(min_value=1, required=False)

    def validate(self, data):
        if data["action"] == "accept" and not data.get("proposed_date_id"):
            raise serializers.ValidationError({"proposed_date_id": "Required when accepting."})
        return data


class PairingConfirmSerializer(serializers.Serializer):
    invitation_id = serializers.IntegerField(min_value=1)


# E03/O03 observation record input validation
class ObservationCreateSerializer(serializers.Serializer):
    pairing_id = serializers.IntegerField(min_value=1)
    template_id = serializers.IntegerField(min_value=1)


class ObservationDraftSerializer(serializers.Serializer):
    responses = serializers.DictField(child=serializers.JSONField(), allow_empty=True)


class ObservationCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=5000)


# E04/O04: one survey response per pairing/participant role.
class SurveySubmitSerializer(serializers.Serializer):
    template_id = serializers.IntegerField(min_value=1)
    score = serializers.IntegerField(min_value=1, max_value=5)
    pain_points = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    improvements = serializers.CharField(required=False, allow_blank=True, max_length=10000)


# A04 committee operations
class FacultyRankUpdateSerializer(serializers.Serializer):
    academic_rank = serializers.CharField(max_length=50, allow_blank=False, trim_whitespace=True)


class FacultyReminderSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), min_length=1, max_length=100
    )

    def validate_user_ids(self, values):
        if len(set(values)) != len(values):
            raise serializers.ValidationError("Faculty IDs must be unique.")
        return values


# A03: Explicit committee approval for carrying unmatched evaluations forward.
class CarryForwardSerializer(serializers.Serializer):
    signup_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), min_length=1, max_length=100
    )
    target_cycle_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)

    def validate_signup_ids(self, values):
        if len(values) != len(set(values)):
            raise serializers.ValidationError("Signup IDs must be unique.")
        return values


# A08: form templates
class TemplateQuestionSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=80)
    text = serializers.CharField(max_length=2000)
    type = serializers.ChoiceField(choices=("rating", "text"))
    required = serializers.BooleanField(default=False)
    min = serializers.IntegerField(required=False)
    max = serializers.IntegerField(required=False)
    section = serializers.CharField(max_length=200, required=False, allow_blank=True)
    order = serializers.IntegerField(required=False, min_value=0)

    def validate(self, data):
        if data["type"] == "rating":
            if "min" not in data or "max" not in data or data["min"] >= data["max"]:
                raise serializers.ValidationError("Rating questions require min < max.")
        elif "min" in data or "max" in data:
            raise serializers.ValidationError("Text questions cannot define rating limits.")
        return data


class TemplateDraftSerializer(serializers.Serializer):
    instructions = serializers.CharField(required=False, allow_blank=True, max_length=10000)
    questions = TemplateQuestionSerializer(many=True, required=False)

    def validate_questions(self, questions):
        ids = [question["id"] for question in questions]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Question IDs must be unique within a form.")
        return questions


class TemplateCreateSerializer(TemplateDraftSerializer):
    name = serializers.CharField(max_length=100, allow_blank=False)
    type = serializers.ChoiceField(choices=("observation", "survey"))


class CycleDatesUpdateSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    signup_deadline = serializers.DateField(required=False)
    observation_deadline = serializers.DateField(required=False)
    survey_deadline = serializers.DateField(required=False)


class DemoDateSerializer(serializers.Serializer):
    date = serializers.DateField(allow_null=True)


class SignupAvailabilitySerializer(serializers.Serializer):
    available_datetimes = serializers.ListField(
        child=serializers.DateTimeField(),
        allow_empty=True,
        max_length=8,
    )

    def validate_available_datetimes(self, values):
        if 0 < len(values) < 4:
            raise serializers.ValidationError("Select at least four observation dates.")
        
        if len(values) != len(set(values)):
            raise serializers.ValidationError(
                "Proposed date and time choices must be unique."
            )

        # An empty list is allowed when clearing availability after
        # a course change. Otherwise, require at least four dates.
        if 0 < len(values) < 4:
            raise serializers.ValidationError(
                "Select at least four observation dates."
            )

        return values