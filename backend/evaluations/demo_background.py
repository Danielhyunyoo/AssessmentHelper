import random
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Q

from evaluations.demo_history import SURVEY_ANSWERS, at
from evaluations.evaluation_status import evaluation_status_for
from evaluations.models import (
    Course, Cycle, Department, EvaluationCarryForward, Invitation, MatchCandidate,
    Notification, Observation, Pairing, ProposedDate, Signup, Survey,
)

User = get_user_model()

SEED = 4485

DEPARTMENTS = [
    ("MATH", "Mathematical Sciences", "Mathematics", 17),
    ("PHYS", "Physics", "Physics", 17),
    ("EE", "Electrical and Computer Engineering", "Circuits", 17),
    ("MECH", "Mechanical Engineering", "Mechanics", 17),
    ("BIOL", "Biological Sciences", "Biology", 16),
    ("PSY", "Psychology", "Psychology", 16),
]

TITLES = {1: "Foundations of {}", 2: "Intermediate {}", 3: "Topics in {}", 4: "Advanced {}"}

SLOTS = [
    "MW 8:30 AM - 9:45 AM", "MW 10:00 AM - 11:15 AM", "MW 11:30 AM - 12:45 PM", "MW 1:00 PM - 2:15 PM",
    "MW 2:30 PM - 3:45 PM", "TR 8:30 AM - 9:45 AM", "TR 10:00 AM - 11:15 AM", "TR 11:30 AM - 12:45 PM",
    "TR 1:00 PM - 2:15 PM", "TR 2:30 PM - 3:45 PM", "F 9:00 AM - 11:45 AM",
]

RANKS = [("assistant", 35), ("associate", 32), ("full", 28), ("", 5)]

RANK_NAMES = {"assistant": "Assistant Professor", "associate": "Associate Professor", "full": "Full Professor", "": ""}

LAST_EVALUATED = {
    "assistant": [(2025, 70), (2024, 20), (None, 10)],
    "associate": [(2025, 35), (2024, 40), (2023, 20), (2022, 5)],
    "full": [(2025, 35), (2024, 40), (2023, 20), (2022, 5)],
    "": [(2024, 100)],
}

FATES = [
    ("not_signed_up", 25),
    ("no_course", 4),
    ("not_released", 8),
    ("unmatched", 7),
    ("invited", 13),
    ("scheduled", 11),
    ("missed", 7),
    ("draft_record", 8),
    ("observer_signed", 7),
    ("completed", 10),
    ("reported_missed", 3),
]

RESPONSES = {"organization": 4, "clarity": 4, "engagement": 4, "strengths": "Well organized class with clear examples.", "suggestions": ""}


def pick(rng, weighted):
    values, weights = zip(*weighted)
    return rng.choices(values, weights=weights)[0]


def background_users():
    return User.objects.filter(username__startswith="bg_")


def clear_background_activity():
    people = background_users()
    pairings = Pairing.objects.filter(Q(observer__in=people) | Q(observee__in=people))
    signups = Signup.objects.filter(user__in=people)
    Survey.objects.filter(pairing__in=pairings).delete()
    Observation.objects.filter(pairing__in=pairings).delete()
    pairings.delete()
    Invitation.objects.filter(Q(sender__in=people) | Q(recipient__in=people)).delete()
    EvaluationCarryForward.objects.filter(source_signup__in=signups).delete()
    MatchCandidate.objects.filter(Q(signup__in=signups) | Q(observer__in=people)).delete()
    signups.delete()
    Notification.objects.filter(user__in=people).delete()


def seed_background(observation_template, survey_template, password_hash):
    rng = random.Random(SEED)
    cycle = Cycle.objects.get(status="active")
    past_cycles = {c.start_date.year: c for c in Cycle.objects.filter(status="closed")}

    faculty = []
    for code, name, subject, count in DEPARTMENTS:
        department, _ = Department.objects.update_or_create(department_code=code, defaults={"name": name})
        for number in range(1, count + 1):
            rank = pick(rng, RANKS)
            user, _ = User.objects.update_or_create(
                username=f"bg_{code.lower()}_{number:02d}",
                defaults={
                    "first_name": "Professor",
                    "last_name": f"{code} {number:02d}",
                    "email": f"{code.lower()}{number:02d}@utdallas.edu",
                    "department": department,
                    "role": "faculty",
                    "academic_level": RANK_NAMES[rank],
                    "last_evaluated_year": pick(rng, LAST_EVALUATED[rank]),
                    "password": password_hash,
                },
            )
            level = rng.randint(1, 4)
            course, _ = Course.objects.update_or_create(
                department=department,
                course_number=f"{level}{rng.randint(300, 399)}",
                section=f"{number:03d}",
                semester="Fall",
                year=2026,
                defaults={
                    "instructor": user,
                    "course_level": level * 1000,
                    "title": TITLES[level].format(subject),
                    "schedule": rng.choice(SLOTS),
                    "classroom": f"{code} {rng.randint(1, 4)}.{rng.randint(100, 499)}",
                },
            )
            faculty.append((user, course))

    by_department = {}
    for user, course in faculty:
        by_department.setdefault(user.department_id, []).append((user, course))

    for user, course in faculty:
        year = user.last_evaluated_year
        if year in past_cycles:
            peers = [p for p, _ in by_department[user.department_id] if p != user]
            complete_past(rng, past_cycles[year], user, course, rng.choice(peers), observation_template, survey_template)

    for user, course in faculty:
        if evaluation_status_for(user, cycle)["status"] in ("due", "overdue"):
            play_cycle(rng, cycle, user, course, by_department[user.department_id], observation_template)


