# Backend Setup

This guide explains how to set up and run the Django backend for AssessmentHelper locally.

## Requirements

* Python 3.14+ (64-bit recommended)
* Docker Desktop
* Git

Make sure Docker Desktop is running before starting the MySQL container.

## 1. Create the Environment File

From the repository root:

```powershell
Copy-Item .env.example .env
```

The `.env` file contains local database settings. **Do not commit `.env` to Git.**

## 2. Start MySQL

From the repository root:

```powershell
docker compose up -d mysql
```

Check that the container is running:

```powershell
docker compose ps
```

The current Windows development setup uses:

```text
Host: localhost
Port: 3307
Database: assessment_helper
```

Docker maps the host port to MySQL's internal port:

```text
localhost:3307 → MySQL:3306
```

The host port is controlled by `DB_PORT` in `.env`. If port 3306 is available on your computer, you can use `DB_PORT=3306` instead.

## 3. Set Up the Python Environment

From the repository root:

```powershell
cd backend
```

Create the virtual environment using Python 3.14:

```powershell
py -3.14 -m venv .venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Your terminal should now show `(.venv)`.

Install the backend dependencies:

```powershell
python -m pip install -r requirements.txt
```

## 4. Check Django and Set Up the Database

Check the Django configuration:

```powershell
python manage.py check
```

Then run the database migrations:

```powershell
python manage.py migrate
```

If the database is already up to date, Django will report:

```text
No migrations to apply.
```

## 5. Run the Backend

From the `backend` directory:

```powershell
python manage.py runserver
```

The development server runs at:

```text
http://127.0.0.1:8000/
```

To stop the server, press `Ctrl + C`.

## 6. Test the Health Endpoint

With Django running, open:

```text
http://127.0.0.1:8000/api/health/
```

A successful response is:

```json
{
    "status": "ok"
}
```

A `404` for `/favicon.ico` is not a backend failure. The health endpoint above is the endpoint that should be used to verify the backend.

## Starting Work

After the initial setup, the usual workflow is:

From the repository root:

```powershell
docker compose up -d mysql
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

## Useful Commands

Check Django:

```powershell
python manage.py check
```

Run migrations:

```powershell
python manage.py migrate
```

Start MySQL:

```powershell
docker compose up -d mysql
```

Check Docker:

```powershell
docker compose ps
```

Stop MySQL:

```powershell
docker compose down
```

### Notes

* Keep `.env` and `backend/.venv/` out of Git.
* If port 3306 is already in use, set `DB_PORT=3307` in your local `.env`.
* If Python commands fail, make sure `.venv` is activated.
