from datetime import date, datetime, time, timedelta
from io import BytesIO

from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from evaluations.models import Course, Cycle, Observation, Pairing, Signup, Survey

SURVEY_TEMPLATE = {
    "name": "Post-observation process survey",
    "type": "survey",
    "status": "published",
    "instructions": "Tell the Assessment Committee how the observation process went for you.",
    "questions": [
        {"id": "score", "text": "Overall, how smooth was the observation process?", "type": "rating", "required": True, "min": 1, "max": 5},
        {"id": "pain_points", "text": "What was difficult or confusing?", "type": "text", "required": False},
        {"id": "improvements", "text": "What should change next cycle?", "type": "text", "required": False},
    ],
}

PAST_CYCLES = {
    2023: "Fall 2023",
    2024: "Fall 2024",
    2025: "Fall 2025",
}

HISTORY = [
    (2025, "professor_a", "professor_g", "1336", "001", "Programming Fundamentals", "MW 10:00 AM - 11:15 AM", "ECSS 2.410", date(2025, 10, 15), True, True),
    (2025, "professor_c", "professor_f", "3305", "001", "Discrete Mathematics for Computing II", "MW 2:30 PM - 3:45 PM", "ECSS 2.415", date(2025, 10, 22), True, False),
    (2025, "professor_g", "professor_a", "3376", "001", "C/C++ Programming in a UNIX Environment", "TR 8:30 AM - 9:45 AM", "ECSS 2.306", date(2025, 11, 4), True, True),
    (2024, "professor_e", "professor_h", "4485", "001", "Computer Science Project", "TR 2:30 PM - 3:45 PM", "ECSS 2.305", date(2024, 10, 8), True, True),
    (2024, "professor_h", "professor_e", "4349", "001", "Advanced Algorithm Design and Analysis", "MW 8:30 AM - 9:45 AM", "ECSS 2.311", date(2024, 10, 23), False, True),
    (2023, "professor_b", "professor_f", "2340", "001", "Computer Architecture", "TR 11:30 AM - 12:45 PM", "ECSW 1.315", date(2023, 10, 17), True, True),
    (2023, "professor_f", "professor_c", "4386", "001", "Compiler Design", "MW 1:00 PM - 2:15 PM", "ECSS 2.203", date(2023, 11, 1), True, True),
]

STRENGTHS = [
    "Clear structure, with the goals for the class written on the board at the start.",
    "Good use of worked examples before asking students to try a problem.",
    "Students asked many questions and the instructor answered each one patiently.",
    "Strong pacing, with short breaks for students to check their understanding.",
]

SUGGESTIONS = [
    "Leave a few more minutes at the end for questions.",
    "Call on students in the back rows more often.",
    "Post the slides before class so students can follow along.",
    "",
]

SURVEY_ANSWERS = [
    (5, "", "Nothing, scheduling was easy."),
    (4, "Finding a date that worked for both of us took a few tries.", "Show the observer's free times when proposing dates."),
    (4, "", "Send a reminder the day before the visit."),
    (3, "I was not sure when the record was ready to sign.", "Notify both people when the record is ready."),
]

AVATAR_COLORS = ["#2563eb", "#16a34a", "#c2410c", "#7c3aed", "#0891b2", "#be123c", "#4d7c0f", "#a16207", "#475569"]


def at(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def seed_history(department, users, observation_template, survey_template):
    cycles = {}
    for year, semester in PAST_CYCLES.items():
        cycles[year], _ = Cycle.objects.update_or_create(
            semester=semester,
            defaults={
                "start_date": date(year, 8, 25),
                "end_date": date(year, 12, 15),
                "signup_deadline": date(year, 9, 30),
                "observation_deadline": date(year, 11, 20),
                "survey_deadline": date(year, 12, 5),
                "status": "closed",
            },
        )

    for index, (year, observee, observer, number, section, title, schedule, classroom, visit_day, observer_survey, observee_survey) in enumerate(HISTORY):
        cycle = cycles[year]
        course, _ = Course.objects.update_or_create(
            department=department,
            course_number=number,
            section=section,
            semester="Fall",
            year=year,
            defaults={
                "instructor": users[observee],
                "course_level": int(number[0]) * 1000,
                "title": title,
                "schedule": schedule,
                "classroom": classroom,
            },
        )
        Signup.objects.create(
            cycle=cycle,
            user=users[observee],
            course=course,
            status="completed",
            matches_released_at=at(date(year, 9, 15), 9),
        )
        pairing = Pairing.objects.create(
            cycle=cycle,
            observer=users[observer],
            observee=users[observee],
            course=course,
            status="confirmed",
            confirmed_datetime=at(visit_day, 10),
        )
        Observation.objects.create(
            pairing=pairing,
            template=observation_template,
            responses={
                "organization": 5 - index % 2,
                "clarity": 4 + index % 2,
                "engagement": 3 + index % 3,
                "strengths": STRENGTHS[index % len(STRENGTHS)],
                "suggestions": SUGGESTIONS[index % len(SUGGESTIONS)],
            },
            observer_signed=True,
            observer_signed_at=at(visit_day + timedelta(days=1), 16),
            observee_signed=True,
            observee_signed_at=at(visit_day + timedelta(days=2), 11),
            status="completed",
        )
        for offset, (role, person, submitted) in enumerate([
            ("observer", observer, observer_survey),
            ("observee", observee, observee_survey),
        ]):
            if not submitted:
                continue
            score, pain_points, improvements = SURVEY_ANSWERS[(index + offset) % len(SURVEY_ANSWERS)]
            Survey.objects.create(
                pairing=pairing,
                respondent=users[person],
                respondent_type=role,
                template=survey_template,
                responses={"score": score, "pain_points": pain_points, "improvements": improvements},
                score=score,
                pain_points=pain_points,
                improvements=improvements,
                submitted_at=at(date(year, 11, 28) + timedelta(days=offset), 14),
            )


def avatar(letter, color):
    image = Image.new("RGB", (256, 256), color)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=128)
    draw.text((128, 128), letter, fill="white", font=font, anchor="mm")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return ContentFile(buffer.getvalue())


def seed_avatars(users):
    for index, user in enumerate(users.values()):
        if user.profile_photo:
            continue
        letter = user.last_name[:1].upper() or "?"
        user.profile_photo.save(f"{user.username}.png", avatar(letter, AVATAR_COLORS[index % len(AVATAR_COLORS)]), save=True)
