# Setup and integration instructions

## Project layout

Use `AssessmentHelper/backend/` for the existing Django app and `AssessmentHelper/frontend/` for the React app. The new `docs/` directory sits at the same level. If your repository root has a different capitalization or spelling, keep this **relative** layout.

## Backend developer

From `AssessmentHelper/`:

```powershell
cd backend
docker compose up -d mysql
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Do not drop the DB. Set Django `DEBUG=True` ONLY locally for demo usernames. Confirm `config/urls.py` mounts `evaluations.urls` under `api/`.

## Frontend developer

```powershell
# In a second PowerShell window at AssessmentHelper/
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`. The React starter fetches the dashboard and notifications for `faculty_alice` by default. To switch the demo user, use the dropdown and Reload. `python manage.py seed_demo` creates the demo accounts `faculty_alice`, `faculty_bob`, `faculty_carol`, `faculty_dave` and `committee_demo`. They are example local database records, **not** production users. `python manage.py seed_demo --reset` returns them to their starting state.

## Network and CORS

The recommended setup is Vite's dev proxy: frontend calls `/api/...` on port `5173`, which forwards to Django port `8000`. This eliminates most local CORS issues and does not require cross-origin Django configuration. Use the empty `VITE_API_BASE_URL` setting for this arrangement. Do **not** set the base URL to `http://127.0.0.1:8000` unnecessarily.

`127.0.0.1` means **each developer's own computer**. Each teammate either runs a local Django/MySQL setup, or the team provisions an access-controlled shared dev API with HTTPS, real authentication, appropriate CORS, and secrets managed off Git.

## Mock mode

Edit `frontend/.env` to `VITE_USE_MOCKS=true`, restart `npm run dev`. The example dashboard and notification screens then work offline using `src/mock/data.ts`. Other endpoints still call Django when invoked: expand mock fixtures intentionally per page. Never use mock data as evidence that an endpoint works.

## Import and use the API client

```tsx
import { useEffect, useState } from 'react';
import { facultyApi } from './api/endpoints';
import type { Course } from './api/types';

export function MyCourseTable() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    facultyApi.courses().then(setCourses).catch(e => setError(String(e)));
  }, []);
  return <section>{error || courses.map(c =>
    <p key={c.course_id}>{c.department_code} {c.course_number}.{c.section} — {c.schedule}</p>
  )}</section>;
}
```

For registration: `await facultyApi.register()` followed by `await facultyApi.selectCourse(courseId)`. `register()` can be called again safely on the same cycle; course selection should still be rejected after matches are released.

## HTTP errors

The `ApiError` object includes HTTP status and either JSON validation errors or plain response text. Show the error next to the relevant field or button. Typical statuses: `400` invalid input/business rule, `401` not signed in, `403` access forbidden, `404` missing/inaccessible object, `409` if later implemented for conflict, `500` backend bug. In DRF, a validation error often has `detail` or `{field:[messages]}`; do not assume every error is one string.

## Authentication changeover

Today's demo client sets `X-Demo-Username` only if Vite is in development mode and no direct API base is supplied. When real authentication arrives, remove the demo header, use the backend login/session endpoints, and retain `credentials:'include'` plus CSRF on modifying requests. Cookie/CSRF configuration must be confirmed with the backend; `GET /api/auth/session/` does not exist yet in the supplied route list.

## Git process

Create a feature branch such as `frontend/api-client`; copy the new directories to the repo root; `git add frontend docs`; commit; push and open a PR. Do not commit `.env` or the `node_modules/` directory. Ask backend teammates to review every marked gap before treating it as implemented. The original frontend team's UI pages can be integrated incrementally rather than replacing their designs with this starter.
