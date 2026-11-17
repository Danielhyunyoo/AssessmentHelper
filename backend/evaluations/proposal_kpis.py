import re
from collections import defaultdict
from datetime import datetime

from django.contrib.auth import get_user_model

from . import clock
from .evaluation_status import evaluation_status_for
from .models import Course, MatchCandidate, Observation, Pairing, Signup, Survey

User = get_user_model()

SCHEDULE = re.compile(r"^\s*([MTWRFSU]+)\s+(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)", re.I)

PROBLEM_TEXT = {
    "self": "is the observee",
    "department": "is in another department",
    "level": "does not teach a course at this level",
    "schedule": "teaches at the same time",
}

DEFINITIONS = {
    "eligibility_accuracy": (
        "KPI-01 Eligibility Accuracy",
        "Recommended observers who are not the observee, are in the same department, teach the same "
        "course level, and have no class at the same time ÷ all recommended observers.",
    ),
    "list_sufficiency": ("KPI-02 List Sufficiency", "Eligible candidates per released list, counting at most 5."),
    "participation_rate": ("KPI-03 Participation Rate", "Due or overdue faculty who signed up ÷ due or overdue faculty."),
    "overdue_count": ("KPI-04 Overdue Count", "Faculty past their due year without a completed observation."),
    "observer_utilization": ("KPI-05 Observer Utilization Rate", "Observers in confirmed pairings ÷ faculty who signed up."),
    "missing_observations": (
        "KPI-06 Missing Observation Count",
        "Confirmed visits that were cancelled or have no submitted record by the observation deadline.",
    ),
    "process_completion": (
        "KPI-07 Survey Completion Rate",
        "Signups with a signed record and a submitted observee survey ÷ signups.",
    ),
}


def parse_schedule(text):
    match = SCHEDULE.match(text or "")
    if not match:
        return None
    days, start, end = match.groups()
    return set(days.upper()), to_minutes(start), to_minutes(end)


def to_minutes(text):
    moment = datetime.strptime(re.sub(r"\s+", " ", text.strip().upper()), "%I:%M %p")
    return moment.hour * 60 + moment.minute


def overlaps(first, second):
    a, b = parse_schedule(first), parse_schedule(second)
    if not a or not b:
        return False
    return bool(a[0] & b[0]) and a[1] < b[2] and b[1] < a[2]


def recommendation_problems(observee, course, observer, observer_courses):
    problems = []
    if observer.pk == observee.pk:
        problems.append("self")
    if observer.department_id != course.department_id:
        problems.append("department")
    if not any(c.course_level == course.course_level and c.department_id == course.department_id for c in observer_courses):
        problems.append("level")
    if any(overlaps(c.schedule, course.schedule) for c in observer_courses):
        problems.append("schedule")
    return problems


def ratio(numerator, denominator, percent=True):
    if not denominator:
        return None
    value = numerator / denominator
    return round(100 * value, 2) if percent else round(value, 2)


def proposal_kpis(cycle, statuses):
    term = cycle.semester.split()[0]
    year = cycle.start_date.year
    signups = list(Signup.objects.filter(cycle=cycle, user__role="faculty").select_related("user", "course"))
    signed_up = {s.user_id for s in signups}

    owed = {uid for uid, status in statuses.items() if status in ("due", "overdue")}
    completed_observees = set(Observation.objects.filter(
        pairing__cycle=cycle, status="completed", observer_signed=True, observee_signed=True,
    ).values_list("pairing__observee_id", flat=True))
    owed |= completed_observees & set(statuses)

    courses_by_instructor = defaultdict(list)
    for course in Course.objects.filter(semester=term, year=year):
        courses_by_instructor[course.instructor_id].append(course)

    released = [s for s in signups if s.course_id and s.matches_released_at]
    recommended = correct = 0
    eligible_per_signup = []
    candidates = MatchCandidate.objects.filter(signup__in=released).select_related("observer")
    by_signup = defaultdict(list)
    for candidate in candidates:
        by_signup[candidate.signup_id].append(candidate.observer)
    for signup in released:
        eligible = 0
        for observer in by_signup[signup.pk]:
            recommended += 1
            if not recommendation_problems(signup.user, signup.course, observer, courses_by_instructor[observer.pk]):
                correct += 1
                eligible += 1
        eligible_per_signup.append(min(eligible, 5))

    pairings = list(Pairing.objects.filter(cycle=cycle, status="confirmed").prefetch_related("observations"))
    observers = {p.observer_id for p in pairings}
    now = clock.now()
    deadline_passed = clock.today() > cycle.observation_deadline
    missing = 0
    for pairing in pairings:
        if not pairing.confirmed_datetime or pairing.confirmed_datetime > now:
            continue
        records = list(pairing.observations.all())
        cancelled = any(r.status == "cancelled" for r in records)
        submitted = any(r.observer_signed for r in records)
        if cancelled or (deadline_passed and not submitted):
            missing += 1

    surveyed = set(Survey.objects.filter(
        pairing__cycle=cycle, respondent_type="observee", submitted_at__isnull=False,
    ).values_list("respondent_id", flat=True))
    finished = len(signed_up & completed_observees & surveyed)
    overdue = sum(1 for status in statuses.values() if status == "overdue")

    values = {
        "eligibility_accuracy": (ratio(correct, recommended), correct, recommended, "percent"),
        "list_sufficiency": (ratio(sum(eligible_per_signup), len(released), percent=False) if recommended else None, sum(eligible_per_signup), len(released), "average"),
        "participation_rate": (ratio(len(signed_up & owed), len(owed)), len(signed_up & owed), len(owed), "percent"),
        "overdue_count": (overdue, None, None, "count"),
        "observer_utilization": (ratio(len(observers), len(signed_up)), len(observers), len(signed_up), "percent"),
        "missing_observations": (missing, None, None, "count"),
        "process_completion": (ratio(finished, len(signed_up)) if clock.surveys_open(cycle) else None, finished, len(signed_up), "percent"),
    }
    return [
        {
            "key": key,
            "label": DEFINITIONS[key][0],
            "definition": DEFINITIONS[key][1],
            "value": value,
            "numerator": numerator,
            "denominator": denominator,
            "unit": unit,
            "note": f"Surveys open after {cycle.observation_deadline:%b} {cycle.observation_deadline.day}"
            if key == "process_completion" and not clock.surveys_open(cycle) else "",
        }
        for key, (value, numerator, denominator, unit) in values.items()
    ]
