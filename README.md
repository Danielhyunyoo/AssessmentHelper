# AssessmentHelper

A web application for managing faculty classroom observations, observer
matching, evaluation forms, and assessment tracking.

CS 4485 Group 39, for Prof. Priya Narayanasami. TA: Gopika Murali.

## What it will do

Faculty who are due for an evaluation will use the app to:

1. Sign up one of their courses to be observed.
2. Get a list of eligible observers and propose 4 to 8 observation dates.
3. Send invitations. Observers have 48 hours to respond.
4. Finalize one observation appointment.
5. Fill in and sign the observation record in the app. Once both people
   sign, the record locks.
6. Answer the follow-up survey, with an optional statement.

The Assessment Committee tracks which evaluations are due, in progress,
completed, overdue, or need attention.

The prototype uses demo accounts and anonymized sample data only. Course
data comes from a one-time CourseBook sample import.

## Planned stack

| Part | Tools |
|------|-------|
| Frontend | React, TypeScript, Vite |
| Backend | Django, Django REST Framework |
| Database | MySQL |
| Deployment | Docker Compose on a Linux VM |

## Project documents

| Document | What it covers |
|----------|----------------|
| [Project Proposal Draft](https://docs.google.com/document/d/10T91XMsX-qqtr00ppRUUOFurEvyKDj7rJTjgrVRjo6Y/edit) | Scope, technical approach, timetable, KPIs, risks |
| [Requirements Specification](https://docs.google.com/document/d/1f8nkfFg5G-iYqiGvtBVv2LXxe-CJZtXt1wtrURr9SE0/edit) | Functional and non-functional requirements |
| [Personas and User Stories](https://docs.google.com/document/d/1pNNl6h7sWpCA_Y6NicdIXB1cKeZkCS4VEidwl_dhy9o/edit) | Users and user stories |
| [Statement of Work](https://docs.google.com/document/d/1VvWg5JDYVwwuHDmCp235HkywtLI3mOVFLC3B0ZuZIV0/edit) | Deliverables, roles, sign-off |
| [Semester Calendar](https://docs.google.com/document/d/1zeatpdD5m24RjIgxZzmDjA-hZcBlw44YSAsoPsRQgoU/edit) | Weekly milestones and due dates |
| [Acceptance Scenarios](https://docs.google.com/document/d/1WNjDFuJVww8TThg2TtXOosShX36HBkXdZXJcAHqMcqg/edit) | Given/When/Then checks for the workflow rules |
| [Architecture Diagram and Outline](https://docs.google.com/document/d/1oBx9l7qYMxwJNOI-qFj-jh5E5T5QrsWDlY8auG1y5NQ/edit) | System architecture and API outline |
| [Entity Relationship Diagram](https://drive.google.com/file/d/1_rY2WthtS0vrqzMTmSBKdhP64T2CFvkg/view) | Database design (draw.io) |
| [Observation Lifecycle Diagram](https://drive.google.com/file/d/1CvQtA470Gm0yzphRP3XreJ76lGW67xDd/view) | States of an observation (draw.io) |
| [Figma Frontend Pages](https://docs.google.com/document/d/1LmsqIMi836WeBKFndNG0-Q4AoYrAQUWkHaH_0oondxg/edit) | Links to the wireframes |

The Drive documents are the source of truth for requirements. If this
README and a document disagree, the document wins.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Team

| Name | Role |
|------|------|
| Daniel Yoo | Team lead, project manager |
| Christian Garner | Database/integration |
| Diego Rodrigues | QA/DevOps, Backend/API secondary |
| Jacob Sanders | Backend/API, QA/DevOps secondary |
| Montserrat Milke Mosconi | Frontend/UX |
| Jonathan Darmawan | Frontend/UX secondary, Database secondary |
