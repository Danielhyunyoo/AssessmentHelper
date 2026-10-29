# Frontend page → backend function mapping (all 23 pages)

Source: **CS 4485 Group 39 - Frontend Backend Data Request List**. The function names below are exports in `frontend/src/api/endpoints.ts`; they are **client wrappers**, not Django Python function names. “Partial” indicates an available endpoint with missing data/behavior. “Mock” means the feature has no adequate endpoint yet.

| Page | Screen | Load function(s) | Save / action function(s) | Current caveat |
|---|---|---|---|---|
| L01 | Home/header | `facultyApi.profile()` | Header navigation in React | Can't reliably distinguish anonymous session; no auth/session API |
| L02 | Sign-in | **Mock UI only** | **No real login/logout endpoints yet** | Implement Django session auth + CSRF before integration |
| L03 | Cycle registration | `facultyApi.registrationStatus()` | `facultyApi.register()` | Two-step course selection is supported; committee permission from profile is coarse |
| S01 | Faculty dashboard | `facultyApi.dashboard()` | Navigation in React | Module availability exists; eligibility/phase rules provisional |
| S02 | Profile/status | `facultyApi.profile()` | Contact/photo editing **not implemented** | No profile image, contact editor, reliable next-semester field |
| S03 | Notifications | `facultyApi.notifications()` | `markRead(id)`, `markAllRead()` | Navigation uses returned `destination`; validate route locally |
| E01 | Course/section selection | `facultyApi.courses()`, `registrationStatus()` | `facultyApi.selectCourse(courseId)` | No structured calendar availability, classroom/title optional, 4–8 class dates not independently saved |
| E02 | Observer selection | `matchingApi.matches()`, `sentInvitations()` | `sendInvitation(...)`, `confirmPairing(id)` | Partial eligibility; pending/accepted invitations included |
| E03 | Observee record | `observationApi.detail(id)` | `sign(id)`, `cancel(id,reason)` | Observer ratings read-only to observee; record PDF download missing |
| E04 | Observee survey | `surveyApi.list()`, `detail(id)` | `surveyApi.submit(...)` | Fixed 3 fields; no file upload; available after two signatures |
| E05 | Observee history | `observationApi.list()`, `surveyApi.list()` | Open detail | Only user's records, no dedicated history-by-semester or survey availability endpoint |
| O01 | Observer assignments | `matchingApi.incomingInvitations()`, `observationApi.list()` | Navigate to request/record | No dedicated combined assignments feed, status cards composed in frontend |
| O02 | Observer request | `matchingApi.incomingInvitations()` | `matchingApi.respond(id,action,dateId)` | Offered dates come from invitation details; expiry enforced |
| O03 | Observer record | `observationApi.detail(id)` | `saveDraft(id,responses)`, `sign(id)` | Scheduled-time gate, required answers and published template; PDF download missing |
| O04 | Observer survey | `surveyApi.list()`, `detail(id)` | `surveyApi.submit(...)` | Same fixed field/API limitations as E04 |
| A01 | Committee dashboard | `committeeApi.dashboard()` | Navigate to subpages | Official status counts and module phase policy need final approval |
| A02 | Matching management | `candidatePool(signupId)`, `matchingApi.*` | `releaseCandidates(signupId,ids)` | Registration opening/closing date editing, bulk release, complete eligibility missing |
| A03 | Unmatched/transfer | `committeeApi.unmatched()`, `carryForwards()`, `carriedForwardDue(cycleId)` | `carryForward(ids,target,reason)` | Released lists with zero candidates only; true unmatched logic incomplete |
| A04 | Faculty roster | `committeeApi.faculty({search,sort})`, `unregistered()` | `updateRank(id,rank)`, `remindRegistration(ids)` | History/rank effective date policy incomplete |
| A05 | Pending records | `committeeApi.pendingRecords()` | `remindRecord(pairingId)` | Server only counts past-due actionable records; one reminder at a time |
| A06 | Pending surveys | `committeeApi.pendingSurveys()` | `remindSurvey(pairingId,role)` | Committee view of submitted response content not implemented |
| A07 | KPI charts | `committeeApi.kpis(cycleId)` | `downloadKpiCsv(cycleId)` from http.ts | Provisional metrics; no PDF export/import-new-data UI |
| A08 | Form versions | `committeeApi.templates(type)`, `template(id)` | `createTemplate`, `editTemplate`, `cloneTemplate`, `publishTemplate` | Published immutable; assignment by cycle/concurrent collisions not solved |

## UI wiring pattern

1. On page mount call the load function, show loading/error/empty states.
2. Use actual record IDs from responses. **Do not** hardcode signup=1, observer=2, template=1, etc.
3. On submit, send the documented payload. Disable the button based on server-returned `available`, `can_edit`, `can_sign`, `locked`, or domain state, but let Django be the final authority.
4. On success, re-fetch the corresponding detail/list and dashboard counters.
5. For missing APIs, use a clearly labeled fixture in `src/mock/` and raise a backend ticket. Never make up a Django URL.

## Status notes

Pages are **not** marked fully complete merely because a page has a corresponding API. The list above separates read/write routes from missing validation, authentication, date availability, attachment and history behavior.
