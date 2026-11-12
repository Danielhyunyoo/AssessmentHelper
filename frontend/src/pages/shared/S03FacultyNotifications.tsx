// src/pages/shared/S03FacultyNotifications.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Notification } from "../../api/types";

const CLEARED_STORAGE_KEY = "cleared_notification_ids";
const UNREAD_STORAGE_KEY = "manual_unread_notification_ids";

function getStoredIds(key: string): number[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as number[]) : [];
  } catch {
    return [];
  }
}

function saveStoredIds(key: string, ids: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
}

export default function S03FacultyNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await facultyApi.notifications();
      const clearedIds = getStoredIds(CLEARED_STORAGE_KEY);
      const manualUnreadIds = getStoredIds(UNREAD_STORAGE_KEY);

      // Filter cleared notifications and apply manual unread state overrides
      const activeNotifications = (response.notifications ?? [])
        .filter((n) => !clearedIds.includes(n.notification_id))
        .map((n) => ({
          ...n,
          is_read: manualUnreadIds.includes(n.notification_id)
            ? false
            : n.is_read,
        }));

      setNotifications(activeNotifications);
      setUnreadCount(activeNotifications.filter((n) => !n.is_read).length);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function handleMarkAllRead() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await facultyApi.markAllRead();
      // Clear manual unread overrides when marking all read
      saveStoredIds(UNREAD_STORAGE_KEY, []);
      window.dispatchEvent(new Event("notifications-changed"));
      await loadNotifications();
      setSuccess("All notifications marked as read.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update notifications."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReadStatus(notification: Notification) {
    setError("");
    setSuccess("");

    const isCurrentlyRead = notification.is_read;
    const manualUnreadIds = getStoredIds(UNREAD_STORAGE_KEY);

    let updatedManualUnread: number[];
    if (isCurrentlyRead) {
      // Adding to manual unread list
      updatedManualUnread = Array.from(
        new Set([...manualUnreadIds, notification.notification_id])
      );
    } else {
      // Removing from manual unread list
      updatedManualUnread = manualUnreadIds.filter(
        (id) => id !== notification.notification_id
      );
    }
    saveStoredIds(UNREAD_STORAGE_KEY, updatedManualUnread);

    // Update local UI state immediately
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notification.notification_id
          ? { ...n, is_read: !isCurrentlyRead }
          : n
      )
    );

    setUnreadCount((prev) =>
      isCurrentlyRead ? prev + 1 : Math.max(0, prev - 1)
    );

    if (!isCurrentlyRead) {
      try {
        await facultyApi.markRead(notification.notification_id);
      } catch {
        // Ignore backend endpoint errors if any
      }
    }

    // Broadcast change so the Header bell badge updates instantly
    window.dispatchEvent(new Event("notifications-changed"));
  }

  const handleClearReadNotifications = () => {
    const readIds = notifications
      .filter((n) => n.is_read)
      .map((n) => n.notification_id);

    if (readIds.length === 0) return;

    const existingCleared = getStoredIds(CLEARED_STORAGE_KEY);
    saveStoredIds(
      CLEARED_STORAGE_KEY,
      Array.from(new Set([...existingCleared, ...readIds]))
    );

    setNotifications((prev) => prev.filter((n) => !n.is_read));
    setSuccess("Cleared read notifications.");
    window.dispatchEvent(new Event("notifications-changed"));
  };

  function renderNotificationLink(notification: Notification) {
    const typeLower = (notification.type || "").toLowerCase().trim();
    const titleLower = (notification.title || "").toLowerCase();
    const messageLower = (notification.message || "").toLowerCase();

    switch (typeLower) {
      // E01 — Course and Section Selection
      case "registration":
      case "registration_open":
      case "registration_reminder":
      case "course_selection":
      case "course_change_approved":
      case "course_change_declined":
      case "availability_reminder":
        return (
          <Link to="/observee/course-selection" className="notif-action-link">
            Go to Course Selection →
          </Link>
        );

      // E02 — Observer Selection (Candidates Released & Invitation Responses)
      case "candidate_selection":
      case "observer_candidates":
      case "matches_released":
      case "invitation_accepted":
      case "invitation_declined":
      case "invitation_expired":
      case "invitation_response":
      case "confirm_pairing":
        return (
          <Link to="/observee/observer-selection" className="notif-action-link">
            Go to Observer Selection →
          </Link>
        );

      // O01 — Observation Request (Incoming Invite for Observer)
      case "invitation":
      case "observation_invitation":
      case "observation_request":
      case "invite_received":
      case "invitation_reminder":
        return (
          <Link to="/observer/observation-request" className="notif-action-link">
            View Observation Request →
          </Link>
        );

      // S04 — Current and Past Observations (Confirmed Visits, S05 Observation Record, & S06 Post-Evaluation Survey)
      case "pairing_confirmed":
      case "observation_scheduled":
      case "upcoming_observation":
      case "observation_reminder":
      case "observation_complete":
      case "observation_completed":
      case "record_submitted":
      case "form_submitted":
      case "survey_available":
      case "survey_reminder":
      case "post_evaluation_survey":
        return (
          <Link
            to="/shared/current-past-observations"
            className="notif-action-link"
          >
            View Current &amp; Past Observations →
          </Link>
        );

      // S02 — Profile and Evaluation Status
      case "profile_updated":
      case "evaluation_status":
      case "cycle_assigned":
      case "cycle_transferred":
        return (
          <Link to="/shared/profile" className="notif-action-link">
            View Profile &amp; Status →
          </Link>
        );

      // A02 — Committee Faculty Matching (Course Change Requests)
      case "course_change_request":
        return (
          <Link to="/committee/matching" className="notif-action-link">
            Review in Faculty Matching →
          </Link>
        );

      // A05 — Committee Pending Records
      case "pending_record_review":
        return (
          <Link to="/committee/pending-records" className="notif-action-link">
            Review Pending Records →
          </Link>
        );

      // A06 — Committee Survey Tracking
      case "committee_survey_tracking":
        return (
          <Link to="/committee/survey-tracking" className="notif-action-link">
            View Survey Tracking →
          </Link>
        );

      // Fallback matching by notification title/message keywords
      default:
        // 1. Incoming observer request -> O01
        if (
          titleLower.includes("observation invitation") ||
          titleLower.includes("observation request") ||
          messageLower.includes("new observation request") ||
          messageLower.includes("invited you to observe") ||
          messageLower.includes("respond to observation")
        ) {
          return (
            <Link
              to="/observer/observation-request"
              className="notif-action-link"
            >
              View Observation Request →
            </Link>
          );
        }

        // 2. Observer candidates released or observer responded -> E02
        if (
          titleLower.includes("observer candidate") ||
          titleLower.includes("matched observer") ||
          titleLower.includes("invitation accepted") ||
          titleLower.includes("invitation declined") ||
          titleLower.includes("invitation expired") ||
          messageLower.includes("released") ||
          messageLower.includes("accepted your observation") ||
          messageLower.includes("declined your observation")
        ) {
          return (
            <Link
              to="/observee/observer-selection"
              className="notif-action-link"
            >
              Go to Observer Selection →
            </Link>
          );
        }

        // 3. Course change request for AC -> A02
        if (
          titleLower.includes("course change request") ||
          messageLower.includes("requested a course change")
        ) {
          return (
            <Link to="/committee/matching" className="notif-action-link">
              Review in Faculty Matching →
            </Link>
          );
        }

        // 4. Course registration / availability / change status -> E01
        if (
          titleLower.includes("registration") ||
          titleLower.includes("course selection") ||
          titleLower.includes("course change") ||
          messageLower.includes("select a course") ||
          messageLower.includes("signup deadline")
        ) {
          return (
            <Link to="/observee/course-selection" className="notif-action-link">
              Go to Course Selection →
            </Link>
          );
        }

        // 5. Profile / cycle transfer / status -> S02
        if (
          titleLower.includes("profile") ||
          titleLower.includes("evaluation status") ||
          titleLower.includes("cycle")
        ) {
          return (
            <Link to="/shared/profile" className="notif-action-link">
              View Profile &amp; Status →
            </Link>
          );
        }

        // 6. Confirmed pairing / observation record / post-evaluation survey -> S04
        if (
          titleLower.includes("confirmed") ||
          titleLower.includes("scheduled") ||
          titleLower.includes("survey") ||
          titleLower.includes("record") ||
          titleLower.includes("observation") ||
          messageLower.includes("observation")
        ) {
          return (
            <Link
              to="/shared/current-past-observations"
              className="notif-action-link"
            >
              View Current &amp; Past Observations →
            </Link>
          );
        }

        // 7. General fallback -> S01 Dashboard
        return (
          <Link to="/shared/faculty-dashboard" className="notif-action-link">
            Go to Dashboard →
          </Link>
        );
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Notifications</h2>

      {error && (
        <div role="alert" className="empty-state-banner">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="feedback-banner-success">
          {success}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="empty-state-banner">You have no notifications yet.</div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="notif-page-header-row">
          <div className="notif-count-badge">
            Unread notifications: <strong>{unreadCount}</strong>
          </div>

          <button
            type="button"
            className="btn-secondary notif-mark-read-btn"
            onClick={handleMarkAllRead}
            disabled={saving || unreadCount === 0}
          >
            {saving ? "Updating..." : "Mark All as Read"}
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading notifications...</p>
      ) : (
        notifications.length > 0 && (
          <div className="notif-sections-wrapper">
            <section className="notif-section">
              <div className="notif-section-header">
                <h3>Unread ({unreadNotifications.length})</h3>
              </div>

              {unreadNotifications.length === 0 ? (
                <div className="notif-empty-subtext">
                  No unread notifications to display.
                </div>
              ) : (
                <div className="notif-list-container">
                  {unreadNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.notification_id}
                      notification={notification}
                      onToggleStatus={handleToggleReadStatus}
                      renderLink={renderNotificationLink}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="notif-section" style={{ marginTop: "2rem" }}>
              <div className="notif-section-header">
                <h3>Read ({readNotifications.length})</h3>
                {readNotifications.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary notif-clear-btn"
                    onClick={handleClearReadNotifications}
                  >
                    Clear Read Notifications
                  </button>
                )}
              </div>

              {readNotifications.length === 0 ? (
                <div className="notif-empty-subtext">
                  No read notifications to display.
                </div>
              ) : (
                <div className="notif-list-container">
                  {readNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.notification_id}
                      notification={notification}
                      onToggleStatus={handleToggleReadStatus}
                      renderLink={renderNotificationLink}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )
      )}

      <div className="dashboard-center-action" style={{ marginTop: "2.5rem" }}>
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onToggleStatus,
  renderLink,
}: {
  notification: Notification;
  onToggleStatus: (notification: Notification) => void;
  renderLink: (notification: Notification) => React.ReactNode;
}) {
  const linkElement = renderLink(notification);

  return (
    <article
      className={`notif-card-item ${
        notification.is_read ? "notif-read" : "notif-unread"
      }`}
    >
      <div className="notif-card-top-row">
        <h3 className="notif-card-title">{notification.title}</h3>
        <div className="notif-top-right-group">
          <span
            className={`notif-status-pill ${
              notification.is_read ? "pill-read" : "pill-unread"
            }`}
          >
            {notification.is_read ? "Read" : "Unread"}
          </span>
          <button
            type="button"
            onClick={() => onToggleStatus(notification)}
            className="notif-toggle-btn"
          >
            {notification.is_read ? "Mark as unread" : "Mark as read"}
          </button>
        </div>
      </div>

      <p className="notif-card-message">{notification.message}</p>

      <div className="notif-card-footer">
        <span className="notif-card-timestamp">
          {new Date(notification.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>

        {linkElement}
      </div>
    </article>
  );
}