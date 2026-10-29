from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login as django_login, logout as django_logout
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.shortcuts import get_object_or_404
import json

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import NotAuthenticated, NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication

from .models import Course, Cycle, Signup, Notification, Invitation
from .evaluation_status import evaluation_status_for
from django.utils import timezone
from .serializers import (
    CourseSerializer,
    CourseSelectionSerializer,
    ProfessorSerializer,
    ProfileUpdateSerializer,
    SignupCreateSerializer,
    SignupSerializer,
    NotificationSerializer,
    LoginSerializer,
    CycleDatesUpdateSerializer,
    SignupAvailabilitySerializer,
)

User = get_user_model()




def username_for(login_name):
    if "@" not in login_name:
        return login_name
    usernames = list(User.objects.filter(email__iexact=login_name).values_list("username", flat=True)[:2])
    return usernames[0] if len(usernames) == 1 else None


@ensure_csrf_cookie
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def csrf_cookie(request):
    """Establish a CSRF cookie before browser login."""
    return Response({"detail": "CSRF cookie set."})


@csrf_protect
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def session_login(request):
    """Authenticate credentials and create a Django session."""
    SessionAuthentication().enforce_csrf(request)
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    username = username_for(serializer.validated_data["username"].strip())
    user = username and authenticate(
        request._request,
        username=username,
        password=serializer.validated_data["password"],
    )
    if not user or not user.is_active:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    django_login(request._request, user)
    return Response({"professor": ProfessorSerializer(user).data})


@csrf_protect
@api_view(["POST"])
@authentication_classes([SessionAuthentication])
def session_logout(request):
    """Sign out the session user; no demo-header fallback."""
    if not request.user.is_authenticated:
        raise NotAuthenticated("Sign in first.")
    django_logout(request._request)
    return Response({"detail": "Signed out."})


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def session_user(request):
    """Return the signed-in user."""
    if not request.user.is_authenticated:
        return Response({"professor": None})
    return Response({"professor": ProfessorSerializer(request.user).data})


def get_current_professor(request):
    """Return the authenticated user or a DEBUG-only demo user."""
    if request.user.is_authenticated:
        return request.user

    if settings.DEBUG and getattr(settings, "ASSESSMENT_HELPER_DEMO_AUTH", False):
        username = request.headers.get("X-Demo-Username")
        if username:
            return get_object_or_404(User, username=username)

    raise NotAuthenticated(
        "Sign in first, or use X-Demo-Username with an existing demo user "
        "when demo authentication is explicitly enabled."
    )


def get_current_cycle():
    """Return the one active evaluation cycle."""
    cycles = Cycle.objects.filter(status="active")

    if cycles.count() != 1:
        raise NotFound(
            "There must be exactly one active evaluation cycle configured."
        )

    return cycles.get()


def current_courses(professor, cycle):
    """Return the professor's courses in the active cycle's term."""
    term, _, year = cycle.semester.rpartition(" ")

    if not term or not year.isdigit():
        raise NotFound(
            f'The active cycle "{cycle.semester}" must be named like "Fall 2026" '
            "so its courses can be found. Rename the cycle."
        )

    return Course.objects.filter(
        instructor=professor, semester__iexact=term, year=int(year)
    )


def notify_course_selected(signup):
    Notification.objects.create(
        user=signup.user,
        title="Course selection saved",
        message=f"{signup.course} is your course for the {signup.cycle.semester} evaluation cycle.",
        type="registration",
        destination="/dashboard",
    )


@api_view(["GET", "PATCH"])
def my_professor(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    if request.method == "PATCH":
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(professor, field, value.strip())

        professor.save(
            update_fields=list(serializer.validated_data.keys())
        )

    signup = (
        Signup.objects.filter(user=professor, cycle=cycle)
        .select_related("course")
        .first()
    )

    data = {
        "professor": ProfessorSerializer(professor).data,
        "evaluation_cycle": cycle.semester,
        "evaluation_status": evaluation_status_for(professor, cycle)["status"],
        "evaluation_status_details": evaluation_status_for(professor, cycle),
        "registration_status": "signed_up" if signup else "not_signed_up",
        "selected_course": (
            CourseSerializer(signup.course).data if signup and signup.course_id else None
        ),
    }

    return Response(data)


@api_view(["GET"])
def my_courses(request):
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    courses = (
        current_courses(professor, cycle)
        .select_related("department")
        .order_by("department__department_code", "course_number", "section")
    )

    return Response(CourseSerializer(courses, many=True).data)


@api_view(["GET"])
def registration_status(request):
    """Return registration and course-selection state for the active cycle."""
    professor = get_current_professor(request)
    cycle = get_current_cycle()
    signup = Signup.objects.filter(user=professor, cycle=cycle).first()
    return Response({
        "cycle_id": cycle.pk,
        "cycle_name": cycle.semester,
        "start_date": cycle.start_date,
        "end_date": cycle.end_date,
        "signup_deadline": cycle.signup_deadline,
        "observation_deadline": cycle.observation_deadline,
        "survey_deadline": cycle.survey_deadline,
        "is_registered": signup is not None,
        "has_selected_course": bool(signup and signup.course_id),
        "selected_course_id": signup.course_id if signup else None,
        # Availability and reasons should be derived from the team's agreed
        # signup dates and policies before this is used to enable UI controls.
    })


@api_view(["POST"])
def create_signup(request):
    """Join the active cycle; optionally pick a course for compatibility."""
    professor = get_current_professor(request)
    cycle = get_current_cycle()
    serializer = SignupCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    course_id = serializer.validated_data.get("course_id")
    course = None
    if course_id is not None:
        course = get_object_or_404(current_courses(professor, cycle), pk=course_id)

    already_registered = Signup.objects.filter(user=professor, cycle=cycle).exists()
    if not already_registered and timezone.localdate() > cycle.signup_deadline:
        raise ValidationError({"detail": "The signup deadline has passed. Contact the Assessment Committee to register late."})

    # get_or_create honors unique_user_cycle_signup, including concurrent clicks.
    signup, created = Signup.objects.get_or_create(
        user=professor, cycle=cycle,
        defaults={"course": course},
    )
    if not created and course_id is not None and signup.course_id != course_id:
        raise ValidationError({
            "detail": "Already registered. Use the course selection endpoint to change courses."
        })
    if created and course is not None:
        notify_course_selected(signup)
    return Response(
        SignupSerializer(signup).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["PATCH"])
def select_signup_course(request):
    """Select/change the one course section associated with this cycle signup."""
    professor = get_current_professor(request)
    cycle = get_current_cycle()
    signup = Signup.objects.filter(user=professor, cycle=cycle).first()
    if signup is None:
        raise ValidationError({"detail": "Register for the cycle before selecting a course."})
    serializer = CourseSelectionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    course = get_object_or_404(
        current_courses(professor, cycle), pk=serializer.validated_data["course_id"],
    )
    if signup.matches_released_at or Invitation.objects.filter(cycle=cycle, sender=professor).exists():
        raise ValidationError({"detail": "Course selection is locked after matches are released."})
    if timezone.localdate() > cycle.signup_deadline:
        raise ValidationError({"detail": "The course signup deadline has passed."})
    if signup.course_id != course.pk:
        signup.course = course
        signup.save(update_fields=["course"])
        notify_course_selected(signup)
    return Response(SignupSerializer(signup).data)


@api_view(["GET"])
def faculty_dashboard(request):
    """Dashboard data for S01, scoped to the current professor and cycle."""
    from django.utils import timezone
    from .models import Invitation, Notification, Pairing, Observation

    professor = get_current_professor(request)
    cycle = get_current_cycle()
    today = timezone.localdate()
    signup = (
        Signup.objects.filter(user=professor, cycle=cycle)
        .select_related("course")
        .first()
    )

    unread_count = Notification.objects.filter(
        user=professor, is_read=False
    ).count()
    incoming_count = Invitation.objects.filter(
        cycle=cycle, recipient=professor, status="pending"
    ).count()

    evaluation = evaluation_status_for(professor, cycle)
    evaluation_status = evaluation["status"]
    evaluation_status_reason = evaluation["reason"]

    has_selected_course = bool(signup and signup.course_id)
    is_registered = signup is not None
    before_signup_deadline = today <= cycle.signup_deadline
    before_observation_deadline = today <= cycle.observation_deadline
    before_survey_deadline = today <= cycle.survey_deadline

    # Consider only this user's observee-side confirmed observations, not
    # observations in which they serve as an observer.
    from django.db.models import Q
    signed_observation_exists = Observation.objects.filter(
        Q(pairing__observee=professor) | Q(pairing__observer=professor),
        pairing__cycle=cycle,
        pairing__status="confirmed",
        observer_signed=True,
        observee_signed=True,
    ).exists()
    confirmed_assignment_exists = Pairing.objects.filter(
        cycle=cycle, observee=professor, status="confirmed"
    ).exists()
    observer_assignment_exists = Pairing.objects.filter(
        cycle=cycle, observer=professor, status="confirmed"
    ).exists()

    def module(available, reason=None):
        return {"available": bool(available), "reason": None if available else reason}

    modules = {
        "course_selection": module(
            is_registered and before_signup_deadline,
            "Register for the cycle first." if not is_registered
            else "The course signup deadline has passed.",
        ),
        "observer_selection": module(
            bool(has_selected_course and signup.matches_released_at and before_observation_deadline
                 and not confirmed_assignment_exists),
            "Select a course first." if not has_selected_course
            else "The observation deadline has passed." if not before_observation_deadline
            else "An observer has already been confirmed." if confirmed_assignment_exists
            else "The committee has not released matched observers.",
        ),
        "observation_record": module(
            confirmed_assignment_exists or observer_assignment_exists,
            "No confirmed observation assignment is available.",
        ),
        "survey": module(
            signed_observation_exists and before_survey_deadline,
            "Complete and sign the observation first." if not signed_observation_exists
            else "The survey deadline has passed.",
        ),
    }

    return Response({
        "cycle": {
            "id": cycle.pk,
            "name": cycle.semester,
            "signup_deadline": cycle.signup_deadline,
            "observation_deadline": cycle.observation_deadline,
            "survey_deadline": cycle.survey_deadline,
        },
        "evaluation_status": evaluation_status,
        "evaluation_status_reason": evaluation_status_reason,
        "evaluation_status_details": evaluation,
        "is_registered": is_registered,
        "has_selected_course": has_selected_course,
        "selected_course": (
            CourseSerializer(signup.course).data if has_selected_course else None
        ),
        "unread_notifications": unread_count,
        "incoming_requests": incoming_count,
        "modules": modules,
    })


@api_view(["GET"])
def my_notifications(request):
    """S03: Return only the current user's notifications, newest first."""
    professor = get_current_professor(request)
    notifications = Notification.objects.filter(user=professor).order_by(
        "-created_at", "-notification_id"
    )
    return Response({
        "unread_count": notifications.filter(is_read=False).count(),
        "notifications": NotificationSerializer(notifications, many=True).data,
    })


@api_view(["PATCH"])
def mark_notification_read(request, notification_id):
    """S03: Mark a notification owned by the current user as read."""
    professor = get_current_professor(request)
    notification = get_object_or_404(
        Notification, notification_id=notification_id, user=professor
    )
    if not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=["is_read"])
    return Response(NotificationSerializer(notification).data)


