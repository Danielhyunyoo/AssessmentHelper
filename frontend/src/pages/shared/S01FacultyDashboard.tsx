// src/pages/shared/S01FacultyDashboard.tsx
import { useEffect, useState, type FormEvent } from "react";
import { authApi, facultyApi } from "../../api/endpoints";
import type { FacultyDashboard, Professor, RegistrationStatus } from "../../api/types";
import { Link, useNavigate } from "react-router-dom";

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

export default function S01FacultyDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FacultyDashboard | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatus | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Per-member checklist state stored in localStorage
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");

  const canUseFacultyModules = !!currentUser && currentUser.role !== "admin";

  const loadDashboard = () => {
    setDashboardLoading(true);
    Promise.all([facultyApi.dashboard(), facultyApi.registrationStatus()])
      .then(([dash, reg]) => {
        setDashboard(dash);
        setRegistration(reg);
      })
      .catch((err: unknown) => {
        setDashboardError(
          err instanceof Error
            ? err.message
            : "Could not load dashboard information."
        );
      })
      .finally(() => setDashboardLoading(false));
  };

  useEffect(() => {
    loadDashboard();

    const handleDashboardUpdate = () => {
      loadDashboard();
    };

    window.addEventListener("notifications-changed", handleDashboardUpdate);
    window.addEventListener("simulated-date-changed", handleDashboardUpdate);
    window.addEventListener("demo-date-changed", handleDashboardUpdate);

    return () => {
      window.removeEventListener("notifications-changed", handleDashboardUpdate);
      window.removeEventListener("simulated-date-changed", handleDashboardUpdate);
      window.removeEventListener("demo-date-changed", handleDashboardUpdate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    authApi
      .session()
      .then(({ professor }) => {
        if (!cancelled) setCurrentUser(professor);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false);
      });

    return () => {
      cancelled = true;
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
      }
    } catch {
      // Ignore malformed storage
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

  // Safely resolve display name and rank from Professor object
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
    (typeof userRecord.hire_level === "string" && userRecord.hire_level.trim()) ||
    (typeof userRecord.rank === "string" && userRecord.rank.trim()) ||
    "Faculty Member";

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
    : "NOV 30";

  const isRegistered = Boolean(
    dashboard?.is_registered || registration?.is_registered
  );

  const builtInMilestones = [
    {
      id: "register-course",
      title: "Register & submit class section + proposed dates",
      meta: isRegistered
        ? "Completed for current cycle"
        : "Required before inviting observers",
      linkTo: "/observee/course-selection",
      linkLabel: "Course Selection",
      done: isRegistered || Boolean(checkedSteps["register-course"]),
      autoSynced: isRegistered,
    },
    {
      id: "select-observers",
      title: "Invite or review matched peer observers",
      meta: "Check your released observer list & responses",
      linkTo: "/observee/observer-selection",
      linkLabel: "Observer Selection",
      done: Boolean(checkedSteps["select-observers"]),
      autoSynced: false,
    },
    {
      id: "respond-requests",
      title: "Respond to incoming peer observation requests",
      meta: "Accept or decline within 48 hours",
      linkTo: "/observer/observation-request",
      linkLabel: "Requests",
      done: Boolean(checkedSteps["respond-requests"]),
      autoSynced: false,
    },
    {
      id: "complete-records",
      title: `Complete & sign observation records (Due ${observationEnd})`,
      meta: "Review ongoing observations and submit feedback survey",
      linkTo: "/shared/current-past-observations",
      linkLabel: "Observations",
      done: Boolean(checkedSteps["complete-records"]),
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

  const totalItems = builtInMilestones.length + customTasks.length;
  const completedItems =
    builtInMilestones.filter((m) => m.done).length +
    customTasks.filter((t) => t.done).length;
  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="dashboard-container">
      {/* Personalized Page Header */}
      <div className="a01-page-header">
        <div>
          <h2>Faculty Dashboard</h2>
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
            Role: {currentUser.role || "Faculty"}
          </span>
        </div>
      </div>

      {/* Current Registration + Personal Cycle Checklist & Planner */}
      <section className="dashboard-phase s01-planner-section">
        <h3>Current Registration & My Cycle Checklist</h3>

        <div className="yellow-banner" role="status">
          <strong>Important Notice:</strong>{" "}
          {dashboardLoading
            ? "Checking evaluation cycle deadlines..."
            : isRegistered
            ? `You are registered for the current cycle. Observation deadline is ${observationEnd}.`
            : "Action Required: Please register and select your course section before the cycle deadline."}
        </div>

        {dashboardError && (
          <p className="signin-error-banner" role="alert">
            Could not load live dashboard data: {dashboardError}
          </p>
        )}

        <div className="s01-top-workspace">
          {/* Left Card: Registration & Deadline Snapshot */}
          <div className="s01-status-card">
            <div className="s01-card-top-bar">
              <h3>Cycle Overview</h3>
              {dashboard && (
                <span
                  className={`s01-reg-pill ${
                    isRegistered ? "is-registered" : "is-unregistered"
                  }`}
                >
                  {isRegistered ? "Registered" : "Not Registered"}
                </span>
              )}
            </div>

            {dashboardLoading ? (
              <p className="s01-subtitle">Loading registration status...</p>
            ) : (
              <div className="s01-status-metrics">
                <div className="s01-stat-box">
                  <span className="s01-stat-label">Registration Status</span>
                  <span className="s01-stat-val">
                    {isRegistered ? "Registered" : "Action Needed"}
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

            {!isRegistered && canUseFacultyModules && (
              <Link to="/observee/course-selection" className="btn-accent-blue">
                Complete Registration →
              </Link>
            )}
          </div>

          {/* Right Card: Interactive Member Checklist & Personal Notebook */}
          <div className="s01-checklist-card">
            <div className="s01-card-top-bar">
              <h3>My Cycle To-Do & Notebook</h3>
              <span className="s01-progress-badge">
                {completedItems} / {totalItems} Done
              </span>
            </div>

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
              {builtInMilestones.map((item) => (
                <div
                  key={item.id}
                  className={`s01-todo-item ${item.done ? "is-done" : ""}`}
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
                      <span className="s01-todo-title">{item.title}</span>
                      <span className="s01-todo-meta">{item.meta}</span>
                    </span>
                  </label>

                  <div className="s01-todo-actions">
                    <Link to={item.linkTo} className="s01-todo-go-link">
                      {item.linkLabel} →
                    </Link>
                  </div>
                </div>
              ))}

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

            <form className="s01-add-note-form" onSubmit={handleAddCustomTask}>
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
          </div>
        </div>
      </section>

      {/* General Modules Section */}
      <section className="dashboard-phase">
        <div className="a01-phase-title-group">
          <span className="a01-phase-pill">Shared</span>
          <h3>General Modules</h3>
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
          {/* Observee Modules Section */}
          <section className="dashboard-phase">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Observee</span>
              <h3>Observee Modules</h3>
            </div>

            <div className="yellow-banner" role="status">
              <strong>Observee Reminder:</strong> Ensure your course section and
              proposed observation dates are submitted before inviting
              observers.
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
                      {isRegistered ? "Registered" : "Not Registered"}
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

          {/* Observer Modules Section */}
          <section className="dashboard-phase">
            <div className="a01-phase-title-group">
              <span className="a01-phase-pill">Observer</span>
              <h3>Observer Modules</h3>
            </div>

            <div className="yellow-banner" role="status">
              <strong>Observer Reminder:</strong> Respond to incoming peer
              observation requests within 48 hours and sign observation records
              promptly.
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