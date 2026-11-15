// src/pages/shared/S03FacultyNotifications.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Notification } from "../../api/types";

const CLEARED_STORAGE_KEY = "cleared_notification_ids";
const UNREAD_STORAGE_KEY = "manual_unread_notification_ids";

type FilterTab = "all" | "unread" | "read";

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

function getNotificationCategory(notification: Notification): {
  label: string;
  toneClass: string;
} {
  const typeLower = (notification.type || "").toLowerCase();
  const titleLower = (notification.title || "").toLowerCase();

  if (
    titleLower.includes("confirmed") ||
    titleLower.includes("accepted") ||
    titleLower.includes("approved") ||
    titleLower.includes("complete")
  ) {
    return { label: "Update", toneClass: "cat-success" };
  }

  if (
    titleLower.includes("reminder") ||
    titleLower.includes("deadline") ||
    titleLower.includes("declined") ||
    titleLower.includes("expired") ||
    typeLower.includes("reminder")
  ) {
    return { label: "Action Needed", toneClass: "cat-warning" };
  }

  if (
    titleLower.includes("invitation") ||
    titleLower.includes("observer") ||
    titleLower.includes("request") ||
    typeLower.includes("invitation") ||
    typeLower.includes("candidate")
  ) {
    return { label: "Matching and Invites", toneClass: "cat-invite" };
  }

  return { label: "Cycle Notice", toneClass: "" };
}

