// src/data/moduleGuides.ts
export interface ModuleGuideItem {
  id: string;
  phase: string;
  title: string;
  route: string;
  brief: string;
  detailed: string;
}

export const COMMITTEE_OVERALL_BRIEF =
  "Guide the evaluation cycle from start to finish by approving signups, releasing peer matches, and keeping tabs on signed forms, surveys, and cycle metrics. Committee members do not need to register a personal course.";

export const COMMITTEE_MODULES_GUIDE: ModuleGuideItem[] = [
  {
    id: "a02",
    phase: "Phase 1",
    title: "Observer Selection and Matching",
    route: "/committee/faculty-matching",
    brief: "Approve course signups, adjust peer pairings, and release match lists.",
    detailed:
      "Review and approve faculty course signups or date changes, fine-tune suggested peer matches, and publish the final observer lists.",
  },
  {
    id: "a03",
    phase: "Phase 1",
    title: "Unmatched Observees",
    route: "/committee/unmatched-observees",
    brief: "Help observees without a match or move their evaluation to next semester.",
    detailed:
      "Spot faculty who could not be paired due to rank or schedule conflicts, and either assign an observer or defer them to next semester with a quick note.",
  },
  {
    id: "a04",
    phase: "Phase 1",
    title: "Observation Record Management",
    route: "/committee/faculty-roster",
    brief: "See who has signed up and send friendly deadline reminders.",
    detailed:
      "Check who is active or still needs to register, update eligibility on the department roster, and send reminders to individuals or groups.",
  },
  {
    id: "a05",
    phase: "Phase 2",
    title: "Pending Observation Records",
    route: "/committee/pending-records",
    brief: "Keep track of ongoing classroom visits and missing signatures.",
    detailed:
      "Follow active pairings during the observation window to make sure evaluation forms are filled out and signed by both faculty members on time.",
  },
  {
    id: "a06",
    phase: "Phase 3",
    title: "Observation Surveys",
    route: "/committee/survey-tracking",
    brief: "Check post-visit survey completion for both observees and observers.",
    detailed:
      "See who has finished their post-observation feedback survey and send a quick nudge to anyone still pending.",
  },
  {
    id: "a07",
    phase: "Phase 3",
    title: "Generated KPIs",
    route: "/committee/kpi-overview",
    brief: "View participation numbers, rank breakdowns, and download cycle reports.",
    detailed:
      "Check live completion rates, signature turnaround times, and rank stats, with easy options to print or export your semester summary.",
  },
  {
    id: "a08",
    phase: "Admin",
    title: "Edit Evaluation and Survey Forms",
    route: "/committee/form-editor",
    brief: "Update or duplicate evaluation rubrics and post-visit surveys.",
    detailed:
      "Adjust rubric scales, questions, and instructions. Once people submit responses, active forms lock automatically so you can clone a fresh draft.",
  },
];

export const FACULTY_OVERALL_BRIEF =
  "Peer evaluation works in two ways: if you are due for review, you register 1 class section to be observed and also join the Observer Pool to visit 1 to 3 colleagues at your rank.";

export const FACULTY_MODULES_GUIDE: ModuleGuideItem[] = [
  {
    id: "s02",
    phase: "Shared",
    title: "Profile and Evaluation Status",
    route: "/shared/profile",
    brief: "Check your rank, due semester, and preferred days or times to observe.",
    detailed:
      "Confirm your faculty rank and whether you are due this cycle, and keep your preferred observation windows and blackout dates up to date.",
  },
  {
    id: "s03",
    phase: "Shared",
    title: "Alerts and Notifications",
    route: "/shared/notifications",
    brief: "Stay on top of invitations, approvals, and upcoming deadlines.",
    detailed:
      "See new peer invitations, committee approvals, signature requests, and deadline reminders with direct links to take action.",
  },
  {
    id: "s04",
    phase: "Shared",
    title: "Current and Past Observations",
    route: "/shared/current-past-observations",
    brief: "Fill out evaluation forms, sign records, and take post-visit surveys.",
    detailed:
      "Observers complete and sign rubrics here, while observees read their feedback, add their signature, and launch their follow-up survey.",
  },
  {
    id: "e01",
    phase: "Observee",
    title: "Course and Section Selection",
    route: "/observee/course-selection",
    brief: "Pick 1 class section and suggest visit dates before the deadline.",
    detailed:
      "Choose the single class section you want observed and propose preferred dates. Signing up also adds you to the Observer Pool.",
  },
  {
    id: "e02",
    phase: "Observee",
    title: "Observer Selection",
    route: "/observee/observer-selection",
    brief: "Invite up to 5 matched colleagues and confirm 1 visitor.",
    detailed:
      "Send visit invites to up to 5 peers from your matched list, then lock in 1 confirmed observer once someone accepts.",
  },
  {
    id: "r01",
    phase: "Observer",
    title: "Observation Requests",
    route: "/observer/observation-request",
    brief: "Reply to incoming peer observation invites within 48 hours.",
    detailed:
      "Look over visit requests from colleagues in your department, compare proposed dates with your schedule, and accept 1 to 3 observations.",
  },
];