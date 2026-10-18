# Signup API: Setup and Testing

This guide explains how to start the Django backend and test the professor dashboard and course signup endpoints. It includes PowerShell examples that can be used to verify the API without the frontend.

## 1. Start the database

Open PowerShell and navigate to the backend directory, for example:

```powershell
cd C:\Users\ANME\Documents\GitHub\AssessmentHelper\backend
```

Activate the Python virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Start the MySQL Docker container:

```powershell
docker compose up -d mysql
```

Check that the container is running:

```powershell
docker compose ps
```

If you are setting up the project for the first time, make sure your `.env` file exists and its database settings match your local Docker configuration.

**Note:** The usual host port is `3306`. If your local machine uses the alternate mapping `localhost:3307` to the container's port `3306`, set `DB_PORT=3307` in your local `.env` file. Other team members should use their own working database configuration.

## 2. Apply database migrations

Run:

```powershell
python manage.py migrate
```

Check the Django configuration:

```powershell
python manage.py check
```

The check should finish with:

```text
System check identified no issues (0 silenced).
```

## 3. Prepare sample data

The API needs a professor, at least one course assigned to that professor, and exactly one active evaluation cycle.

If the sample data has already been created, you can skip this step.

Run:

```powershell
python manage.py shell
```

Paste the following Python code into the Django shell:

```python
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from evaluations.models import Department, Course, Cycle

User = get_user_model()

department, _ = Department.objects.get_or_create(
    department_code="CS",
    defaults={"name": "Computer Science"},
)

professor, _ = User.objects.get_or_create(
    username="demo_professor",
    defaults={
        "first_name": "Demo",
        "last_name": "Professor",
        "role": "faculty",
        "department": department,
    },
)

today = date.today()

cycle, _ = Cycle.objects.get_or_create(
    semester="Fall 2026",
    defaults={
        "start_date": today,
        "end_date": today + timedelta(days=60),
        "signup_deadline": today + timedelta(days=14),
        "observation_deadline": today + timedelta(days=30),
        "survey_deadline": today + timedelta(days=45),
        "status": "active",
    },
)

# Ensure the sample cycle is active.
cycle.status = "active"
cycle.save()

course, _ = Course.objects.get_or_create(
    department=department,
    instructor=professor,
    course_number="2337",
    course_level=2000,
    section="001",
    defaults={"schedule": "MWF 10:00-10:50"},
)

print("Professor:", professor.username)
print("Cycle:", cycle.semester, cycle.status)
print("Course ID:", course.course_id)
```

Record the course ID printed at the end. The examples below use course ID `1`, but use the actual ID printed in your environment.

Exit the Django shell:

```python
exit()
```

**Important:** This creates or reuses sample records. It does not reset an existing signup. If `demo_professor` already signed up for the active cycle, the signup endpoint will reject another attempt.

## 4. Start the Django server

In the first PowerShell terminal, run:

```powershell
python manage.py runserver
```

Keep this terminal open while testing. By default, the API is available at:

```text
http://127.0.0.1:8000/
```

Open a **second PowerShell terminal** for the requests below. Navigate to the backend directory if needed and activate the virtual environment.

## 5. Test the professor dashboard endpoint

This endpoint returns the professor's information, the current evaluation cycle, signup status, and selected course if one has been saved.

**Request:** `GET /api/me/`

Run in PowerShell:

```powershell
$headers = @{
    "X-Demo-Username" = "demo_professor"
}

Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/me/" `
    -Headers $headers |
    ConvertTo-Json -Depth 5
```

Before signup, the response should contain:

```json
{
  "professor": {
    "id": 1,
    "username": "demo_professor",
    "first_name": "Demo",
    "last_name": "Professor",
    "role": "faculty",
    "academic_level": ""
  },
  "evaluation_cycle": "Fall 2026",
  "registration_status": "not_signed_up",
  "selected_course": null
}
```

The database IDs may differ in another environment.

After signup, `registration_status` should be `"signed_up"` and `selected_course` should contain the saved course.

## 6. Test the professor's course list

This endpoint returns courses assigned to the identified professor.

**Request:** `GET /api/me/courses/`

Run:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/me/courses/" `
    -Headers $headers |
    ConvertTo-Json -Depth 5
```

The response should be a JSON array containing the professor's courses. A sample course looks like this:

```json
{
  "course_id": 1,
  "department_id": 1,
  "department_name": "Computer Science",
  "department_code": "CS",
  "instructor_id": 1,
  "course_number": "2337",
  "course_level": 2000,
  "section": "001",
  "schedule": "MWF 10:00-10:50"
}
```

Use `course_id` when submitting a signup.

**Known limitation:** The endpoint filters by instructor only. It does not filter on `Course.semester` or `Course.year`, so sections from past semesters also appear in the list.

## 7. Submit a signup

This endpoint saves the professor's selected course for the active evaluation cycle.

**Request:** `POST /api/signups/`

Run:

```powershell
$body = @{
    course_id = 1
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8000/api/signups/" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

Replace `1` with the course ID returned by the course-list endpoint if necessary.

A successful request returns HTTP `201 Created` and a response similar to:

```json
{
  "signup_id": 1,
  "cycle_id": 1,
  "course_id": 1,
  "status": "pending",
  "availability": ""
}
```

The signup is now saved in the database.

## 8. Verify that the signup persisted

Run the dashboard request again:

```powershell
Invoke-RestMethod `
    -Uri "http://127.0.0.1:8000/api/me/" `
    -Headers $headers |
    ConvertTo-Json -Depth 5
```

The response should now show:

```json
"registration_status": "signed_up"
```

The `selected_course` field should contain the saved course. You can also stop and restart the Django server, repeat the request, and confirm that the signup remains saved.

## 9. Test duplicate signup protection

Try submitting the same signup again:

```powershell
Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:8000/api/signups/" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

The request should return HTTP `200 OK` with the same `signup_id`. No second signup is created.

## 10. Run the automated tests

From the backend directory, run:

```powershell
python manage.py test evaluations
```

A successful run ends with:

```text
OK
```

Django creates and removes a separate test database for this command. If MySQL reports that `test_assessment_helper` already exists, remove that **test database only** before retrying. Do not delete the regular `assessment_helper` database to fix a test database conflict.

## Endpoint summary

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/me/` | Retrieve professor information and signup status |
| GET | `/api/me/courses/` | Retrieve courses assigned to the professor |
| POST | `/api/signups/` | Save a course signup |

## Development authentication note

For local testing, the endpoints accept an `X-Demo-Username` header when Django's `DEBUG` setting is enabled. The username must correspond to an existing user.

This is a development-only shortcut, not production authentication. The frontend must eventually use the authentication mechanism agreed upon by the team.

The API also requires exactly one evaluation cycle with `status="active"` for dashboard and signup operations. If no active cycle exists, or multiple active cycles exist, those endpoints return an error until the cycle configuration is corrected.
