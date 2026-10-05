# Contributing

## Quick Start

1. Pull the latest `main` and make a branch for your task.
2. Commit, push, and open a pull request (PR) into `main`.
3. After one teammate approves, merge it with **Squash and merge**.

## Branches

Name branches `<area>/<short-description>`, for example
`backend/health-endpoint` or `db/mysql-compose`.

Areas: `backend`, `frontend`, `db`, `ci`, `docs`, `fix`.

If `main` changes while you work, update your branch with:

```sh
git fetch origin
git rebase origin/main
```

## Commits and PRs

- Fill in the [PR template](.github/pull_request_template.md) and link
  the issue if there is one (`Closes #12`).

## Rules

- **No secrets in git.** Real values go in `.env`.
- **No real faculty data.** Use made-up names and courses (Prof A, Prof B).
- **Schema changes go through Django migrations.** No separate SQL schema
  file.
- **Requirements come from the [project documents](README.md#project-documents).**
  If code needs a rule that is not written down.

## Issues

- **Bugs:** steps to reproduce, what you expected, and what happened.
- **Risks:** when a risk from the
  [Risk Register](https://docs.google.com/document/d/10T91XMsX-qqtr00ppRUUOFurEvyKDj7rJTjgrVRjo6Y/edit#heading=h.3g9yogt1za2m)
  happens, open an issue with its ID (R-01 to R-10), the owner, and what
  triggered it.

## CI

There is no CI yet.
