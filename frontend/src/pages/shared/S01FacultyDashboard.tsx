// src/pages/shared/S01FacultyDashboard.tsx
import { useEffect, useState, type FormEvent } from "react";
import {
  authApi,
  committeeApi,
  facultyApi,
  matchingApi,
  observationApi,
  surveyApi,
} from "../../api/endpoints";
import { formatDate } from "../../api/format";
import type {
  FacultyDashboard,
  ObservationRecord,
  Professor,
  RegistrationStatus,
  Survey,
} from "../../api/types";
import { Link, useNavigate } from "react-router-dom";
import CycleModuleGuideBanner from "../../components/CycleModuleGuideBanner";
import {
  COMMITTEE_MODULES_GUIDE,
  COMMITTEE_OVERALL_BRIEF,
  FACULTY_MODULES_GUIDE,
  FACULTY_OVERALL_BRIEF,
} from "../../data/moduleGuides";

import profile_and_evaluation_status_card from "../../assets/profile_and_evaluation_status_card.jpg";
import alerts_and_notifications_card from "../../assets/alerts_and_notifications_card.jpg";
import current_and_past_observations_card from "../../assets/current_and_past_observations_card.jpg";
import course_and_section_selection_card from "../../assets/course_and_section_selection_card.jpg";
import observer_selection_matching_card from "../../assets/observer_selection_matching_card.jpg";
import observation_record_management_card from "../../assets/observation_record_management_card.jpg";

interface CustomTask {
  id: string;
  label: string;
  done: boolean;
}

interface MilestoneTask {
  id: string;
  title: string;
  meta: string;
  linkTo?: string;
  linkLabel?: string;
  done: boolean;
  autoSynced: boolean;
}

const S01_CHECKLIST_OPEN_KEY = "s01_checklist_open_v1";

function getNumericId(obj: unknown): number | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  const raw = rec.id ?? rec.user_id ?? rec.professor_id;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function getStringField(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = rec[key];
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return "";
}

function getBooleanField(obj: unknown, keys: string[]): boolean | null {
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  for (const key of keys) {
    if (typeof rec[key] === "boolean") {
      return rec[key] as boolean;
    }
  }
  return null;
}

