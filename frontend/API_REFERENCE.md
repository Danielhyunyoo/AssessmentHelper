# Backend API reference — supplied code snapshot

Routes below were extracted from the latest available `form_management_update/urls.py` in this conversation. They are not independently confirmed against the live Git repository. All are under `/api/` because earlier integration tests used that prefix.

| Method | URL | Django handler |
|---|---|---|
| GET | `/api/auth/csrf/` | `csrf_cookie` |
| POST | `/api/auth/login/` | `session_login` |
| POST | `/api/auth/logout/` | `session_logout` |
| GET | `/api/auth/session/` | `session_user` |
| GET | `/api/me/` | `my_professor` |
| GET | `/api/me/courses/` | `my_courses` |
| POST | `/api/signups/` | `create_signup` |
| GET | `/api/registration/status/` | `registration_status` |
| PATCH | `/api/signups/course/` | `select_signup_course` |
| GET | `/api/dashboard/` | `faculty_dashboard` |
| GET | `/api/notifications/` | `my_notifications` |
| POST | `/api/notifications/read-all/` | `mark_all_notifications_read` |
| PATCH | `/api/notifications/{notification_id}/read/` | `mark_notification_read` |
| GET | `/api/committee/signups/{signup_id}/candidate-pool/` | `committee_candidate_pool` |
| POST | `/api/committee/signups/{signup_id}/release-candidates/` | `committee_release_candidates` |
| GET | `/api/matches/` | `my_matched_candidates` |
| GET | `/api/invitations/` | `my_sent_invitations` |
| POST | `/api/invitations/send/` | `send_invitation` |
| GET | `/api/invitations/received/` | `my_received_invitations` |
| POST | `/api/invitations/{invitation_id}/respond/` | `respond_to_invitation` |
| POST | `/api/pairings/confirm/` | `confirm_pairing` |
| GET, POST | `/api/observations/` | `observations_collection` |
| GET, PATCH | `/api/observations/{observation_id}/` | `observation_detail` |
| POST | `/api/observations/{observation_id}/sign/` | `sign_observation` |
| POST | `/api/observations/{observation_id}/cancel/` | `cancel_observation` |
| GET, POST | `/api/surveys/` | `surveys_collection` |
| GET | `/api/surveys/{survey_id}/` | `survey_detail` |
| GET | `/api/committee/pending-records/` | `committee_pending_records` |
| POST | `/api/committee/pending-records/{pairing_id}/remind/` | `committee_remind_record` |
| GET | `/api/committee/pending-surveys/` | `committee_pending_surveys` |
| POST | `/api/committee/pending-surveys/{pairing_id}/{role}/remind/` | `committee_remind_survey` |
| GET | `/api/committee/faculty/` | `committee_faculty` |
| GET | `/api/committee/faculty/unregistered/` | `committee_unregistered_faculty` |
| PATCH | `/api/committee/faculty/{user_id}/rank/` | `committee_update_faculty_rank` |
| POST | `/api/committee/faculty/remind/` | `committee_remind_unregistered` |
| GET | `/api/committee/dashboard/` | `committee_dashboard` |
| GET | `/api/committee/unmatched/` | `committee_unmatched_faculty` |
| GET | `/api/committee/carry-forwards/` | `committee_carry_forward_list` |
| POST | `/api/committee/carry-forwards/create/` | `committee_carry_forward` |
| GET | `/api/committee/carry-forwards/due/` | `committee_carried_forward_due` |
| GET | `/api/committee/kpis/` | `committee_kpis` |
| GET | `/api/committee/kpis/export.csv` | `committee_kpis_csv` |
| GET, POST | `/api/committee/templates/` | `committee_templates` |
| GET, PATCH | `/api/committee/templates/{template_id}/` | `committee_template_detail` |
| POST | `/api/committee/templates/{template_id}/clone/` | `committee_template_clone` |
| POST | `/api/committee/templates/{template_id}/publish/` | `committee_template_publish` |

## Exact JSON request bodies for write operations

