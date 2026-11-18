// src/components/Header.tsx
import { getInitials } from "../utils/faculty";
import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import utdLogo from "../assets/icons/utd_logo.png";
import { authApi, facultyApi } from "../api/endpoints";
import type { Notification, Professor } from "../api/types";
import {
  hasUnseenCommitteeMessages,
  isCommitteeAccount,
} from "../pages/shared/S07ContactCommittee";
import { isUserTransferredToNextCycle } from "../pages/committee/A02FacultyMatching";

interface NotificationPreview {
  id: string;
  title: string;
  time: string;
  unread: boolean;
}

function HomeShortcutIcon() {
  return (
    <svg
      className="icon header-shortcut-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className="icon-stroke-primary"
        d="M3.5 13.5L14 5L24.5 13.5"
      />
      <path
        className="icon-stroke-primary"
        d="M6.5 12V21.5C6.5 22.05 6.95 22.5 7.5 22.5H20.5C21.05 22.5 21.5 22.05 21.5 21.5V12"
      />
      <path
        className="icon-fill-orange icon-stroke-primary"
        d="M11.5 22.5V16.2C11.5 15.54 12.04 15 12.7 15H15.3C15.96 15 16.5 15.54 16.5 16.2V22.5"
      />
    </svg>
  );
}

function ContactCommitteeIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      className="icon header-shortcut-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className="icon-fill-green"
        d="M4.2 7.4C4.6 6.85 5.25 6.5 6 6.5H22C22.75 6.5 23.4 6.85 23.8 7.4L14.9 14.4C14.37 14.82 13.63 14.82 13.1 14.4L4.2 7.4Z"
      />
      <rect
        className="icon-stroke-primary"
        x="3.5"
        y="6.5"
        width="21"
        height="15"
        rx="3"
      />
      <path
        className="icon-stroke-primary"
        d="M4.3 7.6L13.1 14.4C13.63 14.82 14.37 14.82 14.9 14.4L23.7 7.6"
      />
      {active && (
        <circle
          className="icon-unread-dot"
          cx="22"
          cy="7.4"
          r="4"
        />
      )}
    </svg>
  );
}

function BellShortcutIcon({ active }: { active: boolean }) {
  return (
    <svg
      className="icon header-shortcut-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        className="icon-stroke-primary"
        d="M14 5.5C9.86 5.5 6.8 8.65 6.8 12.7V16.8L4.8 19.2C4.45 19.62 4.75 20.25 5.3 20.25H22.7C23.25 20.25 23.55 19.62 23.2 19.2L21.2 16.8V12.7C21.2 8.65 18.14 5.5 14 5.5Z"
      />
      <path className="icon-stroke-primary" d="M14 3.5V5.5" />
      <path
        className="icon-stroke-primary"
        d="M11.2 21C11.65 22.35 12.72 23.25 14 23.25C15.28 23.25 16.35 22.35 16.8 21"
      />
      {active && (
        <circle
          className="icon-unread-dot"
          cx="21"
          cy="7.4"
          r="4"
        />
      )}
    </svg>
  );
}

function ProfileShortcutIcon() {
  return (
    <svg
      className="icon header-shortcut-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        className="icon-stroke-primary"
        cx="14"
        cy="14"
        r="10.2"
      />
      <circle
        className="icon-fill-green icon-stroke-primary"
        cx="14"
        cy="11.1"
        r="3.3"
      />
      <path
        className="icon-fill-green icon-stroke-primary"
        d="M7.9 21.7C9.1 18.6 11.3 17.1 14 17.1C16.7 17.1 18.9 18.6 20.1 21.7C18.4 23.2 16.3 24.1 14 24.1C11.7 24.1 9.6 23.2 7.9 21.7Z"
      />
    </svg>
  );
}

function MenuShortcutIcon() {
  return (
    <svg
      className="icon header-shortcut-svg"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        className="icon-fill-orange"
        x="4.5"
        y="12"
        width="19"
        height="4"
        rx="2"
      />
      <path className="icon-stroke-primary" d="M5 8.5H23" />
      <path className="icon-stroke-primary" d="M5 14H23" />
      <path className="icon-stroke-primary" d="M5 19.5H23" />
    </svg>
  );
}

