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

  const isLoggedIn = currentUser !== null;

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  const handleProtectedAction = (targetPath: string, actionIfAuthenticated: () => void) => {
    if (isLoggedIn) {
      actionIfAuthenticated();
    } else {
      closeAllMenus();
      navigate("/login/signin", { state: { redirectTo: targetPath } });
    }
  };

  const toggleNotifications = () => {
    handleProtectedAction("/shared/notifications", () => {
      setIsNotifOpen((prev) => !prev);
      setIsProfileOpen(false);
      setIsMenuOpen(false);
    });
  };

  const toggleProfile = () => {
    handleProtectedAction("/shared/profile", () => {
      setIsProfileOpen((prev) => !prev);
      setIsNotifOpen(false);
      setIsMenuOpen(false);
    });
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) => {
    closeAllMenus();
    if (!isLoggedIn) {
      e.preventDefault();
      navigate("/login/signin", { state: { redirectTo: targetPath } });
    }
  };

  const handleNotificationClick = async (id: string) => {
    try {
      const notification = notifications.find((n) => n.id === id);

      if (notification?.unread) {
        await facultyApi.markRead(Number(id));
        
        // Remove from manual unread list if present
        try {
          const manualUnreadIds: number[] = JSON.parse(
            localStorage.getItem("manual_unread_notification_ids") || "[]"
          );
          const updated = manualUnreadIds.filter((mId) => mId !== Number(id));
          localStorage.setItem("manual_unread_notification_ids", JSON.stringify(updated));
        } catch {
          // Ignore parse errors
        }

        window.dispatchEvent(new Event("notifications-changed"));
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
    } finally {
      closeAllMenus();
      setCurrentUser(null);
      navigate("/login/signin", { replace: true });
      setSigningOut(false);
    }
  };

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

        let clearedIds: number[] = [];
        let manualUnreadIds: number[] = [];
        try {
          clearedIds = JSON.parse(localStorage.getItem("cleared_notification_ids") || "[]");
          manualUnreadIds = JSON.parse(localStorage.getItem("manual_unread_notification_ids") || "[]");
        } catch {
          // Fallback if parsing fails
        }

        const rawList: Notification[] = notificationResponse.notifications ?? [];
        const activeList = rawList
          .filter((n) => !clearedIds.includes(n.notification_id))
          .map((n) => ({
            ...n,
            is_read: manualUnreadIds.includes(n.notification_id) ? false : n.is_read,
          }));

        const totalUnread = activeList.filter((n) => !n.is_read).length;
        const previews = activeList.slice(0, 3);

        setNotifications(
          previews.map((n) => ({
            id: String(n.notification_id),
            title: n.title,
            time: new Date(n.created_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            unread: !n.is_read,
          }))
        );

        setHasUnreadNotifications(totalUnread > 0);
        setBackendUnreadCount(totalUnread);
        setCurrentUser(profileResponse.professor);
        setHeaderError("");
      } catch {
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

        <div id="logo">
          <Logo alt="UTD Logo" className="header-logo" />
          <h1>UTD Assessment Helper</h1>
        </div>

        <nav id="user-shortcuts">
          <Link to="/" title="Go to Home" onClick={closeAllMenus}>
            <img className="icon" src={home} alt="Home" />
          </Link>

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

          <div ref={profileRef} className="header-popover-container">
            <button
              type="button"
              onClick={toggleProfile}
              title="Profile Settings"
              className="header-icon-btn"
            >
              <img className="icon" src={profileIcon} alt="Profile" />
            </button>

            {isProfileOpen && (
              <div className="profile-popover">
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
              <div className="menu-section">
                <h4>Switch Dashboards</h4>
                <Link
                  to="/committee/dashboard"
                  onClick={(e) => handleLinkClick(e, "/committee/dashboard")}
                >
                  Assessment Committee Dashboard
                </Link>
                <Link
                  to="/shared/faculty-dashboard"
                  onClick={(e) => handleLinkClick(e, "/shared/faculty-dashboard")}
                >
                  Faculty Dashboard
                </Link>
              </div>

              <div className="menu-section">
                <h4>Committee Workflows</h4>
                <Link
                  to="/committee/faculty-matching"
                  onClick={(e) => handleLinkClick(e, "/committee/faculty-matching")}
                >
                  Faculty Matching
                </Link>
                <Link
                  to="/committee/unmatched-observees"
                  onClick={(e) => handleLinkClick(e, "/committee/unmatched-observees")}
                >
                  Unmatched Observees
                </Link>
                <Link
                  to="/committee/faculty-roster"
                  onClick={(e) => handleLinkClick(e, "/committee/faculty-roster")}
                >
                  Faculty Roster Management
                </Link>
                <Link
                  to="/committee/form-editor"
                  onClick={(e) => handleLinkClick(e, "/committee/form-editor")}
                >
                  Form Editor
                </Link>
              </div>

              <div className="menu-section">
                <h4>Observee &amp; Observer Modules</h4>

                <Link
                  to="/observee/course-selection"
                  onClick={(e) => handleLinkClick(e, "/observee/course-selection")}
                >
                  Course Section Selection
                </Link>

                <Link
                  to="/observee/observer-selection"
                  onClick={(e) => handleLinkClick(e, "/observee/observer-selection")}
                >
                  Observer Selection
                </Link>

                <Link
                  to="/shared/current-past-observations"
                  onClick={(e) => handleLinkClick(e, "/shared/current-past-observations")}
                >
                  Current / Past Observations
                </Link>

                <Link
                  to="/observer/observation-request"
                  onClick={(e) => handleLinkClick(e, "/observer/observation-request")}
                >
                  Observation Requests
                </Link>
              </div>

              <div className="menu-section">
                <h4>Account</h4>
                <Link
                  to="/shared/profile"
                  onClick={(e) => handleLinkClick(e, "/shared/profile")}
                >
                  Profile Settings
                </Link>
                {isLoggedIn ? (
                  <Link
                    to="/login/signin"
                    onClick={() => void handleSignOut()}
                    className="menu-signout"
                  >
                    Sign Out
                  </Link>
                ) : (
                  <Link
                    to="/login/signin"
                    onClick={closeAllMenus}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}