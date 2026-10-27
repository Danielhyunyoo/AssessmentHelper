import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { facultyApi } from "../../api/endpoints";
import type { Notification } from "../../api/types";

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
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
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
      await loadNotifications();
      setSuccess("Notifications marked as read.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
  <div className="dashboard-container">
    {/* 1. TOP-LEFT TEXT LINK */}
    <div className="back-dashboard-wrapper">
      <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
        ← Back to Dashboard
      </Link>
    </div>
    
      <h2>Notifications</h2>

      <p>
        <strong>Unread notifications:</strong> {unreadCount}
      </p>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          className="primary-btn"
          onClick={handleMarkAllRead}
          disabled={saving || loading || unreadCount === 0}
        >
          {saving ? "Updating..." : "Mark All as Read"}
        </button>
      </div>

      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <section className="dashboard-phase">
          {notifications.map((notification) => (
            <article
              key={notification.notification_id}
              className="table-container theme-blue"
              style={{ padding: "1rem", marginBottom: "1rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <h3>{notification.title}</h3>
                <span>
                  {notification.is_read ? "Read" : "Unread"}
                </span>
              </div>

              <p>{notification.message}</p>

              <p>
                <small>
                  {new Date(notification.created_at).toLocaleString()}
                </small>
              </p>

              {notification.type === "registration" && (
                <p>
                  <Link to="/observee/course-selection">
                    View course selection
                  </Link>
                </p>
              )}
            </article>
          ))}
        </section>
      )}

{/* Return to Dashboard Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-pill-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}