// src/components/Header.tsx
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/brand-symbol.png";
import home from "../assets/home_icon.png";
import bellDefault from "../assets/default_bell_icon.png";
import bellActive from "../assets/active_notifications_bell_icon.png";
import profileIcon from "../assets/profile_icon.png";
import avatarPlaceholder from "../assets/avatar.png";
import { authApi, facultyApi } from "../api/endpoints";
import type { Notification, Professor } from "../api/types";

interface NotificationPreview {
  id: string;
  title: string;
  time: string;
  unread: boolean;
}

export default function Header() {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [headerError, setHeaderError] = useState("");
  const [backendUnreadCount, setBackendUnreadCount] = useState(0);

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotifOpen((prev) => !prev);
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen((prev) => !prev);
    setIsNotifOpen(false);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  // Mark notification as read when clicked
  const handleNotificationClick = async (id: string) => {
    try {
      const notification = notifications.find((n) => n.id === id);

      if (notification?.unread) {
        await facultyApi.markRead(Number(id));
        setBackendUnreadCount((count) => Math.max(0, count - 1));

        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        );

        setHasUnreadNotifications((prev) => {
          const remaining = notifications.filter(
            (n) => n.id !== id && n.unread
          ).length;
          return remaining > 0 || (prev && remaining > 0);
        });
      }
    } catch {
      setHeaderError("Unable to mark this notification as read.");
    } finally {
      closeAllMenus();
      navigate("/shared/notifications");
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setHeaderError("");

    try {
      await authApi.logout();
    } catch (err) {
      setHeaderError(
        err instanceof Error ? err.message : "Unable to sign out cleanly."
      );
      // Still navigate away; the backend request may have failed because
      // the session has already expired.
    } finally {
      closeAllMenus();
      setCurrentUser(null);
      navigate("/login/signin", { replace: true });
      setSigningOut(false);
    }
  };

  // Close dropdown popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadHeaderData() {
      try {
        const [notificationResponse, profileResponse] = await Promise.all([
          facultyApi.notifications(),
          facultyApi.profile(),
        ]);

        if (cancelled) return;

        const previews = (notificationResponse.notifications ?? []).slice(0, 3);

        setNotifications(
          previews.map((n: Notification) => ({
            id: String(n.notification_id),
            title: n.title,
            time: new Date(n.created_at).toLocaleString(),
            unread: !n.is_read,
          }))
        );

        setHasUnreadNotifications(notificationResponse.unread_count > 0);
        setBackendUnreadCount(notificationResponse.unread_count);
        setCurrentUser(profileResponse.professor);
      } catch {
        // Keep the header usable if an endpoint is temporarily unavailable.
        if (!cancelled) {
          setHeaderError("Some header information could not be loaded.");
        }
      }
    }

    void loadHeaderData();

    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = backendUnreadCount;

  return (
    <>
      <header>
        {headerError && (
          <p role="status" style={{ color: "#b91c1c", fontSize: "0.8rem" }}>
            {headerError}
          </p>
        )}
        {/* Brand Header */}
        <div id="logo">
          <img src={logo} alt="UTD Logo" className="header-logo" />
          <h1>UTD Assessment Helper</h1>
        </div>

        <nav id="user-shortcuts" style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
          {/* Home Link */}
          <Link to="/" title="Go to Home" onClick={closeAllMenus}>
            <img className="icon" src={home} alt="Home" />
          </Link>

          {/* Notifications Dropdown Container */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={toggleNotifications}
              title="Notifications"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <img
                className="icon"
                src={unreadCount > 0 && hasUnreadNotifications ? bellActive : bellDefault}
                alt="Notifications"
              />
            </button>

            {/* Notifications Popover Menu */}
            {isNotifOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "125%",
                  right: 0,
                  width: "300px",
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e2e8f0",
                  zIndex: 1000,
                  overflow: "hidden",
                  padding: "0.75rem",
                }}
              >
                <div style={{ padding: "0.5rem 0.5rem 0.75rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em" }}>
                    NOTIFICATIONS
                  </span>
                  <span style={{ fontSize: "0.75rem", backgroundColor: "#fee2e2", color: "#991b1b", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: "700" }}>
                    {unreadCount} New
                  </span>
                </div>

                <div style={{ maxHeight: "220px", overflowY: "auto", padding: "0.25rem 0" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      No new notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id)}
                        className={`menu-item-hover ${n.unread ? "notif-unread-highlight" : "notif-read-item"}`}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <p style={{ margin: 0, color: "#1e293b", fontWeight: n.unread ? "700" : "500" }}>{n.title}</p>
                        <span style={{ fontSize: "0.75rem", color: n.unread ? "#166534" : "#94a3b8" }}>{n.time}</span>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus();
                      navigate("/shared/notifications");
                    }}
                    className="menu-item-hover"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#1e293b",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    View All Notifications →
                  </button>

                  {/* Simulator Toggle for Demo Testing */}
                  <div style={{ marginTop: "0.5rem", paddingTop: "0.4rem", borderTop: "1px dashed #cbd5e1", textAlign: "center" }}>
                    <label style={{ fontSize: "0.75rem", color: "#64748b", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <input
                        type="checkbox"
                        checked={hasUnreadNotifications}
                        onChange={(e) => {
                          setHasUnreadNotifications(e.target.checked);
                          if (e.target.checked) {
                            setNotifications((prev) =>
                              prev.map((n, i) => (i < 2 ? { ...n, unread: true } : n))
                            );
                          }
                        }}
                      />
                      <span>Simulate Active Bell Dot</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Quick Menu Container */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={toggleProfile}
              title="Profile Settings"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <img className="icon" src={profileIcon} alt="Profile" />
            </button>

            {/* Profile Popover Menu */}
            {isProfileOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "125%",
                  right: 0,
                  width: "280px",
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e2e8f0",
                  zIndex: 1000,
                  padding: "1rem",
                }}
              >
                {/* User Header Section */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingBottom: "0.85rem", borderBottom: "1px solid #f1f5f9" }}>
                  <img
                    src={avatarPlaceholder}
                    alt="User Avatar"
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", fontWeight: "700" }}>
                      {currentUser
                        ? `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username
                        : "Loading profile..."}
                    </h4>
                    <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      {currentUser?.academic_level || currentUser?.role || ""}
                    </p>
                  </div>
                </div>

                {/* Account Section Menu Links */}
                <div style={{ marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                    ACCOUNT
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus();
                      navigate("/shared/profile");
                    }}
                    className="menu-item-hover"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#1e293b",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Profile Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="menu-item-hover menu-signout-item"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#dc2626",
                      borderRadius: "6px",
                      cursor: "pointer",
                      marginTop: "0.25rem",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            className="hamburger-btn"
            onClick={toggleMenu}
            aria-label="Toggle Navigation Menu"
          >
            &#9776;
          </button>
        </nav>
      </header>

      {/* Slide-over Drawer Menu */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeAllMenus}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Navigation Menu</h3>
              <button type="button" className="close-btn" onClick={closeAllMenus}>
                &times;
              </button>
            </div>

            <div className="menu-body">
              {/* Quick Role / Dashboard Switcher */}
              <div className="menu-section">
                <h4>Switch Dashboards</h4>
                <Link to="/committee/dashboard" onClick={closeAllMenus}>
                  Assessment Committee Dashboard
                </Link>
                <Link to="/shared/faculty-dashboard" onClick={closeAllMenus}>
                  Faculty Dashboard
                </Link>
              </div>

              {/* Committee Shortcuts */}
              <div className="menu-section">
                <h4>Committee Workflows</h4>
                <Link to="/committee/faculty-matching" onClick={closeAllMenus}>
                  Faculty Matching
                </Link>
                <Link to="/committee/unmatched-observees" onClick={closeAllMenus}>
                  Unmatched Observees
                </Link>
                <Link to="/committee/faculty-roster" onClick={closeAllMenus}>
                  Faculty Roster Management
                </Link>
                <Link to="/committee/form-editor" onClick={closeAllMenus}>
                  Form Editor
                </Link>
              </div>

              {/* Observee & Observer Shortcuts */}
              <div className="menu-section">
                <h4>Observee &amp; Observer Modules</h4>

                <Link to="/observee/course-selection" onClick={closeAllMenus}>
                  Course Section Selection
                </Link>

                <Link to="/observee/observer-selection" onClick={closeAllMenus}>
                  Observer Selection
                </Link>

                <Link to="/shared/current-past-observations" onClick={closeAllMenus}>
                  Current / Past Observations
                </Link>

                <Link to="/observer/observation-request" onClick={closeAllMenus}>
                  Observation Requests
                </Link>
              </div>

              {/* Account / Session Links */}
              <div className="menu-section">
                <h4>Account</h4>
                <Link to="/shared/profile" onClick={closeAllMenus}>
                  Profile Settings
                </Link>
                <Link to="/login/signin" onClick={() => void handleSignOut()} className="menu-signout">
                  Sign Out
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}