@api_view(["POST"])
def mark_all_notifications_read(request):
    """S03: Bulk-mark only the current user's unread notifications."""
    professor = get_current_professor(request)
    updated_count = Notification.objects.filter(
        user=professor, is_read=False
    ).update(is_read=True)
    return Response({"updated_count": updated_count, "unread_count": 0})


# --- Observer matching and invitations: committee approved candidate workflow ---
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
from .models import Invitation, ProposedDate, Pairing, MatchCandidate
from .serializers import (
    CandidateApprovalSerializer, InvitationCreateSerializer,
    InvitationResponseSerializer, PairingConfirmSerializer,
)


def require_committee(user):
    if not (user.is_superuser or user.is_staff or user.role == "admin"):
        raise PermissionDenied("Assessment Committee permissions required.")

@api_view(["GET", "PATCH"])
def committee_cycle_dates(request):
    """
    Read or update the active evaluation cycle's dates.
    Only Assessment Committee members may access this endpoint.
    """
    person = get_current_professor(request)
    require_committee(person)

    cycle = get_current_cycle()

    date_fields = [
        "start_date",
        "end_date",
        "signup_deadline",
        "observation_deadline",
        "survey_deadline",
    ]

    if request.method == "PATCH":
        serializer = CycleDatesUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updates = serializer.validated_data

        if not updates:
            raise ValidationError({
                "detail": "Provide at least one date to update."
            })

        # Validate the complete date range, including unchanged values.
        proposed_start = updates.get("start_date", cycle.start_date)
        proposed_end = updates.get("end_date", cycle.end_date)

        if proposed_start > proposed_end:
            raise ValidationError({
                "end_date": "The cycle end date cannot be before its start date."
            })

        proposed_signup_deadline = updates.get(
            "signup_deadline",
            cycle.signup_deadline,
        )

        if proposed_signup_deadline < proposed_start:
            raise ValidationError({
                "signup_deadline": (
                    "The registration deadline cannot be before the cycle start date."
                )
            })

        for field, value in updates.items():
            setattr(cycle, field, value)

        cycle.save(update_fields=list(updates.keys()))

    return Response({
        "cycle_id": cycle.pk,
        "cycle_name": cycle.semester,
        "status": cycle.status,
        "start_date": cycle.start_date,
        "end_date": cycle.end_date,
        "signup_deadline": cycle.signup_deadline,
        "observation_deadline": cycle.observation_deadline,
        "survey_deadline": cycle.survey_deadline,
    })

@api_view(["GET", "PATCH"])
def signup_availability(request):
    """
    Read or save the signed-in observee's proposed observation dates.
    Availability is stored in the existing Signup.availability text field.
    """
    professor = get_current_professor(request)
    cycle = get_current_cycle()

    signup = get_object_or_404(
        Signup.objects.select_related("course", "cycle"),
        user=professor,
        cycle=cycle,
    )

    if request.method == "GET":
        try:
            saved_datetimes = json.loads(signup.availability or "[]")
            if not isinstance(saved_datetimes, list):
                saved_datetimes = []
        except (json.JSONDecodeError, TypeError):
            saved_datetimes = []

        return Response({
            "signup_id": signup.pk,
            "available_datetimes": saved_datetimes,
        })

    if not signup.course_id:
        raise ValidationError({
            "detail": "Select a course before saving observation availability."
        })

    serializer = SignupAvailabilitySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    proposed_datetimes = serializer.validated_data["available_datetimes"]

    now = timezone.now()

    for proposed_datetime in proposed_datetimes:
        if proposed_datetime <= now:
            raise ValidationError({
                "available_datetimes": "All proposed dates must be in the future."
            })

        if timezone.localtime(proposed_datetime).date() > cycle.observation_deadline:
            raise ValidationError({
                "available_datetimes": (
                    "Proposed dates must be on or before the observation deadline."
                )
            })

    # Store ISO-8601 values as JSON in the existing text field.
    signup.availability = json.dumps([
        value.isoformat() for value in proposed_datetimes
    ])
    signup.save(update_fields=["availability"])

    return Response({
        "signup_id": signup.pk,
        "available_datetimes": json.loads(signup.availability),
    })

def get_signup_for_current_cycle(user):
    return get_object_or_404(Signup, cycle=get_current_cycle(), user=user)


def send_workflow_notification(user, title, message, destination):
    return Notification.objects.create(
        user=user, title=title, message=message, type="invitation",
        destination=destination,
    )


def invitation_json(inv):
    return {
        "invitation_id": inv.pk,
        "cycle_id": inv.cycle_id,
        "sender_id": inv.sender_id,
        "recipient_id": inv.recipient_id,
        "course_id": inv.course_id,
        "sender": ProfessorSerializer(inv.sender).data,
        "course": CourseSerializer(inv.course).data,
        "status": (
            "expired"
            if inv.status == "pending"
            and inv.expires_at
            and timezone.now() >= inv.expires_at
            else inv.status
        ),
        "created_at": inv.created_at,
        "expires_at": inv.expires_at,
        "responded_at": inv.responded_at,
        "proposed_dates": [
            {
                "proposed_date_id": date.pk,
                "datetime": date.proposed_datetime,
                "status": date.status,
            }
            for date in inv.proposed_dates.all().order_by("proposed_datetime")
        ],
    }