function getStoredUserPhoto(user: Professor | null): string {
  if (!user) return "";
  const rec = user as unknown as Record<string, unknown>;
  const id = rec.user_id ?? rec.id;
  try {
    if (id !== undefined && id !== null) {
      const byId = localStorage.getItem(`profile_photo_${id}`);
      if (byId) return byId;
    }
    if (user.email) {
      const byEmail = localStorage.getItem(`profile_photo_${user.email}`);
      if (byEmail) return byEmail;
    }
  } catch {
    // Ignore storage errors
  }
  return user.profile_photo || "";
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [isCycleRegistered, setIsCycleRegistered] = useState<boolean>(false);
  const [isTransferredToNextCycle, setIsTransferredToNextCycle] =
    useState<boolean>(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [headerError, setHeaderError] = useState("");
  const [backendUnreadCount, setBackendUnreadCount] = useState(0);

  const isLoggedIn = currentUser !== null;
  const isCommitteeUser = isCommitteeAccount(currentUser);
  const isFacultyUser = isLoggedIn && !isCommitteeUser;
  const hasFullPortalAccess =
    isCommitteeUser || (isCycleRegistered && !isTransferredToNextCycle);

  const customAvatarUrl = !avatarFailed ? getStoredUserPhoto(currentUser) : "";
  const hasCustomAvatar = Boolean(customAvatarUrl);
  const fullUserName = currentUser
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim() ||
      currentUser.username ||
      currentUser.email ||
      "User"
    : "";
  const userInitials = getInitials(fullUserName);

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  const handleProtectedAction = (
    targetPath: string,
    actionIfAuthenticated: () => void
  ) => {
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

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetPath: string
  ) => {
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

        try {
          const manualUnreadIds: number[] = JSON.parse(
            localStorage.getItem("manual_unread_notification_ids") || "[]"
          );
          const updated = manualUnreadIds.filter((mId) => mId !== Number(id));
          localStorage.setItem(
            "manual_unread_notification_ids",
            JSON.stringify(updated)
          );
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
      setIsCycleRegistered(false);
      setIsTransferredToNextCycle(false);
      setHasUnreadMessages(false);
      setAvatarFailed(false);
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
    const syncMessageDot = () => {
      setHasUnreadMessages(hasUnseenCommitteeMessages(currentUser));
    };

    syncMessageDot();
    window.addEventListener("committee-messages-changed", syncMessageDot);
    window.addEventListener("storage", syncMessageDot);
    window.addEventListener("demo-reset", syncMessageDot);

    return () => {
      window.removeEventListener("committee-messages-changed", syncMessageDot);
      window.removeEventListener("storage", syncMessageDot);
      window.removeEventListener("demo-reset", syncMessageDot);
    };
  }, [location.pathname, currentUser]);

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
          setHasUnreadMessages(false);
          setBackendUnreadCount(0);
          setCurrentUser(null);
          setIsCycleRegistered(false);
          setIsTransferredToNextCycle(false);
          setAvatarFailed(false);
          return;
        }

        const [notificationResponse, profileResponse, regResponse] =
          await Promise.all([
            facultyApi.notifications(),
            facultyApi.profile(),
            isCommitteeAccount(professor)
              ? Promise.resolve({ is_registered: true })
              : facultyApi.registrationStatus().catch(() => ({
                  is_registered: false,
                })),
          ]);

        if (cancelled) return;

        const resolvedUser: Professor = {
          ...professor,
          ...(profileResponse.professor ?? {}),
        };

        let clearedIds: number[] = [];
        let manualUnreadIds: number[] = [];
        try {
          clearedIds = JSON.parse(
            localStorage.getItem("cleared_notification_ids") || "[]"
          );
          manualUnreadIds = JSON.parse(
            localStorage.getItem("manual_unread_notification_ids") || "[]"
          );
        } catch {
          // Fallback if parsing fails
        }

        const rawList: Notification[] =
          notificationResponse.notifications ?? [];
        const activeList = rawList
          .filter((n) => !clearedIds.includes(n.notification_id))
          .map((n) => ({
            ...n,
            is_read: manualUnreadIds.includes(n.notification_id)
              ? false
              : n.is_read,
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

        const transferred = isUserTransferredToNextCycle(
          resolvedUser,
          regResponse as never
        );

        setHasUnreadNotifications(totalUnread > 0);
        setBackendUnreadCount(totalUnread);
        setAvatarFailed(false);
        setCurrentUser(resolvedUser);
        setIsTransferredToNextCycle(transferred);
        setIsCycleRegistered(Boolean(regResponse.is_registered) && !transferred);
        setHasUnreadMessages(hasUnseenCommitteeMessages(resolvedUser));
        setHeaderError("");
      } catch {
        if (!cancelled) {
          setHeaderError("Some header information could not be loaded.");
        }
      }
    }

    void loadHeaderData();

    window.addEventListener("notifications-changed", loadHeaderData);
    window.addEventListener("profile-changed", loadHeaderData);
    window.addEventListener("registration-changed", loadHeaderData);
    window.addEventListener("cycle-transfers-updated", loadHeaderData);
    window.addEventListener("demo-reset", loadHeaderData);

    return () => {
      cancelled = true;
      window.removeEventListener("notifications-changed", loadHeaderData);
      window.removeEventListener("profile-changed", loadHeaderData);
      window.removeEventListener("registration-changed", loadHeaderData);
      window.removeEventListener("cycle-transfers-updated", loadHeaderData);
      window.removeEventListener("demo-reset", loadHeaderData);
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
          <img src={utdLogo} alt="UTD Logo" className="header-logo" />
          <h1>UTD Assessment Helper</h1>
        </div>

        <nav id="user-shortcuts">
          <Link to="/" title="Go to Home" onClick={closeAllMenus}>
            <HomeShortcutIcon />
          </Link>

          {isLoggedIn ? (
            <Link
              to="/shared/contact-committee"
              title="Contact Assessment Committee"
              aria-label="Contact Assessment Committee"
              onClick={closeAllMenus}
            >
              <ContactCommitteeIcon active={hasUnreadMessages} />
            </Link>
          ) : (
            <a
              href="mailto:assessment-committee@utdallas.edu?subject=UTD%20Assessment%20Helper%20Support"
              title="Email Assessment Committee"
              aria-label="Email Assessment Committee"
              onClick={closeAllMenus}
            >
              <ContactCommitteeIcon active={false} />
            </a>
          )}

          <div ref={notifRef} className="header-popover-container">
            <button
              type="button"
              onClick={toggleNotifications}
              title="Notifications"
              className="header-icon-btn"
            >
              <BellShortcutIcon
                active={unreadCount > 0 && hasUnreadNotifications}
              />
            </button>

            {isNotifOpen && (
              <div className="notif-popover">
                <div className="notif-header">
                  <span className="notif-header-title">NOTIFICATIONS</span>
                  <span className="notif-unread-badge">{unreadCount} New</span>
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
                        className={`menu-item-hover notif-item ${
                          n.unread
                            ? "notif-unread-highlight"
                            : "notif-read-item"
                        }`}
                      >
                        <p
                          className={`notif-item-title ${
                            n.unread ? "fw-bold" : "fw-medium"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span
                          className={`notif-item-time ${
                            n.unread ? "text-unread" : "text-read"
                          }`}
                        >
                          {n.time}
                        </span>
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
                              prev.map((n, i) =>
                                i < 2 ? { ...n, unread: true } : n
                              )
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
              {!isLoggedIn ? (
                <ProfileShortcutIcon />
              ) : hasCustomAvatar ? (
                <img
                  className="icon header-user-avatar"
                  src={customAvatarUrl}
                  alt={fullUserName}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span
                  className="icon header-user-avatar header-initials-avatar"
                  aria-label={fullUserName}
                >
                  {userInitials}
                </span>
              )}
            </button>

            {isProfileOpen && (
              <div className="profile-popover">
                <div className="profile-user-summary">
                  {hasCustomAvatar ? (
                    <img
                      src={customAvatarUrl}
                      alt="User Avatar"
                      className="profile-popover-avatar"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div className="profile-popover-avatar profile-popover-initials">
                      {userInitials}
                    </div>
                  )}
                  <div>
                    <h4 className="profile-popover-name">
                      {currentUser
                        ? `${currentUser.first_name} ${currentUser.last_name}`.trim() ||
                          currentUser.username
                        : "Loading profile..."}
                    </h4>
                    <p className="profile-popover-role">
                      {!hasFullPortalAccess
                        ? "Unregistered"
                        : currentUser?.academic_level || currentUser?.role || ""}
                    </p>
                  </div>
                </div>

                <div className="profile-links-section">
                  <span className="profile-links-header">ACCOUNT</span>

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

                  {!hasFullPortalAccess && (
                    <button
                      type="button"
                      onClick={() => {
                        closeAllMenus();
                        navigate("/login/signin2");
                      }}
                      className="menu-item-hover profile-link-btn"
                    >
                      View Registration Status
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="menu-item-hover profile-link-btn profile-signout-btn"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="header-icon-btn hamburger-btn"
            onClick={toggleMenu}
            aria-label="Toggle Navigation Menu"
            title="Navigation Menu"
          >
            <MenuShortcutIcon />
          </button>
        </nav>
      </header>

      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeAllMenus}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>Navigation Menu</h3>
              <button
                type="button"
                className="close-btn"
                onClick={closeAllMenus}
              >
                &times;
              </button>
            </div>

            <div className="menu-body">
              <div className="menu-section">
                <h4>Home</h4>
                <Link to="/" onClick={closeAllMenus}>
                  Portal Home
                </Link>
              </div>

              {isCommitteeUser && (
                <>
                  <div className="menu-section">
                    <h4>Dashboards</h4>
                    <Link
                      to="/committee/dashboard"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/dashboard")
                      }
                    >
                      Assessment Committee Dashboard
                    </Link>
                    <Link
                      to="/shared/faculty-dashboard"
                      onClick={(e) =>
                        handleLinkClick(e, "/shared/faculty-dashboard")
                      }
                    >
                      Faculty Dashboard
                    </Link>
                  </div>

                  <div className="menu-section">
                    <h4>Committee Workflows</h4>
                    <Link
                      to="/committee/faculty-matching"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/faculty-matching")
                      }
                    >
                      Faculty Matching
                    </Link>
                    <Link
                      to="/committee/unmatched-observees"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/unmatched-observees")
                      }
                    >
                      Unmatched Observees
                    </Link>
                    <Link
                      to="/committee/faculty-roster"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/faculty-roster")
                      }
                    >
                      Faculty Roster Management
                    </Link>
                    <Link
                      to="/committee/pending-records"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/pending-records")
                      }
                    >
                      Pending Records
                    </Link>
                    <Link
                      to="/committee/survey-tracking"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/survey-tracking")
                      }
                    >
                      Survey Tracking
                    </Link>
                    <Link
                      to="/committee/kpi-overview"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/kpi-overview")
                      }
                    >
                      KPI Overview
                    </Link>
                    <Link
                      to="/committee/form-editor"
                      onClick={(e) =>
                        handleLinkClick(e, "/committee/form-editor")
                      }
                    >
                      Form Editor
                    </Link>
                  </div>
                </>
              )}

              {isFacultyUser && !hasFullPortalAccess && (
                <div className="menu-section">
                  <h4>Cycle Access</h4>
                  <Link to="/login/signin2" onClick={closeAllMenus}>
                    Register for Current Cycle
                  </Link>
                  <Link
                    to="/shared/current-past-observations"
                    onClick={closeAllMenus}
                  >
                    Current and Past Observations
                  </Link>
                  <Link
                    to="/observer/observation-request"
                    onClick={closeAllMenus}
                  >
                    Observation Requests
                  </Link>
                </div>
              )}

              {isFacultyUser && hasFullPortalAccess && (
                <>
                  <div className="menu-section">
                    <h4>Dashboard</h4>
                    <Link
                      to="/shared/faculty-dashboard"
                      onClick={(e) =>
                        handleLinkClick(e, "/shared/faculty-dashboard")
                      }
                    >
                      Faculty Dashboard
                    </Link>
                  </div>

                  <div className="menu-section">
                    <h4>Observee Modules</h4>
                    <Link
                      to="/observee/course-selection"
                      onClick={(e) =>
                        handleLinkClick(e, "/observee/course-selection")
                      }
                    >
                      Course Section Selection
                    </Link>
                    <Link
                      to="/observee/observer-selection"
                      onClick={(e) =>
                        handleLinkClick(e, "/observee/observer-selection")
                      }
                    >
                      Observer Selection
                    </Link>
                  </div>

                  <div className="menu-section">
                    <h4>Observer Modules</h4>
                    <Link
                      to="/observer/observation-request"
                      onClick={(e) =>
                        handleLinkClick(e, "/observer/observation-request")
                      }
                    >
                      Observation Requests
                    </Link>
                  </div>
                </>
              )}

              {isLoggedIn && hasFullPortalAccess && (
                <div className="menu-section">
                  <h4>Shared Records</h4>
                  <Link
                    to="/shared/current-past-observations"
                    onClick={(e) =>
                      handleLinkClick(e, "/shared/current-past-observations")
                    }
                  >
                    Current and Past Observations
                  </Link>
                  <Link
                    to="/shared/notifications"
                    onClick={(e) =>
                      handleLinkClick(e, "/shared/notifications")
                    }
                  >
                    Notifications
                  </Link>
                </div>
              )}

              <div className="menu-section">
                <h4>Support</h4>
                {isLoggedIn && (
                  <Link
                    to="/shared/contact-committee"
                    onClick={(e) =>
                      handleLinkClick(e, "/shared/contact-committee")
                    }
                  >
                    Contact Assessment Committee
                  </Link>
                )}
                <a
                  href="mailto:assessment-committee@utdallas.edu?subject=UTD%20Assessment%20Helper%20Support"
                  onClick={closeAllMenus}
                >
                  Email Committee Directly
                </a>
              </div>

              <div className="menu-section">
                <h4>Account</h4>
                {isLoggedIn && (
                  <Link
                    to="/shared/profile"
                    onClick={(e) => handleLinkClick(e, "/shared/profile")}
                  >
                    Profile Settings
                  </Link>
                )}
                {isLoggedIn ? (
                  <Link
                    to="/login/signin"
                    onClick={() => void handleSignOut()}
                    className="menu-signout"
                  >
                    Sign Out
                  </Link>
                ) : (
                  <Link to="/login/signin" onClick={closeAllMenus}>
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