| Method + URL | JSON body |
|---|---|
| POST `/api/signups/` | `{}` or `{"course_id":3}` |
| PATCH `/api/signups/course/` | `{"course_id":3}` |
| PATCH `/api/notifications/{id}/read/` | `{}` |
| POST `/api/notifications/read-all/` | `{}` |
| POST `/api/committee/signups/{id}/release-candidates/` | `{"observer_ids":[1]}` (1–5 unique IDs) |
| POST `/api/invitations/send/` | `{"observer_id":1,"proposed_datetimes":["2026-10-28T11:00:00-05:00"]}` (4–8 distinct datetimes) |
| POST `/api/invitations/{id}/respond/` | `{"action":"accept","proposed_date_id":123}` or `{"action":"decline"}` |
| POST `/api/pairings/confirm/` | `{"invitation_id":123}` |
| POST `/api/observations/` | `{"pairing_id":2,"template_id":1}` |
| PATCH `/api/observations/{id}/` | `{"responses":{"q1":5,"q2":4,"q3":"Notes"}}` |
| POST `/api/observations/{id}/sign/` | `{}` |
| POST `/api/observations/{id}/cancel/` | `{"reason":"Observation could not occur"}` |
| POST `/api/surveys/` | `{"pairing_id":2,"template_id":2,"score":5,"pain_points":"","improvements":""}` |
| PATCH `/api/committee/faculty/{id}/rank/` | `{"academic_rank":"Assistant Professor"}` |
| POST `/api/committee/faculty/remind/` | `{"user_ids":[3]}` |
| POST `/api/committee/pending-records/{id}/remind/` | `{}` (`id` is pairing ID) |
| POST `/api/committee/pending-surveys/{id}/{role}/remind/` | `{}` (`role` = observer or observee) |
| POST `/api/committee/carry-forwards/create/` | `{"signup_ids":[4],"target_cycle_id":2,"reason":"No candidates"}` |
| POST `/api/committee/templates/` | `{"name":"Form","type":"observation","instructions":"...","questions":[...]}` |
| PATCH `/api/committee/templates/{id}/` | `{"instructions":"...","questions":[...]}` (draft only) |
| POST `/api/committee/templates/{id}/clone/` or `.../publish/` | `{}` |

## Response schema highlights (grounded in current Python source)

- `GET /api/me/`: `{ professor, evaluation_cycle, evaluation_status, evaluation_status_details, registration_status, selected_course }`.
- `GET /api/me/courses/`: array of courses with IDs, department, instructor, number, level, section and schedule. Course title/classroom should **not** be assumed present.
- `GET /api/registration/status/`: `{ cycle_id, cycle_name, signup_deadline, observation_deadline, survey_deadline, is_registered, has_selected_course, selected_course_id }`.
- `GET /api/dashboard/`: `{cycle, evaluation_status, evaluation_status_reason, is_registered, has_selected_course, selected_course, unread_notifications, incoming_requests, modules}`.
- `GET /api/notifications/`: `{ unread_count, notifications:[{notification_id,title,message,type,is_urgent,is_read,created_at,destination}] }`.
- `GET /api/matches/`: `{released,candidates,warning?}` with `fewer_than_five` for released lists.
- Invitation list endpoints return arrays; each invitation has `invitation_id`, sender/recipient/course IDs, status, creation/expiration/responded timestamps, and `proposed_dates`.
- Observation detail returns `template.questions`, `responses`, both signatures, `locked`, `can_edit`, `can_sign`, `can_cancel`.
- Survey list/detail returns respondent/role, assigned template, score, pain points, improvements, submitted time. Unsubmitted survey forms are not independently pre-created by the API.
- `GET /api/committee/faculty/`: `{cycle_id,cycle_name,count,registered_count,course_selected_count,faculty:[...]}`.
- `GET /api/committee/pending-records/`: `{cycle_id,count,records:[...]}`.
- `GET /api/committee/pending-surveys/`: `{cycle_id,missing_count,completed_count,missing:[...],completed:[...]}`.
- `GET /api/committee/templates/`: `{templates:[...]}`.
- KPI and committee dashboard responses are aggregated objects; treat optional/provisional metrics conservatively and inspect real responses before writing strict chart types.

## Signing in

Call `GET /api/auth/csrf/` first. Then `POST /api/auth/login/` with `{username, password}`. The username can also be the email. Use `GET /api/auth/session/` to check who is signed in.

## Requests, errors, and safety

Use `src/api/endpoints.ts` rather than raw fetch in each page. `http.ts` sends JSON, includes cookies, and reports HTTP errors. In local demo mode it adds `X-Demo-Username`. Without real login it is **not safe to expose the server to the internet**.

When `error.status === 400`, display specific DRF field messages. When 401, prompt login once implemented; when 403, hide committee controls; when 404, show not found; when 0, show backend connection guidance. Never assume request rejection means the DB is corrupt.

## Example usage

```typescript
import { committeeApi, matchingApi, observationApi, surveyApi } from "./api/endpoints";
const pool = await committeeApi.candidatePool(2);
await committeeApi.releaseCandidates(2, [1]);
const offered = await matchingApi.incomingInvitations();
const record = await observationApi.detail(2);
if (record.can_edit) await observationApi.saveDraft(2, {q1:5,q2:4});
// Submit surveys only after both observation signatures exist:
// await surveyApi.submit({pairing_id:2,template_id:2,score:5});
```

**Do not use sample IDs or sample timestamps in real UI logic.** Take IDs and candidate choices from fresh responses, and enforce actual meeting-time constraints in the backend before production.