@api_view(["GET"])
def committee_candidate_pool(request, signup_id):
    """Committee pre-screening only; does NOT assert full eligibility."""
    person = get_current_professor(request)
    require_committee(person)
    signup = get_object_or_404(Signup.objects.select_related("user", "course"), pk=signup_id, cycle=get_current_cycle())
    if not signup.course_id:
        raise ValidationError({"detail": "Observee has not selected a course."})
    people = User.objects.filter(is_active=True, role="faculty", department_id=signup.course.department_id).exclude(pk=signup.user_id).order_by("id")
    return Response({
        "signup_id": signup.pk,
        "screening_only": True,
        "warning": "Review academic rank, course-level rules, recent teaching history and scheduling conflicts manually before approval.",
        "candidates": [
            {"id": u.pk, "name": u.get_full_name() or u.username, "academic_level": u.academic_level, "department_id": u.department_id}
            for u in people
        ],
        "released_observer_ids": list(
            MatchCandidate.objects.filter(signup=signup)
            .values_list("observer_id", flat=True)
        ),
        "matches_released_at": signup.matches_released_at,
    })


@api_view(["POST"])
def committee_release_candidates(request, signup_id):
    """A committee member approves/replaces up to five candidates for one signup."""
    person = get_current_professor(request)
    require_committee(person)
    data = CandidateApprovalSerializer(data=request.data)
    data.is_valid(raise_exception=True)
    cycle = get_current_cycle()
    with transaction.atomic():
        signup = get_object_or_404(Signup.objects.select_for_update(), pk=signup_id, cycle=cycle)
        if not signup.course_id:
            raise ValidationError({"detail": "Observee must select a course first."})
        if Pairing.objects.filter(cycle=cycle, observee=signup.user, status="confirmed").exists():
            raise ValidationError({"detail": "This observee already has a confirmed pairing."})
        if Invitation.objects.filter(cycle=cycle, sender=signup.user).exists():
            raise ValidationError({"detail": "Cannot replace matches after invitations have been sent."})
        ids = data.validated_data["observer_ids"]
        faculty = list(User.objects.filter(pk__in=ids, is_active=True, role="faculty", department_id=signup.course.department_id))
        if len(faculty) != len(ids) or signup.user_id in ids:
            raise ValidationError({"detail": "Every observer must be an active, different faculty member from the same department."})
        MatchCandidate.objects.filter(signup=signup).delete()
        MatchCandidate.objects.bulk_create([MatchCandidate(signup=signup, observer_id=i) for i in ids])
        signup.matches_released_at = timezone.now()
        signup.save(update_fields=["matches_released_at"])
        send_workflow_notification(signup.user, "Observer candidates available", "Your observer candidates are ready for selection.", "/observer-selection")
    return Response({"signup_id": signup.pk, "released": True, "observer_ids": ids})


@api_view(["GET"])
def my_matched_candidates(request):
    user = get_current_professor(request)
    signup = get_signup_for_current_cycle(user)
    if not signup.matches_released_at:
        return Response({"released": False, "candidates": [], "warning": "Committee has not released observer candidates."})
    approved = MatchCandidate.objects.filter(signup=signup).select_related("observer", "observer__department")
    return Response({
        "released": True, "fewer_than_five": approved.count() < 5,
        "candidates": [{"id": item.observer_id, "name": item.observer.get_full_name() or item.observer.username,
                        "department": item.observer.department.name if item.observer.department_id else None,
                        "academic_level": item.observer.academic_level} for item in approved],
    })