export default function S03FacultyNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const response = await facultyApi.notifications();
      const clearedIds = getStoredIds(CLEARED_STORAGE_KEY);
      const manualUnreadIds = getStoredIds(UNREAD_STORAGE_KEY);

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

    const handleSync = () => {
      void loadNotifications();
    };

    window.addEventListener("notifications-changed", handleSync);
    window.addEventListener("demo-reset", handleSync);
    return () => {
      window.removeEventListener("notifications-changed", handleSync);
      window.removeEventListener("demo-reset", handleSync);
    };
  }, []);

  async function handleMarkAllRead() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await facultyApi.markAllRead();
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
      updatedManualUnread = Array.from(
        new Set([...manualUnreadIds, notification.notification_id])
      );
    } else {
      updatedManualUnread = manualUnreadIds.filter(
        (id) => id !== notification.notification_id
      );
    }
    saveStoredIds(UNREAD_STORAGE_KEY, updatedManualUnread);

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

    if (
      titleLower.includes("observation confirmed") ||
      titleLower.includes("pairing confirmed") ||
      titleLower.includes("assignment confirmed") ||
      messageLower.includes("observation assignment has been confirmed") ||
      messageLower.includes("confirmed your observation")
    ) {
      return (
        <Link
          to="/shared/current-past-observations"
          className="notif-action-link"
        >
          View Current and Past Observations →
        </Link>
      );
    }

    if (
      titleLower.includes("invitation response") ||
      titleLower.includes("invitation accepted") ||
      titleLower.includes("invitation declined") ||
      titleLower.includes("invitation expired") ||
      messageLower.includes("accepted your invitation") ||
      messageLower.includes("accepted your observation") ||
      messageLower.includes("declined your invitation") ||
      messageLower.includes("declined your observation")
    ) {
      return (
        <Link
          to="/observee/observer-selection#responses"
          className="notif-action-link"
        >
          Review Observer Response →
        </Link>
      );
    }

    if (
      titleLower.includes("observer candidate") ||
      titleLower.includes("matched observer") ||
      messageLower.includes("ready for selection") ||
      messageLower.includes("released")
    ) {
      return (
        <Link to="/observee/observer-selection" className="notif-action-link">
          Go to Observer Selection →
        </Link>
      );
    }

    switch (typeLower) {
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

      case "candidate_selection":
      case "observer_candidates":
      case "matches_released":
        return (
          <Link to="/observee/observer-selection" className="notif-action-link">
            Go to Observer Selection →
          </Link>
        );

      case "invitation_accepted":
      case "invitation_declined":
      case "invitation_expired":
      case "invitation_response":
      case "confirm_pairing":
        return (
          <Link
            to="/observee/observer-selection#responses"
            className="notif-action-link"
          >
            Review Observer Response →
          </Link>
        );

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

      case "pairing_confirmed":
      case "observation_confirmed":
      case "assignment_confirmed":
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
            View Current and Past Observations →
          </Link>
        );

      case "profile_updated":
      case "evaluation_status":
      case "cycle_assigned":
      case "cycle_transferred":
        return (
          <Link to="/shared/profile" className="notif-action-link">
            View Profile and Status →
          </Link>
        );

      case "course_change_request":
        return (
          <Link to="/committee/faculty-matching" className="notif-action-link">
            Review in Faculty Matching →
          </Link>
        );

      case "pending_record_review":
        return (
          <Link to="/committee/pending-records" className="notif-action-link">
            Review Pending Records →
          </Link>
        );

      case "committee_survey_tracking":
        return (
          <Link to="/committee/survey-tracking" className="notif-action-link">
            View Survey Tracking →
          </Link>
        );

      default:
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

        if (
          titleLower.includes("course change request") ||
          messageLower.includes("requested a course change")
        ) {
          return (
            <Link
              to="/committee/faculty-matching"
              className="notif-action-link"
            >
              Review in Faculty Matching →
            </Link>
          );
        }

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

        if (
          titleLower.includes("profile") ||
          titleLower.includes("evaluation status") ||
          titleLower.includes("cycle")
        ) {
          return (
            <Link to="/shared/profile" className="notif-action-link">
              View Profile and Status →
            </Link>
          );
        }

        if (
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
              View Current and Past Observations →
            </Link>
          );
        }

        return (
          <Link to="/shared/faculty-dashboard" className="notif-action-link">
            Go to Dashboard →
          </Link>
        );
    }
  }

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notifications.filter((n) => {
      if (activeTab === "unread" && n.is_read) return false;
      if (activeTab === "read" && !n.is_read) return false;
      if (!query) return true;
      return (
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    });
  }, [notifications, activeTab, searchQuery]);

  const unreadNotifications = filteredNotifications.filter((n) => !n.is_read);
  const readNotifications = filteredNotifications.filter((n) => n.is_read);
  const totalReadCount = notifications.length - unreadCount;

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Header matching A03-A08 */}
      <div className="committee-page-header">
        <h2>Notifications</h2>

        {!loading && notifications.length > 0 && (
          <div className="committee-page-header-meta">
            <span className="a01-cycle-badge">{unreadCount} Unread</span>
          </div>
        )}
      </div>

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

      {loading ? (
        <div className="a07-state-box">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="a07-state-box">
          You are all caught up - no notifications right now.
        </div>
      ) : (
        <>
          {/* Card-Wrapped Filter Tabs + Search Bar */}
          <div className="s03-toolbar">
            <div className="s03-filter-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "all"}
                className={`s03-filter-tab ${
                  activeTab === "all" ? "is-active" : ""
                }`}
                onClick={() => setActiveTab("all")}
              >
                All
                <span className="s03-tab-count">{notifications.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "unread"}
                className={`s03-filter-tab ${
                  activeTab === "unread" ? "is-active" : ""
                }`}
                onClick={() => setActiveTab("unread")}
              >
                Unread
                <span className="s03-tab-count">{unreadCount}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "read"}
                className={`s03-filter-tab ${
                  activeTab === "read" ? "is-active" : ""
                }`}
                onClick={() => setActiveTab("read")}
              >
                Read
                <span className="s03-tab-count">{totalReadCount}</span>
              </button>
            </div>

            <input
              type="search"
              className="s03-search-input"
              placeholder="Filter notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter notifications"
            />
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="a07-state-box">
              No notifications match your current filter.
            </div>
          ) : (
            <div className="notif-sections-wrapper">
              {activeTab !== "read" && (
                <section className="s03-section-card s05-section-accent-primary">
                  <div className="notif-section-header">
                    <div className="s03-section-title-group">
                      <span className="a01-phase-pill">Inbox</span>
                      <h3>Unread ({unreadNotifications.length})</h3>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="btn-secondary notif-clear-btn"
                        onClick={handleMarkAllRead}
                        disabled={saving}
                      >
                        {saving ? "Updating..." : "Mark All as Read"}
                      </button>
                    )}
                  </div>

                  {unreadNotifications.length === 0 ? (
                    <div className="notif-empty-subtext">
                      No unread notifications to display.
                    </div>
                  ) : (
                    <div className="notif-list-container s03-list-tight">
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
              )}

              {activeTab !== "unread" && (
                <section className="s03-section-card">
                  <div className="notif-section-header">
                    <div className="s03-section-title-group">
                      <span className="a01-phase-pill">Archive</span>
                      <h3>Read ({readNotifications.length})</h3>
                    </div>

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
                    <div className="notif-list-container s03-list-tight">
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
              )}
            </div>
          )}
        </>
      )}

      <div className="dashboard-center-action notif-return-action">
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
  const category = getNotificationCategory(notification);

  return (
    <article
      className={`notif-card-item s03-card-elevated ${
        notification.is_read ? "notif-read" : "notif-unread"
      }`}
    >
      <div className="notif-card-top-row">
        <div className="s03-title-cluster">
          <span className={`s03-category-tag ${category.toneClass}`}>
            {category.label}
          </span>
          <h3 className="notif-card-title">{notification.title}</h3>
        </div>

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