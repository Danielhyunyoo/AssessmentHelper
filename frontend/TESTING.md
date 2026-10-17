# Frontend integration and acceptance checklist

## Startup smoke test

- [ ] Django `/api/dashboard/` works for `faculty_alice` when running locally in `DEBUG=True`.
- [ ] `npm run dev` launches `http://localhost:5173` and renders S01 + S03.
- [ ] Network inspector shows `/api/dashboard/` and `/api/notifications/` hitting Vite proxy, not the public internet.
- [ ] `npm run build` succeeds before PR submission.
- [ ] With `VITE_USE_MOCKS=true`, example screens render even if Django is stopped.
- [ ] `.env` and `node_modules/` are not committed.

## Feature checks

- [ ] L03/E01: cycle registration and chosen course persist after reload.
- [ ] S03: mark one read and mark all read change unread counts on next GET.
- [ ] E02/O02: committee release → observee invitation → observer accepts → observee confirms single pairing.
- [ ] E03/O03: observer saves draft; observee cannot PATCH ratings; early signing rejected; observer signs after visit, then observee signs; completed record becomes locked.
- [ ] E04/O04: signed observation permits each role to submit exactly one survey; a second submission is rejected; unrelated faculty cannot GET another user's survey.
- [ ] A01–A04: committee sees dashboard/roster/unmatched/carry-forward; regular faculty gets 403 for committee routes.
- [ ] A05/A06: pending items and reminder actions work; a reminder creates a corresponding recipient notification.
- [ ] A07: KPI numbers match manually counted DB records, report coverage and unknown counts disclosed; CSV opens in Excel.
- [ ] A08: clone used template, edit draft, publish; PATCH to published form rejected; earlier observations retain original template version.

## Essential negative/edge tests

- [ ] No active cycle / multiple active cycles: API explains configuration problem.
- [ ] Invalid/foreign course IDs rejected; one signup per user/cycle.
- [ ] Dates outside observation window or class schedule rejected **after backend enforcement is added**.
- [ ] Invitations expire 48 hours after creation; expired invitations cannot be accepted.
- [ ] Competing accepted invitations cannot yield two finalized pairings.
- [ ] A survey is blocked until both signatures and permitted deadline.
- [ ] Carry-forward cannot target an earlier cycle, or transfer a registered successful pairing.
- [ ] Missing evaluation history displays Undetermined, not Overdue.
- [ ] Unauthorized committee endpoints return 403 even when called directly.

## Suggested frontend tests (Vitest/RTL optional)

Use a mock-service layer to test: loading, empty list, loading spinner, network failure, 400 validation messages, 403 permission-denied, successful refetch after mutations, and disabled buttons based on `can_sign`/`can_edit`/module availability. The scaffold deliberately does not introduce test dependencies; align test tooling with the frontend team's preferred stack.

## Release gate

Do not describe the product as production-ready until real session login/logout + CSRF, scoped permissions without impersonation, full eligibility/date rules, attachment policy, form history integrity, and critical end-to-end tests pass. Avoid running production DB resets or deleting completed observation sample records just to produce passing demos.
