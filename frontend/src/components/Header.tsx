// src/components/Header.tsx
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./NightModeToggle";
import home from "../assets/home_icon.png";
import bellDefault from "../assets/default_bell_icon.png";
import bellActive from "../assets/active_notifications_bell_icon.png";
import profileIcon from "../assets/profile_icon.png";
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
  const location = useLocation();

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
        const { professor } = await authApi.session();

        if (cancelled) return;

        if (!professor) {
          // Being signed out is normal; clear any previous user data.
          setHeaderError("");
          setNotifications([]);
          setHasUnreadNotifications(false);
          setBackendUnreadCount(0);
          setCurrentUser(null);
          return;
        }

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
        setHeaderError("");
      } catch {
        // Only display this when loading actually fails.
        if (!cancelled) {
          setHeaderError("Some header information could not be loaded.");
        }
      }
    }

    void loadHeaderData();

    window.addEventListener("notifications-changed", loadHeaderData);

    return () => {
      cancelled = true;
      window.removeEventListener("notifications-changed", loadHeaderData);
    };
  }, [location.pathname]);

  const unreadCount = backendUnreadCount;

  return (
    <>
      <header>
        {headerError && (
          <p role="status" className="header-error-text">
            {headerError}
          </p>
        )}
        {/* Brand Header */}
        <div id="logo">
          <Logo src={logo} alt="UTD Logo" className="header-logo" />
          <h1>UTD Assessment Helper</h1>
        </div>

        <nav id="user-shortcuts">
          {/* Home Link */}
          <Link to="/" title="Go to Home" onClick={closeAllMenus}>
            <img className="icon" src={home} alt="Home" />
          </Link>

          {/* Notifications Dropdown Container */}
          <div ref={notifRef} className="header-popover-container">
            <button
              type="button"
              onClick={toggleNotifications}
              title="Notifications"
              className="header-icon-btn"
            >
              <img
                className="icon"
                src={unreadCount > 0 && hasUnreadNotifications ? bellActive : bellDefault}
                alt="Notifications"
              />
            </button>

            {/* Notifications Popover Menu */}
            {isNotifOpen && (
              <div className="notif-popover">
                <div className="notif-header">
                  <span className="notif-header-title">
                    NOTIFICATIONS
                  </span>
                  <span className="notif-unread-badge">
                    {unreadCount} New
                  </span>
                </div>

                <div className="notif-scroll-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty-text">
                      No new notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id)}
                        className={`menu-item-hover notif-item ${n.unread ? "notif-unread-highlight" : "notif-read-item"}`}
                      >
                        <p className={`notif-item-title ${n.unread ? "fw-bold" : "fw-medium"}`}>{n.title}</p>
                        <span className={`notif-item-time ${n.unread ? "text-unread" : "text-read"}`}>{n.time}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="notif-footer">
                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus();
                      navigate("/shared/notifications");
                    }}
                    className="menu-item-hover notif-action-btn"
                  >
                    View All Notifications
                  </button>

                  {/* Simulator Toggle for Demo Testing */}
                  <div className="notif-sim-row">
                    <label className="notif-sim-label">
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
          <div ref={profileRef} className="header-popover-container">
            <button
              type="button"
              onClick={toggleProfile}
              title="Profile Settings"
              className="header-icon-btn"
            >
              <img className="icon" src={profileIcon} alt="Profile" />
            </button>

            {/* Profile Popover Menu */}
            {isProfileOpen && (
              <div className="profile-popover">
                {/* User Header Section */}
                <div className="profile-user-summary">
                  <img
                    src={profileIcon}
                    alt="User Avatar"
                    className="profile-popover-avatar"
                  />
                  <div>
                    <h4 className="profile-popover-name">
                      {currentUser
                        ? `${currentUser.first_name} ${currentUser.last_name}`.trim() || currentUser.username
                        : "Loading profile..."}
                    </h4>
                    <p className="profile-popover-role">
                      {currentUser?.academic_level || currentUser?.role || ""}
                    </p>
                  </div>
                </div>

                {/* Account Section Menu Links */}
                <div className="profile-links-section">
                  <span className="profile-links-header">
                    ACCOUNT
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      closeAllMenus();
                      navigate("/shared/profile");
                    }}
                    className="menu-item-hover profile-link-btn"
                  >
                    Profile Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="menu-item-hover menu-signout-item profile-link-btn profile-signout-btn"
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