def complete_past(rng, cycle, observee, course, observer, observation_template, survey_template):
    past_course, _ = Course.objects.update_or_create(
        department=course.department,
        course_number=course.course_number,
        section=course.section,
        semester="Fall",
        year=cycle.start_date.year,
        defaults={
            "instructor": observee,
            "course_level": course.course_level,
            "title": course.title,
            "schedule": course.schedule,
            "classroom": course.classroom,
        },
    )
    visit = date(cycle.start_date.year, 10, 1) + timedelta(days=rng.randint(0, 40))
    Signup.objects.create(cycle=cycle, user=observee, course=past_course, status="completed",
                          matches_released_at=at(date(cycle.start_date.year, 9, 15), 9))
    pairing = Pairing.objects.create(cycle=cycle, observer=observer, observee=observee, course=past_course,
                                     status="confirmed", confirmed_datetime=at(visit, 10))
    Observation.objects.create(
        pairing=pairing, template=observation_template, responses=RESPONSES, status="completed",
        observer_signed=True, observer_signed_at=at(visit + timedelta(days=1), 15),
        observee_signed=True, observee_signed_at=at(visit + timedelta(days=3), 11),
    )
    for role, person in (("observer", observer), ("observee", observee)):
        if rng.random() < 0.8:
            score, pain_points, improvements = rng.choice(SURVEY_ANSWERS)
            Survey.objects.create(
                pairing=pairing, respondent=person, respondent_type=role, template=survey_template,
                responses={"score": score, "pain_points": pain_points, "improvements": improvements},
                score=score, pain_points=pain_points, improvements=improvements,
                submitted_at=at(cycle.observation_deadline + timedelta(days=rng.randint(1, 10)), 14),
            )


def candidates_for(rng, user, course, colleagues):
    others = [(peer, peer_course) for peer, peer_course in colleagues if peer != user]
    same_level = [peer for peer, peer_course in others if peer_course.course_level == course.course_level]
    other_level = [peer for peer, peer_course in others if peer_course.course_level != course.course_level]
    chosen = rng.sample(same_level, min(len(same_level), rng.randint(2, 5)))
    if other_level and rng.random() < 0.15:
        chosen.append(rng.choice(other_level))
    return chosen[:5]


def play_cycle(rng, cycle, user, course, colleagues, observation_template):
    fate = pick(rng, FATES)
    if fate == "not_signed_up":
        return
    signup = Signup.objects.create(cycle=cycle, user=user, course=None if fate == "no_course" else course)
    if fate in ("no_course", "not_released"):
        return

    released = date(2026, 8, 25) + timedelta(days=rng.randint(0, 2))
    signup.matches_released_at = at(released, 9)
    signup.save(update_fields=["matches_released_at"])
    if fate == "unmatched":
        return

    candidates = candidates_for(rng, user, course, colleagues)
    if not candidates:
        return
    for observer in candidates:
        MatchCandidate.objects.create(signup=signup, observer=observer)

    if fate == "invited":
        visit = date(2026, 9, 8) + timedelta(days=rng.randint(0, 20))
    elif fate == "scheduled":
        visit = date(2026, 9, 8) + timedelta(days=rng.randint(0, 70))
    else:
        visit = released + timedelta(days=1 + rng.randint(0, 1))
    invited = candidates[: rng.randint(1, min(3, len(candidates)))]
    for index, observer in enumerate(invited):
        status = "pending" if fate == "invited" else "confirmed" if index == 0 else "closed"
        invitation = Invitation.objects.create(
            cycle=cycle, sender=user, recipient=observer, course=course, status=status,
            expires_at=at(date(2026, 9, 2), 17) if status == "pending" else at(released + timedelta(days=2), 9),
        )
        for offset in range(4):
            ProposedDate.objects.create(
                invitation=invitation,
                proposed_datetime=at(visit + timedelta(days=offset), 10),
                status="accepted" if status == "confirmed" and offset == 0 else "proposed",
            )
    if fate == "invited":
        return

    observer = invited[0]
    pairing = Pairing.objects.create(cycle=cycle, observer=observer, observee=user, course=course,
                                     status="confirmed", confirmed_datetime=at(visit, 10))
    if fate in ("scheduled", "missed"):
        return

    if fate == "reported_missed":
        Observation.objects.create(pairing=pairing, template=observation_template, status="cancelled",
                                   cancellation_reason="The observer could not attend and no new date was found.")
        return

    record = Observation(pairing=pairing, template=observation_template, status="draft",
                         responses={"organization": 4} if fate == "draft_record" else RESPONSES)
    if fate in ("observer_signed", "completed"):
        record.observer_signed = True
        record.observer_signed_at = at(visit + timedelta(days=1), 15)
        record.status = "awaiting_observee_signature"
    if fate == "completed":
        record.observee_signed = True
        record.observee_signed_at = at(visit + timedelta(days=1), 18)
        record.status = "completed"
    record.save()