export default function S01FacultyDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FacultyDashboard | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(
    null
  );
  const [profileRaw, setProfileRaw] = useState<Record<string, unknown> | null>(
    null
  );
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [hasSelectedCourse, setHasSelectedCourse] = useState(false);
  const [hasSentInvites, setHasSentInvites] = useState(false);
  const [hasIncomingInvites, setHasIncomingInvites] = useState(false);
  const [hasAcceptedIncoming, setHasAcceptedIncoming] = useState(false);
  const [hasConfirmedVisit, setHasConfirmedVisit] = useState(false);
  const [records, setRecords] = useState<ObservationRecord[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [committeeStats, setCommitteeStats] = useState({
    pendingRequests: 0,
    unmatchedCount: 0,
    openRecords: 0,
    pendingSurveys: 0,
  });

  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(S01_CHECKLIST_OPEN_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  const isCommitteeMember = currentUser?.role === "admin";
  const canUseFacultyModules = !!currentUser && !isCommitteeMember;

  const toggleChecklistOpen = () => {
    setIsChecklistOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(S01_CHECKLIST_OPEN_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const clearPlannerStorage = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("faculty_planner_") ||
            key === "s04_role_checklist_manual_v1" ||
            key === "observer_availability_v1")
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore storage access errors
    }
    setCheckedSteps({});
    setCustomTasks([]);
    setNewTaskText("");
  };

  const loadDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const [
        sessionData,
        dash,
        reg,
        profileData,
        sentInvites,
        incomingInvites,
        obsRecords,
        surveyList,
      ] = await Promise.all([
        authApi.session().catch(() => ({ professor: null })),
        facultyApi.dashboard(),
        facultyApi.registrationStatus(),
        facultyApi.profile().catch(() => null),
        matchingApi.sentInvitations().catch(() => []),
        matchingApi.incomingInvitations().catch(() => []),
        observationApi.list().catch(() => [] as ObservationRecord[]),
        surveyApi.list().catch(() => [] as Survey[]),
      ]);

      const activeProf =
        sessionData?.professor ?? profileData?.professor ?? null;
      if (activeProf) {
        setCurrentUser(activeProf);
      }

      setDashboard(dash);
      setRegistration(reg);
      setProfileRaw(
        profileData ? (profileData as unknown as Record<string, unknown>) : null
      );
      setHasSelectedCourse(
        Boolean(
          profileData?.selected_course ||
            dash?.is_registered ||
            reg?.is_registered
        )
      );

      const sentList = Array.isArray(sentInvites) ? sentInvites : [];
      const incomingList = Array.isArray(incomingInvites)
        ? incomingInvites
        : [];
      const recordList = Array.isArray(obsRecords) ? obsRecords : [];
      const surveyItems = Array.isArray(surveyList) ? surveyList : [];

      setHasSentInvites(sentList.length > 0);
      setHasIncomingInvites(incomingList.length > 0);
      setHasConfirmedVisit(
        sentList.some((inv) => inv.status === "confirmed") ||
          recordList.length > 0
      );
      setHasAcceptedIncoming(
        incomingList.some(
          (inv) => inv.status === "accepted" || inv.status === "confirmed"
        )
      );
      setRecords(recordList);
      setSurveys(surveyItems);

      if (activeProf?.role === "admin") {
        const commDash = (await committeeApi.dashboard().catch(() => null)) as
          | Record<string, unknown>
          | null;

        const pendingReg = Array.isArray(
          commDash?.pending_registration_requests
        )
          ? commDash.pending_registration_requests.length
          : 0;
        const pendingChg = Array.isArray(commDash?.pending_change_requests)
          ? commDash.pending_change_requests.length
          : 0;

        const rawUnmatched = Array.isArray(commDash?.unmatched_observees)
          ? commDash.unmatched_observees
          : [];
        const unmatchedTotal =
          rawUnmatched.length > 0
            ? rawUnmatched.filter(
                (u: Record<string, unknown>) => !u?.transferred
              ).length
            : Number(commDash?.unmatched_observees_count ?? 0) || 0;

        const openObs = recordList.filter(
          (r) => r.status !== "completed" && r.status !== "cancelled"
        ).length;
        const pendingSurv = surveyItems.filter(
          (s) => s.status !== "submitted"
        ).length;

        setCommitteeStats({
          pendingRequests: pendingReg + pendingChg,
          unmatchedCount: unmatchedTotal,
          openRecords: openObs,
          pendingSurveys: pendingSurv,
        });
      }
    } catch (err: unknown) {
      setDashboardError(
        err instanceof Error
          ? err.message
          : "Could not load dashboard information."
      );
    } finally {
      setDashboardLoading(false);
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();

    const handleDashboardUpdate = () => {
      void loadDashboard();
    };

    const handleDemoReset = () => {
      clearPlannerStorage();
      void loadDashboard();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("faculty_planner_")) {
        if (!e.newValue) {
          setCheckedSteps({});
          setCustomTasks([]);
          setNewTaskText("");
        }
      }
    };

    window.addEventListener("notifications-changed", handleDashboardUpdate);
    window.addEventListener("profile-changed", handleDashboardUpdate);
    window.addEventListener("simulated-date-changed", handleDashboardUpdate);
    window.addEventListener("demo-date-changed", handleDashboardUpdate);
    window.addEventListener("demo-reset", handleDemoReset);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("notifications-changed", handleDashboardUpdate);
      window.removeEventListener("profile-changed", handleDashboardUpdate);
      window.removeEventListener(
        "simulated-date-changed",
        handleDashboardUpdate
      );
      window.removeEventListener("demo-date-changed", handleDashboardUpdate);
      window.removeEventListener("demo-reset", handleDemoReset);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!roleLoading && !currentUser) {
      navigate("/login/signin", { replace: true });
    }
  }, [roleLoading, currentUser, navigate]);

  const storageKey = currentUser
    ? `faculty_planner_${currentUser.id ?? currentUser.email ?? "default"}`
    : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          checkedSteps?: Record<string, boolean>;
          customTasks?: CustomTask[];
        };
        setCheckedSteps(parsed.checkedSteps ?? {});
        setCustomTasks(parsed.customTasks ?? []);
      } else {
        setCheckedSteps({});
        setCustomTasks([]);
      }
    } catch {
      setCheckedSteps({});
      setCustomTasks([]);
    }
  }, [storageKey]);

  const persistPlanner = (
    nextSteps: Record<string, boolean>,
    nextCustom: CustomTask[]
  ) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ checkedSteps: nextSteps, customTasks: nextCustom })
      );
    } catch {
      // Ignore quota errors
    }
  };

  if (roleLoading) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Checking account permissions...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Redirecting to sign in...</div>
      </div>
    );
  }

  const userRecord = currentUser as unknown as Record<string, unknown>;
  const displayName =
    (typeof userRecord.full_name === "string" && userRecord.full_name.trim()) ||
    [userRecord.first_name, userRecord.last_name]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" ") ||
    (typeof userRecord.name === "string" && userRecord.name.trim()) ||
    currentUser.email ||
    "Faculty Member";

  const displayRank =
    (typeof userRecord.hire_level === "string" &&
      userRecord.hire_level.trim()) ||
    (typeof userRecord.rank === "string" && userRecord.rank.trim()) ||
    (isCommitteeMember ? "Assessment Committee" : "Faculty Member");

  const signupDeadlineLabel = registration?.signup_deadline
    ? formatDate(registration.signup_deadline)
    : "the signup cutoff";

  const observationDeadlineStr =
    dashboard?.cycle.observation_deadline || "2026-11-30";
  const [deadYear, deadMonth, deadDay] = observationDeadlineStr
    .split("-")
    .map(Number);
  const observationDeadlineDate = new Date(deadYear, deadMonth - 1, deadDay);
  observationDeadlineDate.setHours(0, 0, 0, 0);

  const observationEnd = dashboard
    ? observationDeadlineDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Nov 30";

  const surveyDeadlineStr = dashboard?.cycle.survey_deadline || "2026-12-10";
  const [survYear, survMonth, survDay] = surveyDeadlineStr
    .split("-")
    .map(Number);
  const surveyEnd = new Date(survYear, survMonth - 1, survDay).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );

  const isRegistered = Boolean(
    dashboard?.is_registered || registration?.is_registered || hasSelectedCourse
  );

  const evalStatusRaw = (
    getStringField(registration, ["due_status", "evaluation_status", "status"]) ||
    getStringField(profileRaw, ["due_status", "evaluation_status", "status"]) ||
    getStringField(userRecord, ["due_status", "evaluation_status", "status"])
  ).toLowerCase();

  const explicitDueFlag =
    getBooleanField(registration, ["is_due", "is_overdue", "due_this_cycle"]) ??
    getBooleanField(profileRaw, ["is_due", "is_overdue", "due_this_cycle"]) ??
    getBooleanField(userRecord, ["is_due", "is_overdue", "due_this_cycle"]);

  const isOverdue =
    evalStatusRaw.includes("overdue") ||
    evalStatusRaw.includes("over-due") ||
    getBooleanField(registration, ["is_overdue"]) === true ||
    getBooleanField(profileRaw, ["is_overdue"]) === true;

  const isDueForEvaluation =
    !isCommitteeMember &&
    (isRegistered ||
      isOverdue ||
      explicitDueFlag === true ||
      (explicitDueFlag === null &&
        !evalStatusRaw.includes("not_due") &&
        !evalStatusRaw.includes("not due") &&
        !evalStatusRaw.includes("exempt") &&
        !evalStatusRaw.includes("completed")));

  const nextDueSemester =
    getStringField(registration, ["next_due_semester", "due_semester"]) ||
    getStringField(profileRaw, ["next_due_semester", "due_semester"]) ||
    getStringField(userRecord, ["next_due_semester", "due_semester"]);

  const currentUserId = getNumericId(currentUser);
  const observeeRecords = records.filter(
    (r) => currentUserId !== null && getNumericId(r.observee) === currentUserId
  );
  const observerRecords = records.filter(
    (r) => currentUserId !== null && getNumericId(r.observer) === currentUserId
  );

  const isInObserverPool =
    !isCommitteeMember &&
    (isRegistered ||
      hasIncomingInvites ||
      hasAcceptedIncoming ||
      observerRecords.length > 0);

  const observeeFormSigned = observeeRecords.some(
    (r) => r.observee_signed || r.status === "completed"
  );
  const observerFormSigned = observerRecords.some(
    (r) => r.observer_signed || r.status === "completed"
  );

  const observeeSurveySubmitted = surveys.some(
    (s) => s.respondent_type === "observee" && s.status === "submitted"
  );
  const observerSurveySubmitted = surveys.some(
    (s) => s.respondent_type === "observer" && s.status === "submitted"
  );

  const hasSavedAvailability = (() => {
    try {
      const saved = localStorage.getItem("observer_availability_v1");
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return (
        (Array.isArray(parsed?.days) && parsed.days.length > 0) ||
        (Array.isArray(parsed?.windows) && parsed.windows.length > 0)
      );
    } catch {
      return false;
    }
  })();

  const observeeMilestones: MilestoneTask[] = [
    {
      id: "oe-register-course",
      title: `Register 1 course section and preferred dates (Due ${signupDeadlineLabel})`,
      meta: isRegistered
        ? "Registered (automatically placed in Observer Pool)"
        : `Required for due and overdue faculty by ${signupDeadlineLabel}`,
      linkTo: "/observee/course-selection",
      linkLabel: "Course Selection",
      done: isRegistered || Boolean(checkedSteps["oe-register-course"]),
      autoSynced: isRegistered,
    },
    {
      id: "oe-invite-observers",
      title: "Select and invite peers from your released observer list",
      meta: hasSentInvites
        ? "Invitations sent to matched observers"
        : "Choose up to 5 eligible same-department, same-level peers",
      linkTo: "/observee/observer-selection",
      linkLabel: "Observer Selection",
      done: hasSentInvites || Boolean(checkedSteps["oe-invite-observers"]),
      autoSynced: hasSentInvites,
    },
    {
      id: "oe-confirm-visit",
      title: "Accept 1 confirmed observer and send declines to others",
      meta: hasConfirmedVisit
        ? "Observer visit date confirmed"
        : "Confirm 1 date once an observer accepts your request",
      linkTo: "/observee/observer-selection",
      linkLabel: "Confirm Visit",
      done: hasConfirmedVisit || Boolean(checkedSteps["oe-confirm-visit"]),
      autoSynced: hasConfirmedVisit,
    },
    {
      id: "oe-sign-form",
      title: `Review and sign observation record (Due ${observationEnd})`,
      meta: observeeFormSigned
        ? "Observee signature recorded"
        : "Sign after the observer completes the in-person observation form",
      linkTo: observeeRecords[0]
        ? `/shared/observation-record/${observeeRecords[0].observation_id}`
        : "/shared/current-past-observations",
      linkLabel: "Observations",
      done: observeeFormSigned || Boolean(checkedSteps["oe-sign-form"]),
      autoSynced: observeeFormSigned,
    },
    {
      id: "oe-survey",
      title: `Submit post-evaluation survey (Due ${surveyEnd})`,
      meta: observeeSurveySubmitted
        ? "Survey submitted"
        : "Available once the observation period ends or record is signed",
      linkTo: observeeRecords[0]
        ? `/shared/post-evaluation-survey?pairingId=${observeeRecords[0].pairing_id}`
        : "/shared/current-past-observations",
      linkLabel: "Survey",
      done: observeeSurveySubmitted || Boolean(checkedSteps["oe-survey"]),
      autoSynced: observeeSurveySubmitted,
    },
  ];

  const observerMilestones: MilestoneTask[] = [
    {
      id: "or-availability",
      title: "Keep teaching schedule and preferred observation windows updated",
      meta: hasSavedAvailability
        ? "Availability saved on profile"
        : "Used to match free timeslots with same-level peers",
      linkTo: "/shared/profile",
      linkLabel: "Availability",
      done: hasSavedAvailability || Boolean(checkedSteps["or-availability"]),
      autoSynced: hasSavedAvailability,
    },
    {
      id: "or-respond-requests",
      title: "Confirm 1 to 3 incoming peer observation requests",
      meta:
        hasAcceptedIncoming || observerRecords.length > 0
          ? "Observation request confirmed"
          : "Respond to incoming requests within 48 hours",
      linkTo: "/observer/observation-request",
      linkLabel: "Requests",
      done:
        hasAcceptedIncoming ||
        observerRecords.length > 0 ||
        Boolean(checkedSteps["or-respond-requests"]),
      autoSynced: hasAcceptedIncoming || observerRecords.length > 0,
    },
    {
      id: "or-complete-sign",
      title: `Complete and sign observation form (Due ${observationEnd})`,
      meta: observerFormSigned
        ? "Observer signature recorded"
        : "Fill out the evaluation criteria and sign after the visit",
      linkTo: observerRecords[0]
        ? `/shared/observation-record/${observerRecords[0].observation_id}`
        : "/shared/current-past-observations",
      linkLabel: "Observations",
      done: observerFormSigned || Boolean(checkedSteps["or-complete-sign"]),
      autoSynced: observerFormSigned,
    },
    {
      id: "or-survey",
      title: `Submit observer post-evaluation survey (Due ${surveyEnd})`,
      meta: observerSurveySubmitted
        ? "Survey submitted"
        : "Share process feedback after the observation",
      linkTo: observerRecords[0]
        ? `/shared/post-evaluation-survey?pairingId=${observerRecords[0].pairing_id}`
        : "/shared/current-past-observations",
      linkLabel: "Survey",
      done: observerSurveySubmitted || Boolean(checkedSteps["or-survey"]),
      autoSynced: observerSurveySubmitted,
    },
  ];

  const notDueMilestones: MilestoneTask[] = [
    {
      id: "nd-verify-schedule",
      title: "Review evaluation cycle status and teaching availability",
      meta: nextDueSemester
        ? `Next scheduled evaluation: ${nextDueSemester} (no course registration required now)`
        : "Not due for observation this semester (course signup not required)",
      linkTo: "/shared/profile",
      linkLabel: "Profile Status",
      done: hasSavedAvailability || Boolean(checkedSteps["nd-verify-schedule"]),
      autoSynced: hasSavedAvailability,
    },
  ];

  const committeeMilestones: MilestoneTask[] = [
    {
      id: "ac-review-matching",
      title: `Review faculty signup requests and release observer matches (Due ${signupDeadlineLabel})`,
      meta:
        committeeStats.pendingRequests === 0
          ? "No pending registration requests"
          : `${committeeStats.pendingRequests} request(s) awaiting review`,
      linkTo: "/committee/faculty-matching",
      linkLabel: "Faculty Matching",
      done:
        committeeStats.pendingRequests === 0 &&
        Boolean(checkedSteps["ac-review-matching"]),
      autoSynced: false,
    },
    {
      id: "ac-unmatched",
      title: "Resolve or transfer any unmatched observees",
      meta:
        committeeStats.unmatchedCount === 0
          ? "All active observees matched"
          : `${committeeStats.unmatchedCount} unmatched observee(s) remaining`,
      linkTo: "/committee/unmatched-observees",
      linkLabel: "Unmatched Observees",
      done: Boolean(checkedSteps["ac-unmatched"]),
      autoSynced: false,
    },
    {
      id: "ac-pending-records",
      title: `Monitor open observation records and signatures (Due ${observationEnd})`,
      meta: `${committeeStats.openRecords} active observation record(s) in cycle`,
      linkTo: "/committee/pending-records",
      linkLabel: "Pending Records",
      done: Boolean(checkedSteps["ac-pending-records"]),
      autoSynced: false,
    },
    {
      id: "ac-surveys-kpi",
      title: `Audit post-evaluation survey completion and cycle KPIs (Due ${surveyEnd})`,
      meta: `${committeeStats.pendingSurveys} pending survey response(s)`,
      linkTo: "/committee/survey-tracking",
      linkLabel: "Survey Tracking",
      done: Boolean(checkedSteps["ac-surveys-kpi"]),
      autoSynced: false,
    },
  ];

  const toggleBuiltInStep = (id: string, autoSynced: boolean) => {
    if (autoSynced) return;
    const next = { ...checkedSteps, [id]: !checkedSteps[id] };
    setCheckedSteps(next);
    persistPlanner(next, customTasks);
  };

  const handleAddCustomTask = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    const nextCustom: CustomTask[] = [
      ...customTasks,
      { id: `note-${Date.now()}`, label: trimmed, done: false },
    ];
    setCustomTasks(nextCustom);
    setNewTaskText("");
    persistPlanner(checkedSteps, nextCustom);
  };

  const toggleCustomTask = (id: string) => {
    const nextCustom = customTasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setCustomTasks(nextCustom);
    persistPlanner(checkedSteps, nextCustom);
  };

  const removeCustomTask = (id: string) => {
    const nextCustom = customTasks.filter((t) => t.id !== id);
    setCustomTasks(nextCustom);
    persistPlanner(checkedSteps, nextCustom);
  };

  const activeBuiltInMilestones = isCommitteeMember
    ? committeeMilestones
    : isDueForEvaluation
    ? [
        ...observeeMilestones,
        ...(isInObserverPool ? observerMilestones : []),
      ]
    : isInObserverPool
    ? observerMilestones
    : notDueMilestones;

  const totalItems = activeBuiltInMilestones.length + customTasks.length;
  const completedItems =
    activeBuiltInMilestones.filter((m) => m.done).length +
    customTasks.filter((t) => t.done).length;
  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="dashboard-container">
      {/* Header matching A01 welcome style */}
      <div className="a01-page-header">
        <div className="a01-title-block">
          <h2>
            {isCommitteeMember
              ? "Faculty and Committee Overview"
              : "Faculty Dashboard"}
          </h2>
          <p className="s01-subtitle">
            Welcome back, <strong>{displayName}</strong>
          </p>
        </div>

        <div className="s01-header-meta">
          {dashboard?.cycle?.name && (
            <span className="a01-cycle-badge">
              Cycle: {String(dashboard.cycle.name)}
            </span>
          )}
          <span className="a01-phase-pill">
            Role:{" "}
            {isCommitteeMember
              ? "Assessment Committee"
              : isRegistered
              ? "Observee and Observer Pool"
              : isDueForEvaluation
              ? isOverdue
                ? "Due (Overdue)"
                : "Due This Cycle"
              : "Not Due This Cycle"}
          </span>
        </div>
      </div>

      {/* Collapsible Detailed Module Guide */}
      <CycleModuleGuideBanner
        storageKey={
          isCommitteeMember
            ? "s01_committee_module_guide_open"
            : "s01_faculty_module_guide_open"
        }
        eyebrow={
          isCommitteeMember
            ? "Committee and Shared Guide"
            : "Faculty Workflow Guide"
        }
        title={
          isCommitteeMember
            ? "Module Instructions and Cycle Responsibilities"
            : "How Each Faculty Module Works"
        }
        overview={
          isCommitteeMember ? COMMITTEE_OVERALL_BRIEF : FACULTY_OVERALL_BRIEF
        }
        modules={
          isCommitteeMember ? COMMITTEE_MODULES_GUIDE : FACULTY_MODULES_GUIDE
        }
        defaultOpen={true}
      />

      <section className="dashboard-phase s01-planner-section">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Workspace</span>
          <h3>
            {isCommitteeMember
              ? "Cycle Oversight and Committee Checklist"
              : "Current Cycle Status and My Checklist"}
          </h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>
            {isCommitteeMember
              ? "Committee Notice:"
              : isDueForEvaluation
              ? "Cycle Deadlines:"
              : "Evaluation Status:"}
          </strong>{" "}
          {dashboardLoading
            ? "Checking evaluation cycle deadlines..."
            : isCommitteeMember
            ? `Assessment Committee members are exempt from course registration. Signup cutoff is ${signupDeadlineLabel}, observations close ${observationEnd}, and surveys are due ${surveyEnd}.`
            : isRegistered
            ? `You are registered for the current cycle and placed in the Observer Pool. Observations close ${observationEnd} and surveys are due ${surveyEnd}.`
            : isDueForEvaluation
            ? `Action Required: You are ${
                isOverdue ? "overdue" : "due"
              } for evaluation this cycle. Please register 1 course section by ${signupDeadlineLabel} (observations close ${observationEnd}).`
            : nextDueSemester
            ? `You are not due for observation this semester (next due: ${nextDueSemester}). Course registration is not required unless you are participating.`
            : "You are not due for observation this semester. Course registration is only required for faculty who are due or overdue."}
        </div>

        {dashboardError && (
          <p className="signin-error-banner" role="alert">
            Could not load live dashboard data: {dashboardError}
          </p>
        )}

        <div className="s01-top-workspace">
          <div className="s01-status-card s05-section-accent-primary">
            <div className="s01-card-top-bar">
              <h3>Cycle Overview</h3>
              {dashboard && (
                <span
                  className={`s01-reg-pill ${
                    isCommitteeMember || isRegistered || !isDueForEvaluation
                      ? "is-registered"
                      : "is-unregistered"
                  }`}
                >
                  {isCommitteeMember
                    ? "Committee Oversight"
                    : isRegistered
                    ? "Registered"
                    : isDueForEvaluation
                    ? isOverdue
                      ? "Overdue"
                      : "Registration Due"
                    : "Not Due"}
                </span>
              )}
            </div>

            {dashboardLoading ? (
              <p className="s01-subtitle">Loading cycle status...</p>
            ) : isCommitteeMember ? (
              <div className="s01-status-metrics">
                <div className="s01-stat-box">
                  <span className="s01-stat-label">Participant Role</span>
                  <span className="s01-stat-val">Exempt (Committee)</span>
                </div>

                <div className="s01-stat-box">
                  <span className="s01-stat-label">Observation Deadline</span>
                  <span className="s01-stat-val">{observationEnd}</span>
                </div>

                <div className="s01-stat-box">
                  <span className="s01-stat-label">Survey Deadline</span>
                  <span className="s01-stat-val">{surveyEnd}</span>
                </div>
              </div>
            ) : (
              <div className="s01-status-metrics">
                <div className="s01-stat-box">
                  <span className="s01-stat-label">Cycle Status</span>
                  <span className="s01-stat-val">
                    {isRegistered
                      ? "Registered"
                      : isDueForEvaluation
                      ? "Action Needed"
                      : nextDueSemester
                      ? `Due ${nextDueSemester}`
                      : "Not Due"}
                  </span>
                </div>

                <div className="s01-stat-box">
                  <span className="s01-stat-label">Observation Deadline</span>
                  <span className="s01-stat-val">{observationEnd}</span>
                </div>

                <div className="s01-stat-box">
                  <span className="s01-stat-label">Faculty Rank</span>
                  <span className="s01-stat-val">{displayRank}</span>
                </div>
              </div>
            )}

            {isCommitteeMember ? (
              <Link to="/committee/dashboard" className="btn-accent-blue">
                Open Committee Command Center →
              </Link>
            ) : (
              !isRegistered &&
              isDueForEvaluation &&
              canUseFacultyModules && (
                <Link
                  to="/observee/course-selection"
                  className="btn-accent-blue"
                >
                  Complete Registration →
                </Link>
              )
            )}
          </div>

          {/* Collapsible Checklist Card */}
          <div className="s01-checklist-card s05-section-accent-sage">
            <div
              className={`s01-card-top-bar ${
                !isChecklistOpen ? "is-collapsed" : ""
              }`}
            >
              <h3>My Cycle To-Do and Notebook</h3>
              <div className="checklist-header-controls">
                <span className="s01-progress-badge">
                  {completedItems} / {totalItems} Done
                </span>
                <button
                  type="button"
                  className="btn-secondary checklist-toggle-btn"
                  aria-expanded={isChecklistOpen}
                  onClick={toggleChecklistOpen}
                >
                  {isChecklistOpen ? "Hide ▲" : "Show ▼"}
                </button>
              </div>
            </div>

            {isChecklistOpen ? (
              <>
                <div
                  className="s01-progress-track"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="s01-progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="s01-todo-list">
                  {isCommitteeMember ? (
                    <>
                      <div className="s04-track-header">
                        <span className="pill-badge pill-observer">
                          Assessment Committee Tasks
                        </span>
                      </div>
                      {committeeMilestones.map((item) => (
                        <div
                          key={item.id}
                          className={`s01-todo-item ${
                            item.done ? "is-done" : ""
                          }`}
                        >
                          <label className="s01-todo-left">
                            <input
                              type="checkbox"
                              checked={item.done}
                              disabled={item.autoSynced}
                              onChange={() =>
                                toggleBuiltInStep(item.id, item.autoSynced)
                              }
                            />
                            <span className="s01-todo-text-wrap">
                              <span className="s01-todo-title">
                                {item.title}
                              </span>
                              <span className="s01-todo-meta">{item.meta}</span>
                            </span>
                          </label>

                          {item.linkTo && item.linkLabel && (
                            <div className="s01-todo-actions">
                              <Link
                                to={item.linkTo}
                                className="s01-todo-go-link"
                              >
                                {item.linkLabel} →
                              </Link>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {isDueForEvaluation && (
                        <>
                          <div className="s04-track-header">
                            <span className="pill-badge pill-observee">
                              Observee Tasks
                            </span>
                          </div>
                          {observeeMilestones.map((item) => (
                            <div
                              key={item.id}
                              className={`s01-todo-item ${
                                item.done ? "is-done" : ""
                              }`}
                            >
                              <label className="s01-todo-left">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  disabled={item.autoSynced}
                                  onChange={() =>
                                    toggleBuiltInStep(item.id, item.autoSynced)
                                  }
                                />
                                <span className="s01-todo-text-wrap">
                                  <span className="s01-todo-title">
                                    {item.title}
                                  </span>
                                  <span className="s01-todo-meta">
                                    {item.meta}
                                  </span>
                                </span>
                              </label>

                              {item.linkTo && item.linkLabel && (
                                <div className="s01-todo-actions">
                                  <Link
                                    to={item.linkTo}
                                    className="s01-todo-go-link"
                                  >
                                    {item.linkLabel} →
                                  </Link>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {isInObserverPool && (
                        <>
                          <div
                            className={`s04-track-header ${
                              isDueForEvaluation ? "s01-track-spaced" : ""
                            }`}
                          >
                            <span className="pill-badge pill-observer">
                              Observer Pool Tasks
                            </span>
                          </div>
                          {observerMilestones.map((item) => (
                            <div
                              key={item.id}
                              className={`s01-todo-item ${
                                item.done ? "is-done" : ""
                              }`}
                            >
                              <label className="s01-todo-left">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  disabled={item.autoSynced}
                                  onChange={() =>
                                    toggleBuiltInStep(item.id, item.autoSynced)
                                  }
                                />
                                <span className="s01-todo-text-wrap">
                                  <span className="s01-todo-title">
                                    {item.title}
                                  </span>
                                  <span className="s01-todo-meta">
                                    {item.meta}
                                  </span>
                                </span>
                              </label>

                              {item.linkTo && item.linkLabel && (
                                <div className="s01-todo-actions">
                                  <Link
                                    to={item.linkTo}
                                    className="s01-todo-go-link"
                                  >
                                    {item.linkLabel} →
                                  </Link>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {!isDueForEvaluation && !isInObserverPool && (
                        <>
                          <div className="s04-track-header">
                            <span className="pill-badge pill-observee">
                              Cycle Status
                            </span>
                          </div>
                          {notDueMilestones.map((item) => (
                            <div
                              key={item.id}
                              className={`s01-todo-item ${
                                item.done ? "is-done" : ""
                              }`}
                            >
                              <label className="s01-todo-left">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  disabled={item.autoSynced}
                                  onChange={() =>
                                    toggleBuiltInStep(item.id, item.autoSynced)
                                  }
                                />
                                <span className="s01-todo-text-wrap">
                                  <span className="s01-todo-title">
                                    {item.title}
                                  </span>
                                  <span className="s01-todo-meta">
                                    {item.meta}
                                  </span>
                                </span>
                              </label>

                              {item.linkTo && item.linkLabel && (
                                <div className="s01-todo-actions">
                                  <Link
                                    to={item.linkTo}
                                    className="s01-todo-go-link"
                                  >
                                    {item.linkLabel} →
                                  </Link>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {customTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`s01-todo-item ${task.done ? "is-done" : ""}`}
                    >
                      <label className="s01-todo-left">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => toggleCustomTask(task.id)}
                        />
                        <span className="s01-todo-text-wrap">
                          <span className="s01-todo-title">{task.label}</span>
                          <span className="s01-todo-meta">Personal note</span>
                        </span>
                      </label>

                      <button
                        type="button"
                        className="s01-todo-remove-btn"
                        onClick={() => removeCustomTask(task.id)}
                        aria-label={`Remove ${task.label}`}
                        title="Remove note"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <form
                  className="s01-add-note-form"
                  onSubmit={handleAddCustomTask}
                >
                  <input
                    type="text"
                    className="s01-add-note-input"
                    placeholder="Add a personal reminder or observation note..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    maxLength={120}
                  />
                  <button type="submit" className="btn-secondary">
                    + Add
                  </button>
                </form>
              </>
            ) : (
              <p className="checklist-collapsed-hint">
                Checklist collapsed ({completedItems} of {totalItems} tasks
                completed). Click <strong>Show</strong> to view or add tasks.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Shared</span>
          <h3>General Modules</h3>
        </div>

        <div className="yellow-banner" role="status">
          <strong>Shared Deadlines:</strong> Observation records and dual
          signatures close on <strong>{observationEnd}</strong>, and
          post-evaluation surveys are due by <strong>{surveyEnd}</strong>.
        </div>

        <div className="card-grid">
          <article className="dashboard-card a01-action-card">
            <Link to="/shared/profile">
              <img
                src={profile_and_evaluation_status_card}
                alt="Profile and Evaluation Status"
              />
              <h4>Profile and Evaluation Status</h4>
              <p>View current status, hire level, due semester</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/shared/notifications">
              <img
                src={alerts_and_notifications_card}
                alt="Alerts and Notifications"
              />
              <h4>Alerts and Notifications</h4>
              <p>View status of any sent request(s), deadlines or more feedback</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>

          <article className="dashboard-card a01-action-card">
            <Link to="/shared/current-past-observations">
              <img
                src={current_and_past_observations_card}
                alt="Current and Past Observations"
              />
              <h4>Current and Past Observations</h4>
              <p>View observation status</p>
              <div className="a01-card-footer">
                <span className="a01-card-cta">Open →</span>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {canUseFacultyModules && (
        <>
          <section className="dashboard-phase">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Observee</span>
              <h3>Observee Modules</h3>
            </div>

            <div className="yellow-banner" role="status">
              <strong>Observee Deadline ({signupDeadlineLabel}):</strong>{" "}
              Faculty who are due or overdue must register 1 course section by{" "}
              <strong>{signupDeadlineLabel}</strong> and are automatically
              added to the Observer Pool.
            </div>

            <div className="card-grid">
              <article className="dashboard-card a01-action-card">
                <Link to="/observee/course-selection">
                  <img
                    src={course_and_section_selection_card}
                    alt="Course and Section Selection"
                  />
                  <h4>Course and Section Selection</h4>
                  <p>
                    Register or view my chosen class section for the current
                    evaluation cycle
                  </p>
                  <div className="a01-card-footer">
                    <span className="card-status">
                      {isRegistered
                        ? "Registered"
                        : isDueForEvaluation
                        ? "Registration Due"
                        : "Not Due"}
                    </span>
                    <span className="a01-card-cta">Open →</span>
                  </div>
                </Link>
              </article>

              <article className="dashboard-card a01-action-card">
                <Link to="/observee/observer-selection">
                  <img
                    src={observer_selection_matching_card}
                    alt="Observer Selection"
                  />
                  <h4>Observer Selection</h4>
                  <p>
                    Invite observers from my released list and see their
                    responses
                  </p>
                  <div className="a01-card-footer">
                    <span className="a01-card-cta">Open →</span>
                  </div>
                </Link>
              </article>
            </div>
          </section>

          <section className="dashboard-phase">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Observer</span>
              <h3>Observer Modules</h3>
            </div>

            <div className="yellow-banner" role="status">
              <strong>Observer Deadlines:</strong> Respond to incoming peer
              observation requests within 48 hours and complete your signed
              evaluation forms by <strong>{observationEnd}</strong>.
            </div>

            <div className="card-grid">
              <article className="dashboard-card a01-action-card">
                <Link to="/observer/observation-request">
                  <img
                    src={observation_record_management_card}
                    alt="Observation Requests"
                  />
                  <h4>Observation Requests</h4>
                  <p>Accept or decline requests to observe a colleague</p>
                  <div className="a01-card-footer">
                    <span className="a01-card-cta">Open →</span>
                  </div>
                </Link>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}