@api_view(["POST"])
def send_invitation(request):
    sender = get_current_professor(request)
    cycle = get_current_cycle()
    data = InvitationCreateSerializer(data=request.data)
    data.is_valid(raise_exception=True)
    observer_id = data.validated_data["observer_id"]
    dates = data.validated_data["proposed_datetimes"]
    now = timezone.now()
    if timezone.localdate() > cycle.observation_deadline:
        raise ValidationError({"detail": "Observation deadline has passed."})
    if any(d <= now or timezone.localtime(d).date() > cycle.observation_deadline for d in dates):
        raise ValidationError({"detail": "Dates must be future dates no later than the observation deadline."})
    with transaction.atomic():
        signup = get_object_or_404(Signup.objects.select_for_update(), user=sender, cycle=cycle)
        if not signup.course_id or not signup.matches_released_at:
            raise ValidationError({"detail": "A selected course and released candidates are required."})
        if not MatchCandidate.objects.filter(signup=signup, observer_id=observer_id).exists():
            raise PermissionDenied("Observer is not in your released candidate list.")
        if Pairing.objects.filter(cycle=cycle, observee=sender, status="confirmed").exists():
            raise ValidationError({"detail": "Already finalized an observer."})
        if Invitation.objects.filter(cycle=cycle, sender=sender, recipient_id=observer_id).exists():
            raise ValidationError({"detail": "An invitation to this observer already exists this cycle."})
        inv = Invitation.objects.create(cycle=cycle, sender=sender, recipient_id=observer_id,
                                        course=signup.course, expires_at=now + timedelta(hours=48))
        ProposedDate.objects.bulk_create([ProposedDate(invitation=inv, proposed_datetime=d) for d in dates])
        send_workflow_notification(inv.recipient, "Observation invitation", "You have a new observation request.", f"/observer-requests/{inv.pk}")
    return Response(invitation_json(inv), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def my_sent_invitations(request):
    user = get_current_professor(request)
    invs = (
        Invitation.objects
        .filter(sender=user, cycle=get_current_cycle())
        .select_related("sender", "course", "course__department")
        .prefetch_related("proposed_dates")
    )
    return Response([invitation_json(inv) for inv in invs])


@api_view(["GET"])
def my_received_invitations(request):
    user = get_current_professor(request)
    invs = (
        Invitation.objects
        .filter(recipient=user, cycle=get_current_cycle())
        .select_related("sender", "course", "course__department")
        .prefetch_related("proposed_dates")
    )
    return Response([invitation_json(inv) for inv in invs])


@api_view(["POST"])
def respond_to_invitation(request, invitation_id):
    user = get_current_professor(request)
    data = InvitationResponseSerializer(data=request.data)
    data.is_valid(raise_exception=True)
    with transaction.atomic():
        inv = get_object_or_404(Invitation.objects.select_for_update(), pk=invitation_id, recipient=user, cycle=get_current_cycle())
        if inv.status != "pending" or not inv.expires_at or timezone.now() >= inv.expires_at:
            raise ValidationError({"detail": "Invitation is closed or expired."})
        if data.validated_data["action"] == "accept":
            date = get_object_or_404(ProposedDate, pk=data.validated_data["proposed_date_id"], invitation=inv)
            if date.proposed_datetime <= timezone.now():
                raise ValidationError({"detail": "The selected date is in the past."})
            date.status = "accepted"
            date.save(update_fields=["status"])
            inv.status = "accepted"
        else:
            inv.status = "declined"
        inv.responded_at = timezone.now()
        inv.save(update_fields=["status", "responded_at"])
        send_workflow_notification(inv.sender, "Invitation response", f"An observer {inv.status} your invitation.", "/observer-selection")
    return Response(invitation_json(inv))


@api_view(["POST"])
def confirm_pairing(request):
    observee = get_current_professor(request)
    data = PairingConfirmSerializer(data=request.data)
    data.is_valid(raise_exception=True)
    cycle = get_current_cycle()
    with transaction.atomic():
        signup = get_object_or_404(Signup.objects.select_for_update(), user=observee, cycle=cycle)
        inv = get_object_or_404(Invitation.objects.select_for_update(), pk=data.validated_data["invitation_id"], sender=observee, cycle=cycle)
        if not signup.course_id or inv.course_id != signup.course_id or inv.status != "accepted":
            raise ValidationError({"detail": "The invitation must be accepted for the selected course."})
        if Pairing.objects.filter(cycle=cycle, observee=observee, status="confirmed").exists():
            raise ValidationError({"detail": "An observer has already been finalized."})
        date = inv.proposed_dates.filter(status="accepted").first()
        if date is None or date.proposed_datetime <= timezone.now():
            raise ValidationError({"detail": "No valid accepted future date."})
        pairing = Pairing.objects.create(cycle=cycle, observee=observee, observer=inv.recipient,
                                          course=inv.course, status="confirmed", confirmed_datetime=date.proposed_datetime)
        inv.status = "confirmed"
        inv.save(update_fields=["status"])
        other_invitations = list(Invitation.objects.filter(
            cycle=cycle, sender=observee, status__in=["pending", "accepted"]
        ).exclude(pk=inv.pk))
        Invitation.objects.filter(pk__in=[other.pk for other in other_invitations]).update(status="closed")
        for other in other_invitations:
            send_workflow_notification(other.recipient, "Invitation closed",
                                       "The observee confirmed another observer.", "/observer-requests")
        send_workflow_notification(inv.recipient, "Observation confirmed", "Your observation assignment has been confirmed.", "/observer-assignments")
    return Response({"pairing_id": pairing.pk, "observer_id": pairing.observer_id,
                     "course_id": pairing.course_id, "confirmed_datetime": pairing.confirmed_datetime}, status=status.HTTP_201_CREATED)


# --- E03/O03: observation records ---
from django.db.models import Q
from .models import Observation, Template
from .serializers import (
    ObservationCreateSerializer, ObservationDraftSerializer, ObservationCancelSerializer,
)


def _observation_for_participant(user, observation_id, lock=False):
    qs = Observation.objects.select_related(
        "pairing", "pairing__observer", "pairing__observee",
        "pairing__course", "pairing__course__department", "template",
    ).filter(Q(pairing__observer=user) | Q(pairing__observee=user))
    if lock:
        qs = qs.select_for_update()
    return get_object_or_404(qs, pk=observation_id)


def _template_questions(template):
    questions = getattr(template, "questions", None)
    if not isinstance(questions, list) or not questions:
        raise ValidationError({"detail": "Template has no question definitions. Configure and publish its questions before use."})
    if any(not isinstance(q, dict) or not str(q.get("id", "")).strip() for q in questions):
        raise ValidationError({"detail": "Each form question must have an id."})
    if len({str(q["id"]) for q in questions}) != len(questions):
        raise ValidationError({"detail": "Template question IDs must be unique."})
    return questions


def _check_form_answers(template, responses, require_all=False):
    """Expected template questions: {id, text, type: rating|text, required, min, max}."""
    questions = _template_questions(template)
    allowed = {str(q["id"]): q for q in questions}
    errors = {}
    for key, answer in responses.items():
        q = allowed.get(key)
        if q is None:
            errors[key] = "Not a question in this template version."
            continue
        if answer is None or answer == "":
            if require_all and q.get("required", False):
                errors[key] = "Required."
            continue
        kind = q.get("type", "text")
        if kind == "rating":
            if type(answer) not in (int, float) or isinstance(answer, bool):
                errors[key] = "Must be numeric."
            elif (q.get("min") is not None and answer < q["min"]) or (q.get("max") is not None and answer > q["max"]):
                errors[key] = "Rating outside permitted range."
        elif kind == "text":
            if not isinstance(answer, str):
                errors[key] = "Must be text."
        else:
            errors[key] = "Unsupported question type."
    if require_all:
        for key, q in allowed.items():
            if q.get("required", False) and (key not in responses or responses[key] is None or responses[key] == ""):
                errors[key] = "Required."
    if errors:
        raise ValidationError({"responses": errors})


def _can_sign(observation, user):
    pairing = observation.pairing
    if pairing.status != "confirmed" or observation.status == "cancelled":
        return False
    if pairing.confirmed_datetime is None or pairing.confirmed_datetime > timezone.now():
        return False
    if observation.observer_signed and observation.observee_signed:
        return False
    if user.pk == pairing.observer_id:
        return not observation.observer_signed
    if user.pk == pairing.observee_id:
        return observation.observer_signed and not observation.observee_signed
    return False


def _observation_json(observation, user):
    pairing = observation.pairing
    try:
        questions = _template_questions(observation.template)
    except ValidationError:
        questions = []  # Old sample templates may have no form configuration yet.
    is_observer = user.pk == pairing.observer_id
    locked = observation.observer_signed and observation.observee_signed
    return {
        "observation_id": observation.pk,
        "pairing_id": pairing.pk,
        "cycle_id": pairing.cycle_id,
        "observer": {"id": pairing.observer_id, "name": pairing.observer.get_full_name() or pairing.observer.username},
        "observee": {"id": pairing.observee_id, "name": pairing.observee.get_full_name() or pairing.observee.username},
        "course": CourseSerializer(pairing.course).data,
        "confirmed_datetime": pairing.confirmed_datetime,
        "template": {"id": observation.template_id, "name": observation.template.name,
                     "version": observation.template.version,
                     "instructions": getattr(observation.template, "instructions", ""),
                     "questions": questions},
        "responses": observation.responses,
        "status": observation.status,
        "cancellation_reason": observation.cancellation_reason,
        "observer_signed": observation.observer_signed,
        "observer_signed_at": observation.observer_signed_at,
        "observee_signed": observation.observee_signed,
        "observee_signed_at": observation.observee_signed_at,
        "locked": locked,
        "can_edit": is_observer and not observation.observer_signed and not locked and observation.status != "cancelled",
        "can_sign": _can_sign(observation, user),
        "can_cancel": pairing.status == "confirmed" and not locked and observation.status != "cancelled",
    }


@api_view(["GET", "POST"])
def observations_collection(request):
    """List my records, or create a draft for an assigned pairing."""
    user = get_current_professor(request)
    if request.method == "GET":
        records = Observation.objects.filter(
            Q(pairing__observer=user) | Q(pairing__observee=user)
        ).select_related("pairing", "pairing__observer", "pairing__observee",
                         "pairing__course", "pairing__course__department", "template").order_by("-observation_id")
        return Response([_observation_json(o, user) for o in records])

    serializer = ObservationCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        pairing = get_object_or_404(Pairing.objects.select_for_update(),
                                    pk=serializer.validated_data["pairing_id"], observer=user, status="confirmed")
        template = get_object_or_404(Template, pk=serializer.validated_data["template_id"])
        if template.type.lower() not in ("observation", "evaluation"):
            raise ValidationError({"detail": "A published observation/evaluation template is required."})
        if hasattr(template, "status") and template.status != "published":
            raise ValidationError({"detail": "The form template must be published."})
        _template_questions(template)
        # Prevent creating multiple evaluation records for one pairing through this API.
        existing = Observation.objects.filter(pairing=pairing).first()
        if existing:
            if existing.template_id != template.pk:
                raise ValidationError({"detail": "This pairing already has a record using another template version."})
            return Response(_observation_json(existing, user), status=status.HTTP_200_OK)
        observation = Observation.objects.create(pairing=pairing, template=template, status="draft")
    return Response(_observation_json(observation, user), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
def observation_detail(request, observation_id):
    user = get_current_professor(request)
    if request.method == "GET":
        observation = _observation_for_participant(user, observation_id)
        return Response(_observation_json(observation, user))

    serializer = ObservationDraftSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        observation = _observation_for_participant(user, observation_id, lock=True)
        if observation.pairing.observer_id != user.pk:
            raise PermissionDenied("Only the assigned observer may edit evaluation answers.")
        if observation.observer_signed or observation.observee_signed or observation.status == "cancelled":
            raise ValidationError({"detail": "This record can no longer be edited."})
        _check_form_answers(observation.template, serializer.validated_data["responses"])
        observation.responses = serializer.validated_data["responses"]
        observation.save(update_fields=["responses"])
    return Response(_observation_json(observation, user))


@api_view(["POST"])
def sign_observation(request, observation_id):
    user = get_current_professor(request)
    with transaction.atomic():
        observation = _observation_for_participant(user, observation_id, lock=True)
        if not _can_sign(observation, user):
            raise ValidationError({"detail": "Signing is not available yet, or this signature already exists. The visit must have occurred."})
        if observation.pairing.observer_id == user.pk:
            _check_form_answers(observation.template, observation.responses, require_all=True)
            observation.observer_signed = True
            observation.observer_signed_at = timezone.now()
            observation.status = "awaiting_observee_signature"
            observation.save(update_fields=["observer_signed", "observer_signed_at", "status"])
            send_workflow_notification(observation.pairing.observee, "Observation ready to sign",
                                       "The observer submitted the evaluation record.", f"/observations/{observation.pk}")
        else:
            observation.observee_signed = True
            observation.observee_signed_at = timezone.now()
            observation.status = "completed"
            observation.save(update_fields=["observee_signed", "observee_signed_at", "status"])
            send_workflow_notification(observation.pairing.observer, "Observation completed",
                                       "Both participants have signed the observation record.", f"/observations/{observation.pk}")
    return Response(_observation_json(observation, user))


@api_view(["POST"])
def cancel_observation(request, observation_id):
    user = get_current_professor(request)
    serializer = ObservationCancelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        observation = _observation_for_participant(user, observation_id, lock=True)
        if observation.observer_signed and observation.observee_signed:
            raise ValidationError({"detail": "A fully signed record cannot be cancelled."})
        if observation.status == "cancelled":
            raise ValidationError({"detail": "This record is already cancelled."})
        observation.status = "cancelled"
        observation.cancellation_reason = serializer.validated_data["reason"]
        observation.save(update_fields=["status", "cancellation_reason"])
        # Alert the committee and record a due-list carry-forward signal. The actual
        # next-cycle scheduling workflow is not yet implemented.
        other_user = observation.pairing.observee if user.pk == observation.pairing.observer_id else observation.pairing.observer
        send_workflow_notification(other_user, "Observation reported incomplete",
                                   "The observation has been reported as not completed.", f"/observations/{observation.pk}")
        for member in User.objects.filter(is_active=True).filter(Q(role="admin") | Q(is_staff=True) | Q(is_superuser=True)).distinct():
            send_workflow_notification(member, "Observation cancellation alert",
                                       f"Observation {observation.pk} was cancelled: {observation.cancellation_reason}",
                                       f"/committee/observations/{observation.pk}")
    return Response(_observation_json(observation, user))


# --- E04/O04: surveys ---
from .models import Survey
from .serializers import SurveySubmitSerializer


def _survey_role(pairing, user):
    if user.pk == pairing.observer_id:
        return "observer"
    if user.pk == pairing.observee_id:
        return "observee"
    raise PermissionDenied("You are not assigned to this observation.")


def _survey_json(survey):
    pairing = survey.pairing
    template = survey.template
    return {
        "survey_id": survey.pk,
        "pairing_id": pairing.pk,
        "cycle_id": pairing.cycle_id,
        "respondent_id": survey.respondent_id,
        "respondent_type": survey.respondent_type,
        "observer": {"id": pairing.observer_id, "name": pairing.observer.get_full_name() or pairing.observer.username},
        "observee": {"id": pairing.observee_id, "name": pairing.observee.get_full_name() or pairing.observee.username},
        "course": CourseSerializer(pairing.course).data,
        "observation_datetime": pairing.confirmed_datetime,
        "template": None if template is None else {
            "id": template.pk, "name": template.name, "version": template.version,
            "instructions": getattr(template, "instructions", ""),
            "questions": getattr(template, "questions", []),
        },
        "score": survey.score,
        "pain_points": survey.pain_points,
        "improvements": survey.improvements,
        "survey_file": survey.survey_file,
        "submitted_at": survey.submitted_at,
        "status": "submitted" if survey.submitted_at else "draft",
    }


def _survey_queryset(user):
    return Survey.objects.filter(respondent=user).select_related(
        "pairing", "pairing__observer", "pairing__observee", "pairing__course",
        "pairing__course__department", "template",
    )


@api_view(["GET", "POST"])
def surveys_collection(request):
    """GET own submitted surveys; POST own survey once per confirmed pairing."""
    user = get_current_professor(request)
    if request.method == "GET":
        return Response([_survey_json(s) for s in _survey_queryset(user).order_by("-survey_id")])

    # Pairing ID and survey answers are submitted together. Other participants'
    # survey data is never exposed by this endpoint.
    payload = SurveySubmitSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    pairing_id = request.data.get("pairing_id")
    try:
        pairing_id = int(pairing_id)
    except (ValueError, TypeError):
        raise ValidationError({"pairing_id": "A valid pairing ID is required."})
    if pairing_id < 1:
        raise ValidationError({"pairing_id": "Must be positive."})

    with transaction.atomic():
        pairing = get_object_or_404(
            Pairing.objects.select_for_update().select_related("cycle", "observer", "observee", "course"),
            pk=pairing_id,
        )
        role = _survey_role(pairing, user)
        if pairing.status != "confirmed":
            raise ValidationError({"detail": "Pairing is not confirmed."})
        if timezone.localdate() > pairing.cycle.survey_deadline:
            raise ValidationError({"detail": "The survey deadline has passed."})
        if not Observation.objects.filter(
            pairing=pairing, status="completed", observer_signed=True, observee_signed=True,
        ).exists():
            raise ValidationError({"detail": "The observation must be completed and signed by both participants."})
        if Survey.objects.filter(pairing=pairing, respondent_type=role).exists():
            raise ValidationError({"detail": "Your survey for this assignment was already submitted."})
        template = get_object_or_404(Template, pk=payload.validated_data["template_id"])
        if template.type.lower() != "survey" or template.status != "published":
            raise ValidationError({"template_id": "Select a published survey template."})
        # Fixed MVP survey fields; questions must agree with the score/pain_points/improvements schema.
        survey = Survey.objects.create(
            pairing=pairing,
            respondent=user,
            respondent_type=role,
            template=template,
            score=payload.validated_data["score"],
            pain_points=payload.validated_data.get("pain_points", ""),
            improvements=payload.validated_data.get("improvements", ""),
            submitted_at=timezone.now(),
        )
    return Response(_survey_json(survey), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def survey_detail(request, survey_id):
    user = get_current_professor(request)
    survey = get_object_or_404(_survey_queryset(user), pk=survey_id)
    return Response(_survey_json(survey))

# --- A05/A06: Assessment Committee pending records and surveys ---

@api_view(["GET"])
def committee_pending_records(request):
    member = get_current_professor(request)
    require_committee(member)
    cycle = get_current_cycle()
    rows = []
    pairings = Pairing.objects.filter(cycle=cycle, status="confirmed").select_related(
        "observee", "observee__department", "observer", "course"
    ).prefetch_related("observations").order_by("pairing_id")
    for pairing in pairings:
        # Only past visits should be considered actionable missing records.
        if not pairing.confirmed_datetime or pairing.confirmed_datetime > timezone.now():
            continue
        records = list(pairing.observations.all())
        record = records[0] if records else None
        if record and record.status in ("completed", "cancelled"):
            continue
        if not record or not record.observer_signed:
            missing = "observer_submission"
            person = pairing.observer
        elif not record.observee_signed:
            missing = "observee_signature"
            person = pairing.observee
        else:
            continue
        rows.append({
            "pairing_id": pairing.pk,
            "observation_id": record.pk if record else None,
            "observation_datetime": pairing.confirmed_datetime,
            "observee_id": pairing.observee_id,
            "observee_name": pairing.observee.get_full_name() or pairing.observee.username,
            "department": pairing.observee.department.name if pairing.observee.department_id else None,
            "academic_rank": pairing.observee.academic_level,
            "observer_id": pairing.observer_id,
            "missing": missing,
            "action_required_by_user_id": person.pk,
        })
    return Response({"cycle_id": cycle.pk, "count": len(rows), "records": rows})


@api_view(["POST"])
def committee_remind_record(request, pairing_id):
    member = get_current_professor(request)
    require_committee(member)
    pairing = get_object_or_404(Pairing, pk=pairing_id, cycle=get_current_cycle(), status="confirmed")
    if not pairing.confirmed_datetime or pairing.confirmed_datetime > timezone.now():
        raise ValidationError({"detail": "The scheduled observation has not happened yet."})
    record = Observation.objects.filter(pairing=pairing).order_by("observation_id").first()
    if record and record.status in ("completed", "cancelled"):
        raise ValidationError({"detail": "There is no outstanding record for this pairing."})
    if not record or not record.observer_signed:
        person, missing = pairing.observer, "observer_submission"
    elif not record.observee_signed:
        person, missing = pairing.observee, "observee_signature"
    else:
        raise ValidationError({"detail": "There is no outstanding signature."})
    send_workflow_notification(person, "Observation record reminder",
                               "Please complete your pending observation record or signature.",
                               f"/observations/{record.pk}" if record else "/observations")
    return Response({"pairing_id": pairing.pk, "reminded_user_id": person.pk, "missing": missing})


@api_view(["GET"])
def committee_pending_surveys(request):
    member = get_current_professor(request)
    require_committee(member)
    cycle = get_current_cycle()
    completed = []
    missing = []
    observations = Observation.objects.filter(
        pairing__cycle=cycle, pairing__status="confirmed",
        status="completed", observer_signed=True, observee_signed=True,
    ).select_related("pairing", "pairing__observer", "pairing__observee").order_by("observation_id")
    for observation in observations:
        pairing = observation.pairing
        surveys = {s.respondent_type: s for s in Survey.objects.filter(pairing=pairing)}
        for role, person in (("observer", pairing.observer), ("observee", pairing.observee)):
            response = surveys.get(role)
            item = {
                "pairing_id": pairing.pk,
                "observation_id": observation.pk,
                "observation_datetime": pairing.confirmed_datetime,
                "user_id": person.pk,
                "faculty_name": person.get_full_name() or person.username,
                "department": person.department.name if person.department_id else None,
                "academic_rank": person.academic_level,
                "respondent_type": role,
                "survey_deadline": cycle.survey_deadline,
            }
            if response and response.submitted_at:
                completed.append({**item, "survey_id": response.pk, "submitted_at": response.submitted_at})
            else:
                missing.append(item)
    return Response({"cycle_id": cycle.pk, "missing_count": len(missing),
                     "completed_count": len(completed), "missing": missing, "completed": completed})


@api_view(["POST"])
def committee_remind_survey(request, pairing_id, role):
    member = get_current_professor(request)
    require_committee(member)
    if role not in ("observer", "observee"):
        raise ValidationError({"role": "Must be observer or observee."})
    pairing = get_object_or_404(Pairing, pk=pairing_id, cycle=get_current_cycle(), status="confirmed")
    if not Observation.objects.filter(pairing=pairing, status="completed",
                                       observer_signed=True, observee_signed=True).exists():
        raise ValidationError({"detail": "Surveys are not yet due for this pairing."})
    if Survey.objects.filter(pairing=pairing, respondent_type=role, submitted_at__isnull=False).exists():
        raise ValidationError({"detail": "This participant already submitted a survey."})
    person = pairing.observer if role == "observer" else pairing.observee
    send_workflow_notification(person, "Post-observation survey reminder",
                               "Please complete your post-observation survey.", "/surveys")
    return Response({"pairing_id": pairing.pk, "respondent_type": role, "reminded_user_id": person.pk})


# A04 — Assessment Committee faculty roster and communications
from django.db.models import Q
from .serializers import FacultyRankUpdateSerializer, FacultyReminderSerializer


def _faculty_rows(cycle, *, unregistered_only=False, search="", sort="name"):
    """Return current-cycle faculty with their signup/course data."""
    users = User.objects.filter(role="faculty", is_active=True).select_related("department")
    if search:
        users = users.filter(
            Q(first_name__icontains=search) | Q(last_name__icontains=search)
            | Q(username__icontains=search)
        )
    signup_by_user = {
        row.user_id: row
        for row in Signup.objects.filter(cycle=cycle).select_related("course", "course__department")
    }
    rows = []
    for person in users:
        signup = signup_by_user.get(person.pk)
        if unregistered_only and signup is not None:
            continue
        if signup is None:
            progress = "not_registered"
        elif signup.course_id is None:
            progress = "registered_no_course"
        else:
            progress = "course_selected"
        eval_state = evaluation_status_for(person, cycle)
        rows.append({
            "evaluation_status": eval_state["status"],
            "evaluation_status_details": eval_state,
            "user_id": person.pk,
            "username": person.username,
            "name": person.get_full_name() or person.username,
            "department": person.department.name if person.department_id else None,
            "department_id": person.department_id,
            "academic_rank": person.academic_level,
            "email": person.email,
            "last_evaluated_semester": person.last_evaluated_semester or None,
            "last_evaluated_year": person.last_evaluated_year,
            "signup_id": signup.pk if signup else None,
            "registered": signup is not None,
            "progress_status": progress,
            "signup_status": signup.status if signup else None,
            "course": CourseSerializer(signup.course).data if signup and signup.course_id else None,
        })
    sort_keys = {
        "name": lambda r: (r["name"].casefold(), r["user_id"]),
        "department": lambda r: ((r["department"] or "").casefold(), r["name"].casefold()),
        "rank": lambda r: ((r["academic_rank"] or "").casefold(), r["name"].casefold()),
        "status": lambda r: (r["progress_status"], r["name"].casefold()),
    }
    rows.sort(key=sort_keys[sort])
    return rows


def _faculty_query_params(request):
    search = request.query_params.get("search", "").strip()
    sort = request.query_params.get("sort", "name")
    if len(search) > 100:
        raise ValidationError({"search": "Search must be at most 100 characters."})
    if sort not in ("name", "department", "rank", "status"):
        raise ValidationError({"sort": "Choose name, department, rank, or status."})
    return search, sort


@api_view(["GET"])
def committee_faculty(request):
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    search, sort = _faculty_query_params(request)
    rows = _faculty_rows(cycle, search=search, sort=sort)
    return Response({
        "cycle_id": cycle.pk,
        "cycle_name": cycle.semester,
        "count": len(rows),
        "registered_count": sum(r["registered"] for r in rows),
        "course_selected_count": sum(r["progress_status"] == "course_selected" for r in rows),
        "faculty": rows,
    })


@api_view(["GET"])
def committee_unregistered_faculty(request):
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    search, sort = _faculty_query_params(request)
    rows = _faculty_rows(cycle, unregistered_only=True, search=search, sort=sort)
    return Response({"cycle_id": cycle.pk, "count": len(rows), "faculty": rows})


@api_view(["PATCH"])
def committee_update_faculty_rank(request, user_id):
    require_committee(get_current_professor(request))
    person = get_object_or_404(User, pk=user_id, role="faculty")
    serializer = FacultyRankUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    person.academic_level = serializer.validated_data["academic_rank"]
    person.save(update_fields=["academic_level"])
    return Response({
        "user_id": person.pk,
        "academic_rank": person.academic_level,
        "evaluation_status": evaluation_status_for(person, get_current_cycle())["status"],
        "evaluation_status_details": evaluation_status_for(person, get_current_cycle()),
        "detail": "Recalculated using current rank; historical rank effective dates are not tracked.",
    })


@api_view(["POST"])
def committee_remind_unregistered(request):
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    serializer = FacultyReminderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    ids = serializer.validated_data["user_ids"]
    users = {
        user.pk: user for user in User.objects.filter(pk__in=ids, role="faculty", is_active=True)
    }
    invalid = [i for i in ids if i not in users]
    if invalid:
        raise ValidationError({"user_ids": f"Unknown or inactive faculty IDs: {invalid}"})
    registered = set(Signup.objects.filter(cycle=cycle, user_id__in=ids).values_list("user_id", flat=True))
    if registered:
        raise ValidationError({"user_ids": f"Already registered for this cycle: {sorted(registered)}"})
    # Validate all recipients before any notification is created.
    with transaction.atomic():
        for user_id in ids:
            Notification.objects.create(
                user=users[user_id],
                title="Evaluation cycle registration reminder",
                message=f"Please register for the {cycle.semester} evaluation cycle by {cycle.signup_deadline}.",
                type="registration_reminder",
                is_urgent=False,
                destination="/registration",
            )
    return Response({"cycle_id": cycle.pk, "reminded_user_ids": ids, "sent_count": len(ids)})

# A01 — Assessment Committee dashboard
@api_view(["GET"])
def committee_dashboard(request):
    """Current-cycle committee overview. Counts are derived from stored data."""
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    today = timezone.localdate()
    now = timezone.now()

    faculty = User.objects.filter(role="faculty", is_active=True)
    signups = Signup.objects.filter(cycle=cycle)
    registered_ids = signups.values_list("user_id", flat=True)
    unregistered_count = faculty.exclude(pk__in=registered_ids).count()
    registered_count = signups.filter(user__role="faculty", user__is_active=True).count()
    no_course_count = signups.filter(user__role="faculty", user__is_active=True, course__isnull=True).count()

    # An unreleased list is NOT proof that no eligible observers exist.
    awaiting_release = signups.filter(
        user__role="faculty", user__is_active=True,
        course__isnull=False, matches_released_at__isnull=True,
    ).count()
    released_with_zero = signups.filter(
        user__role="faculty", user__is_active=True,
        course__isnull=False, matches_released_at__isnull=False,
        match_candidates__isnull=True,
    ).count()

    pending_records = 0
    missing_observer_submissions = 0
    missing_observee_signatures = 0
    pending_surveys = 0
    submitted_surveys = 0
    expected_surveys = 0

    pairings = (Pairing.objects.filter(cycle=cycle, status="confirmed")
                .prefetch_related("observations", "surveys"))
    for pairing in pairings:
        records = sorted(pairing.observations.all(), key=lambda obs: obs.pk)
        record = records[0] if records else None
        if (pairing.confirmed_datetime and pairing.confirmed_datetime <= now
                and (not record or record.status not in ("completed", "cancelled"))):
            if not record or not record.observer_signed:
                pending_records += 1
                missing_observer_submissions += 1
            elif not record.observee_signed:
                pending_records += 1
                missing_observee_signatures += 1
        if record and record.status == "completed" and record.observer_signed and record.observee_signed:
            expected_surveys += 2
            submitted_roles = {s.respondent_type for s in pairing.surveys.all() if s.submitted_at is not None}
            submitted_surveys += len(submitted_roles & {"observer", "observee"})
            pending_surveys += 2 - len(submitted_roles & {"observer", "observee"})

    evaluated_faculty = [evaluation_status_for(person, cycle) for person in faculty]
    due_count = sum(e["status"] == "due" for e in evaluated_faculty)
    overdue_count = sum(e["status"] == "overdue" for e in evaluated_faculty)
    undetermined_count = sum(e["status"] == "undetermined" for e in evaluated_faculty)

    alerts = []
    if unregistered_count:
        alerts.append({"code": "unregistered_faculty", "message": f"{unregistered_count} active faculty have not registered for this cycle.", "count": unregistered_count, "destination": "/committee/faculty"})
    if no_course_count:
        alerts.append({"code": "registered_no_course", "message": f"{no_course_count} registered faculty have not selected a course.", "count": no_course_count, "destination": "/committee/faculty"})
    if awaiting_release:
        alerts.append({"code": "unreleased_candidate_lists", "message": f"{awaiting_release} course signups are awaiting candidate-list release.", "count": awaiting_release, "destination": "/committee/matching"})
    if released_with_zero:
        alerts.append({"code": "released_zero_candidates", "message": f"{released_with_zero} released candidate lists contain no observers.", "count": released_with_zero, "destination": "/committee/unmatched"})
    if pending_records:
        alerts.append({"code": "pending_records", "message": f"{pending_records} observation records need attention.", "count": pending_records, "destination": "/committee/pending-records"})
    if pending_surveys:
        alerts.append({"code": "missing_surveys", "message": f"{pending_surveys} post-observation survey responses are missing.", "count": pending_surveys, "destination": "/committee/pending-surveys"})

    def module(available, reason=None):
        return {"available": bool(available), "reason": None if available else reason}

    matching_open = today > cycle.signup_deadline
    observation_deadline_passed = today > cycle.observation_deadline
    survey_deadline_passed = today > cycle.survey_deadline
    modules = {
        "observer_matching": module(matching_open, "Opens after the signup deadline."),
        "unmatched_observees": module(True),
        "observation_record_management": module(True),
        "pending_observation_records": module(True),
        "observation_surveys": module(True),
        "generated_kpis": module(True),
        "edit_forms": module(True),
    }

    return Response({
        "cycle": {
            "id": cycle.pk, "name": cycle.semester, "status": cycle.status,
            "signup_deadline": cycle.signup_deadline,
            "observation_deadline": cycle.observation_deadline,
            "survey_deadline": cycle.survey_deadline,
        },
        "phases": {
            "registration_closed": matching_open,
            "observation_deadline_passed": observation_deadline_passed,
            "survey_deadline_passed": survey_deadline_passed,
        },
        "modules": modules,
        "counts": {
            "active_faculty": faculty.count(),
            "registered_faculty": registered_count,
            "unregistered_faculty": unregistered_count,
            "registered_without_course": no_course_count,
            "awaiting_candidate_release": awaiting_release,
            "released_with_zero_candidates": released_with_zero,
            "pending_observation_records": pending_records,
            "missing_observer_submissions": missing_observer_submissions,
            "missing_observee_signatures": missing_observee_signatures,
            "missing_surveys": pending_surveys,
            "submitted_surveys": submitted_surveys,
            "expected_surveys": expected_surveys,
            "faculty_due": due_count,
            "faculty_overdue": overdue_count,
            "faculty_status_undetermined": undetermined_count,
            "unmatched_faculty": None,
        },
        "alerts": alerts,
        "limitations": [
            "Unregistered faculty are not necessarily due for an evaluation.",
            "Unreleased or empty candidate lists do not establish observer ineligibility.",
            "Due/Overdue currently uses calendar-year rank intervals; confirm official cutoff and rank-change effective-date policies.",
            "Faculty with missing rank or evaluation history are undetermined, not automatically overdue.",
            "True unmatched-faculty counts still require the approved eligibility rules.",
            "Phase status is derived from current cycle dates; module access still requires server-side permission checks.",
        ],
    })


# A03 — unmatched faculty and committee-approved carry-forward.
# Only zero released candidates are conclusively "unmatched" in this MVP.
from .models import EvaluationCarryForward
from .serializers import CarryForwardSerializer


def _unmatched_signup_rows(cycle):
    qs = (Signup.objects.filter(
        cycle=cycle, user__role="faculty", user__is_active=True,
        course__isnull=False, matches_released_at__isnull=False,
        match_candidates__isnull=True,
    ).select_related("user__department", "course__department")
      .order_by("user__last_name", "user__first_name", "signup_id"))
    already_paired = set(Pairing.objects.filter(
        cycle=cycle, status="confirmed"
    ).values_list("observee_id", flat=True))
    rows = []
    for signup in qs:
        if signup.user_id in already_paired:
            continue
        user = signup.user
        rows.append({
            "signup_id": signup.pk,
            "faculty_id": user.pk,
            "name": user.get_full_name() or user.username,
            "department": user.department.name if user.department_id else None,
            "academic_rank": user.academic_level,
            "course_id": signup.course_id,
            "course": str(signup.course),
            "eligible_observer_count": 0,
            "reason": "Committee released a candidate list with no eligible observers.",
            "already_carried_forward": EvaluationCarryForward.objects.filter(source_signup_id=signup.pk).exists(),
        })
    return rows


@api_view(["GET"])
def committee_unmatched_faculty(request):
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    next_cycles = list(Cycle.objects.filter(
        start_date__gt=cycle.start_date
    ).order_by("start_date", "pk").values("cycle_id", "semester", "start_date", "status"))
    return Response({
        "cycle_id": cycle.pk,
        "unmatched": _unmatched_signup_rows(cycle),
        "next_cycles": next_cycles,
        "scope_note": "Only released lists with zero candidates are included. Lists with 1-4 candidates can proceed; unreleased lists are not labeled unmatched.",
        "carry_forward_note": "Carry-forward flags the faculty member as due in the selected later cycle; it does not automatically create a registration or change historical observations.",
    })


@api_view(["POST"])
def committee_carry_forward(request):
    committee = get_current_professor(request)
    require_committee(committee)
    serializer = CarryForwardSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    ids = serializer.validated_data["signup_ids"]
    target_id = serializer.validated_data["target_cycle_id"]
    reason = serializer.validated_data["reason"]
    cycle = get_current_cycle()
    target = get_object_or_404(Cycle, pk=target_id)
    if target.start_date <= cycle.start_date:
        raise ValidationError({"target_cycle_id": "Target cycle must be after the current cycle."})
    # All-or-nothing: reject any ineligible selection without partial transfers.
    with transaction.atomic():
        signups = list(Signup.objects.select_for_update().filter(
            pk__in=ids, cycle=cycle
        ))
        if len(signups) != len(ids):
            raise ValidationError({"signup_ids": "One or more signups do not belong to the current cycle."})
        eligible = {r["signup_id"] for r in _unmatched_signup_rows(cycle)
                    if not r["already_carried_forward"]}
        if not set(ids).issubset(eligible):
            raise ValidationError({"signup_ids": "One or more signups are not eligible for carry-forward, or are already transferred."})
        for signup in signups:
            EvaluationCarryForward.objects.create(
                source_signup=signup, target_cycle=target,
                reason=reason, created_by=committee
            )
            Notification.objects.create(
                user=signup.user, title="Evaluation moved to next cycle",
                message=f"Your incomplete matching case will be due in {target.semester}. Reason: {reason}",
                type="carry_forward", is_urgent=True, destination="/profile",
            )
    return Response({
        "source_cycle_id": cycle.pk,
        "target_cycle_id": target.pk,
        "carried_forward_signup_ids": ids,
        "count": len(ids),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def committee_carry_forward_list(request):
    require_committee(get_current_professor(request))
    cycle = get_current_cycle()
    rows = EvaluationCarryForward.objects.filter(
        source_signup__cycle=cycle
    ).select_related("source_signup__user", "target_cycle", "created_by").order_by("pk")
    return Response({"carry_forwards": [{
        "id": item.pk,
        "faculty_id": item.source_signup.user_id,
        "faculty_name": item.source_signup.user.get_full_name() or item.source_signup.user.username,
        "source_signup_id": item.source_signup_id,
        "target_cycle_id": item.target_cycle_id,
        "target_cycle": item.target_cycle.semester,
        "reason": item.reason,
        "created_at": item.created_at,
        "created_by_id": item.created_by_id,
    } for item in rows]})


@api_view(["GET"])
def committee_carried_forward_due(request):
    """Read the next-cycle due list entries created by committee carry-forward decisions."""
    require_committee(get_current_professor(request))
    cycle_id = request.query_params.get("cycle_id")
    if not cycle_id or not cycle_id.isdecimal():
        raise ValidationError({"cycle_id": "Provide a numeric target cycle ID."})
    target = get_object_or_404(Cycle, pk=int(cycle_id))
    items = EvaluationCarryForward.objects.filter(target_cycle=target).select_related(
        "source_signup__user", "source_signup__cycle"
    ).order_by("pk")
    return Response({
        "cycle_id": target.pk,
        "cycle": target.semester,
        "due_from_carry_forward": [{
            "faculty_id": item.source_signup.user_id,
            "faculty_name": item.source_signup.user.get_full_name() or item.source_signup.user.username,
            "source_cycle_id": item.source_signup.cycle_id,
            "source_signup_id": item.source_signup_id,
            "reason": item.reason,
        } for item in items],
        "scope_note": "These are carry-forward due entries, not the full Due list derived from faculty ranks.",
    })


# A07 - committee KPI reporting (provisional definitions).
import csv
from django.http import HttpResponse
from .kpi_reporting import kpi_report

@api_view(["GET"])
def committee_kpis(request):
    require_committee(get_current_professor(request))
    cycle_id = request.query_params.get("cycle_id")
    if cycle_id is not None:
        if not cycle_id.isdecimal():
            raise ValidationError({"cycle_id": "Provide a numeric cycle ID."})
        cycle = get_object_or_404(Cycle, pk=int(cycle_id))
    else:
        cycle = get_current_cycle()
    return Response(kpi_report(cycle))


@api_view(["GET"])
def committee_kpis_csv(request):
    require_committee(get_current_professor(request))
    cycle_id = request.query_params.get("cycle_id")
    if cycle_id is not None:
        if not cycle_id.isdecimal():
            raise ValidationError({"cycle_id": "Provide a numeric cycle ID."})
        cycle = get_object_or_404(Cycle, pk=int(cycle_id))
    else:
        cycle = get_current_cycle()
    report = kpi_report(cycle)
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="kpis_cycle_{cycle.pk}.csv"'
    writer = csv.writer(response)
    writer.writerow(["cycle_id", "semester", "rank", "faculty_total", "due", "overdue",
                     "not_due", "undetermined", "unmatched", "outstanding_records",
                     "expected_surveys", "submitted_surveys", "survey_completion_percent"])
    for entry in report["historical_breakdown"]:
        for item in entry["by_rank"]:
            writer.writerow([entry["cycle_id"], entry["semester"], item["rank"],
                             *(item[k] for k in ("faculty_total", "due", "overdue", "not_due",
                                                "undetermined", "unmatched", "outstanding_records",
                                                "expected_surveys", "submitted_surveys",
                                                "survey_completion_percent"))])
    return response


# A08 — Committee-managed form versions. Published versions are immutable through this API.
from django.db.models import Max
from .models import Template
from .serializers import TemplateDraftSerializer, TemplateCreateSerializer


def _template_payload(form):
    in_use = Observation.objects.filter(template=form).exists() or Survey.objects.filter(template=form).exists()
    return {
        "template_id": form.pk, "name": form.name, "type": form.type,
        "version": form.version, "status": form.status,
        "instructions": form.instructions, "questions": form.questions,
        "used_by_records": in_use,
        "can_edit": form.status == "draft" and not in_use,
        "can_publish": form.status == "draft" and not in_use and bool(form.questions),
    }


def _next_template_version(form_type, name):
    # To handle concurrent creation robustly, add a DB unique constraint on (type, name, version).
    return (Template.objects.filter(type=form_type, name=name).aggregate(v=Max("version"))["v"] or 0) + 1


@api_view(["GET", "POST"])
def committee_templates(request):
    require_committee(get_current_professor(request))
    if request.method == "GET":
        query = Template.objects.order_by("type", "name", "-version", "-pk")
        kind = request.query_params.get("type")
        if kind:
            if kind not in ("observation", "survey"):
                raise ValidationError({"type": "Use observation or survey."})
            query = query.filter(type=kind)
        return Response({"templates": [_template_payload(form) for form in query]})

    payload = TemplateCreateSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    d = payload.validated_data
    with transaction.atomic():
        form = Template.objects.create(
            name=d["name"], type=d["type"], version=_next_template_version(d["type"], d["name"]),
            status="draft", instructions=d.get("instructions", ""),
            questions=d.get("questions", []),
        )
    return Response(_template_payload(form), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
def committee_template_detail(request, template_id):
    require_committee(get_current_professor(request))
    if request.method == "GET":
        return Response(_template_payload(get_object_or_404(Template, pk=template_id)))
    payload = TemplateDraftSerializer(data=request.data, partial=True)
    payload.is_valid(raise_exception=True)
    with transaction.atomic():
        form = get_object_or_404(Template.objects.select_for_update(), pk=template_id)
        if form.status != "draft" or Observation.objects.filter(template=form).exists() or Survey.objects.filter(template=form).exists():
            raise ValidationError({"detail": "Only unused draft versions can be edited. Clone this version instead."})
        for field, value in payload.validated_data.items():
            setattr(form, field, value)
        form.save(update_fields=list(payload.validated_data.keys()) or ["instructions"])
    return Response(_template_payload(form))


@api_view(["POST"])
def committee_template_clone(request, template_id):
    require_committee(get_current_professor(request))
    with transaction.atomic():
        original = get_object_or_404(Template, pk=template_id)
        form = Template.objects.create(
            name=original.name, type=original.type,
            version=_next_template_version(original.type, original.name),
            status="draft", instructions=original.instructions,
            questions=original.questions,
        )
    return Response(_template_payload(form), status=status.HTTP_201_CREATED)


@api_view(["POST"])
def committee_template_publish(request, template_id):
    require_committee(get_current_professor(request))
    with transaction.atomic():
        form = get_object_or_404(Template.objects.select_for_update(), pk=template_id)
        if form.status != "draft":
            raise ValidationError({"detail": "Only draft versions can be published."})
        if Observation.objects.filter(template=form).exists() or Survey.objects.filter(template=form).exists():
            raise ValidationError({"detail": "This version already has records and cannot be changed."})
        # Validate again at publication even if the draft was created before current validation rules.
        validation = TemplateDraftSerializer(data={"questions": form.questions})
        validation.is_valid(raise_exception=True)
        if not form.questions:
            raise ValidationError({"questions": "At least one question is required."})
        if form.type == "survey":
            required = {"score", "pain_points", "improvements"}
            qmap = {q["id"]: q for q in form.questions}
            if set(qmap) != required or qmap["score"]["type"] != "rating" or qmap["score"].get("min") != 1 or qmap["score"].get("max") != 5 or any(qmap[k]["type"] != "text" for k in ("pain_points", "improvements")):
                raise ValidationError({"questions": "Current survey submission API requires score (rating 1–5), pain_points (text), and improvements (text)."})
        form.status = "published"
        form.save(update_fields=["status"])
    return Response(_template_payload(form))
