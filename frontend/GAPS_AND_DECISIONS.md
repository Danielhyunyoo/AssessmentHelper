# Backend gaps and decisions for frontend developers

This file is a **backlog**, not a list of already available API routes.

| Priority | Gap / open decision | Affected frontend pages | Temporary UI approach |
|---|---|---|---|
| Critical | Real login, logout, session status, CSRF and production-safe permissions | L01–L03, all roles | Use local demo header only on DEBUG server; mock login presentation |
| Critical | Same-department is insufficient observer eligibility: course level, rank, teaching history, scheduling conflicts, self-exclusion | E02, O02, A02–A03 | Display candidates from API as *committee screened*, not automatically fully eligible |
| High | Course title, classroom, structured meeting pattern and 4–8 class-date selection/save | E01, E02, O02 | Mock calendar data in frontend, label as placeholder; do not write it to invented URL |
| High | Last evaluation and Due/Overdue business policy (cutoff, rank changes, new faculty, carry-forward) | S01–S02, E05, A01, A04, A07 | Show `undetermined` and rationale when returned |
| High | Fully successful sign → locked record → observer + observee surveys integration test; cancellation carry-forward | E03–E04, O03–O04, A05–A06 | Respect server `can_sign`; test with isolated records |
| High | Historical observation listing by semester and observer's combined assignments view | E05, O01 | Compose from available arrays where practical; mock missing historical classifications |
| High | Assign specific observation/survey template version per cycle; immutability concurrency guarantees | E03, O03, A08 | Use returned template ID/version, never assume latest for historical records |
| Medium | Survey file upload/storage/download and committee survey-detail permissions | E04, A06 | Hide upload control or mark unavailable until endpoint exists |
| Medium | Profile email/photo editing | S02 | Display read-only values; hide edit control |
| Medium | Observation downloadable record/PDF; KPI PDF export/import data | E03, O03, A07 | Browser print, CSV export; hide unsupported actions |
| Medium | Committee registration window edits, bulk match notification/release and manual matching | A02 | Use existing per-signup release call; avoid fake bulk server actions |
| Medium | Unmatched-case completeness and confirmed transfer integration test | A03 | Explain released-zero-candidate limitation in UI |
| Medium | KPI definitions approved; rank-as-of-history snapshots, denominator cases | A07 | Label metrics provisional and include data coverage notes |
| Medium | Permissioned routing and URL destinations for notifications | S03, all views | Maintain frontend mapping from known destinations to React routes |

## Contract-change protocol

1. Backend proposes a route and sample request/response; frontend approves field names.
2. Add server validation and tests; document the HTTP status for invalid actions.
3. Update `src/api/types.ts` and `src/api/endpoints.ts` in the same PR as the backend change, or coordinate linked PRs.
4. Update the page mapping and this backlog; remove mock data only after an endpoint is actually tested.
5. No breaking API payload changes without frontend coordination.

## Known data fixtures from local test run (NOT universal)

`faculty_alice` user 1; `faculty_bob` user 2; `faculty_carol` user 3; `committee_demo` demonstration committee. Current observed pairing 2 (Alice observes Bob), course 3, and observation 2 were local tests; another developer's database can contain different IDs or none of these records.

## Known security limitation

Django's `get_current_professor()` in the supplied source trusts the caller-supplied `X-Demo-Username` while `DEBUG=True`. Never run that API where untrusted users can reach it. The Vite dev proxy is for local work, not a production authorization mechanism.
