// src/pages/shared/S07ContactCommittee.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, facultyApi } from "../../api/endpoints";
import type { Professor } from "../../api/types";

export const COMMITTEE_INQUIRIES_KEY = "utd_committee_inquiries_v2";
const PAGE_SIZE = 25;

export interface CommitteeReply {
  id: string;
  responderName: string;
  body: string;
  createdAt: string;
}

export interface CommitteeInquiry {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  topic: string;
  courseContext: string;
  subject: string;
  message: string;
  urgent: boolean;
  unreadForFaculty: boolean;
  unreadForCommittee: boolean;
  replies: CommitteeReply[];
  createdAt: string;
}

const TOPIC_OPTIONS = [
  "Course Selection or Section Change",
  "Observer Matching and Pairing Request",
  "Schedule Conflict or Deadline Extension",
  "Observation Form or Signature Issue",
  "Post-Evaluation Survey Question",
  "General Assessment Cycle Inquiry",
];

const COMMITTEE_EMAIL = "assessment-committee@utdallas.edu";

export function isCommitteeAccount(user?: Professor | null): boolean {
  if (!user) return false;
  const roleStr = String(user.role || "").toLowerCase();
  const storedRole = (sessionStorage.getItem("ac_user_role") || "").toLowerCase();
  return (
    roleStr === "admin" ||
    roleStr.includes("committee") ||
    storedRole.includes("committee") ||
    storedRole === "admin"
  );
}

function getUserIdentity(user: Professor | null): {
  userId: string;
  email: string;
  name: string;
  isCommittee: boolean;
} {
  if (!user) {
    return {
      userId: "",
      email: "",
      name: "Faculty Member",
      isCommittee: false,
    };
  }
  const rec = user as unknown as Record<string, unknown>;
  const rawId = rec.user_id ?? rec.id ?? user.username ?? user.email ?? "";
  const fullName =
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
    user.username ||
    "Faculty Member";
  return {
    userId: String(rawId),
    email: (user.email || "").trim().toLowerCase(),
    name: fullName,
    isCommittee: isCommitteeAccount(user),
  };
}

function belongsToFaculty(
  item: CommitteeInquiry,
  user: Professor | null
): boolean {
  const { userId, email } = getUserIdentity(user);
  if (!userId && !email) return false;
  if (userId && item.senderUserId && item.senderUserId === userId) return true;
  if (email && item.senderEmail && item.senderEmail.toLowerCase() === email) {
    return true;
  }
  return false;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function loadStoredInquiries(): CommitteeInquiry[] {
  try {
    const raw = localStorage.getItem(COMMITTEE_INQUIRIES_KEY);
    return raw ? (JSON.parse(raw) as CommitteeInquiry[]) : [];
  } catch {
    return [];
  }
}

function saveStoredInquiries(items: CommitteeInquiry[]) {
  try {
    localStorage.setItem(COMMITTEE_INQUIRIES_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("committee-messages-changed"));
  } catch {
    // Ignore storage errors
  }
}

export function hasUnseenCommitteeMessages(user?: Professor | null): boolean {
  if (!user) return false;
  const all = loadStoredInquiries();
  if (isCommitteeAccount(user)) {
    return all.some((item) => item.unreadForCommittee);
  }
  return all.some(
    (item) => belongsToFaculty(item, user) && item.unreadForFaculty
  );
}

export default function S07ContactCommittee() {
  const [currentUser, setCurrentUser] = useState<Professor | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Contact form state
  const [topic, setTopic] = useState(TOPIC_OPTIONS[0]);
  const [courseContext, setCourseContext] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [urgent, setUrgent] = useState(false);

  // Inbox state (supports 1000+ threads via search + pagination)
  const [isInboxVisible, setIsInboxVisible] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<"all" | "replied">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [allInquiries, setAllInquiries] = useState<CommitteeInquiry[]>(() =>
    loadStoredInquiries()
  );

  const {
    userId,
    email: userEmail,
    name: senderName,
    isCommittee,
  } = getUserIdentity(currentUser);
  const dashboardPath = isCommittee
    ? "/committee/dashboard"
    : "/shared/faculty-dashboard";

  useEffect(() => {
    let cancelled = false;

    async function loadUserAndSyncInbox() {
      try {
        const sessionRes = await authApi.session();
        if (cancelled) return;

        let resolvedUser = sessionRes.professor ?? null;
        if (resolvedUser) {
          try {
            const profileRes = await facultyApi.profile();
            if (!cancelled && profileRes.professor) {
              resolvedUser = {
                ...resolvedUser,
                ...profileRes.professor,
              };
            }
          } catch {
            // Keep sessionRes.professor if profile endpoint fails
          }
        }

        if (cancelled) return;
        setCurrentUser(resolvedUser);

        if (resolvedUser) {
          const stored = loadStoredInquiries();
          const adminUser = isCommitteeAccount(resolvedUser);
          let changed = false;

          const updated = stored.map((item) => {
            if (adminUser && item.unreadForCommittee) {
              changed = true;
              return { ...item, unreadForCommittee: false };
            }
            if (
              !adminUser &&
              belongsToFaculty(item, resolvedUser) &&
              item.unreadForFaculty
            ) {
              changed = true;
              return { ...item, unreadForFaculty: false };
            }
            return item;
          });

          if (changed) {
            setAllInquiries(updated);
            saveStoredInquiries(updated);
          } else {
            setAllInquiries(stored);
          }
        }
      } catch {
        // Fallback if session check fails
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    void loadUserAndSyncInbox();

    const handleSync = () => {
      setAllInquiries(loadStoredInquiries());
    };

    const handleReset = () => {
      localStorage.removeItem(COMMITTEE_INQUIRIES_KEY);
      setAllInquiries([]);
      setSelectedThreadId(null);
      setPage(1);
      window.dispatchEvent(new Event("committee-messages-changed"));
    };

    window.addEventListener("committee-messages-changed", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("demo-reset", handleReset);
    return () => {
      cancelled = true;
      window.removeEventListener("committee-messages-changed", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("demo-reset", handleReset);
    };
  }, []);

  // Strict role-based visibility
  const visibleThreads = useMemo(() => {
    if (!currentUser) return [];
    if (isCommittee) return allInquiries;
    return allInquiries.filter((item) => belongsToFaculty(item, currentUser));
  }, [allInquiries, currentUser, isCommittee]);

  const repliedCount = useMemo(
    () => visibleThreads.filter((item) => item.replies.length > 0).length,
    [visibleThreads]
  );

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleThreads.filter((item) => {
      if (inboxFilter === "replied" && item.replies.length === 0) {
        return false;
      }
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.senderName.toLowerCase().includes(q) ||
        item.senderEmail.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.courseContext.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.replies.some((r) => r.body.toLowerCase().includes(q))
      );
    });
  }, [visibleThreads, inboxFilter, searchQuery]);

  // Pagination so 1,000+ emails stay fast and clean
  const totalPages = Math.max(1, Math.ceil(filteredThreads.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedThreads = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredThreads.slice(start, start + PAGE_SIZE);
  }, [filteredThreads, safePage]);

  const activeThread = useMemo(() => {
    if (filteredThreads.length === 0) return null;
    return (
      filteredThreads.find((t) => t.id === selectedThreadId) ??
      paginatedThreads[0] ??
      filteredThreads[0]
    );
  }, [filteredThreads, paginatedThreads, selectedThreadId]);

  const mailtoHref = `mailto:${COMMITTEE_EMAIL}?subject=${encodeURIComponent(
    subject.trim()
      ? `[${topic}] ${subject.trim()}`
      : `UTD Assessment Helper: ${topic}`
  )}&body=${encodeURIComponent(
    `From: ${senderName}${currentUser?.email ? ` (${currentUser.email})` : ""}\nTopic: ${topic}${
      courseContext.trim() ? `\nCourse / Section: ${courseContext.trim()}` : ""
    }\n\n${message.trim()}`
  )}`;

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(COMMITTEE_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      setCopiedEmail(false);
    }
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!subject.trim()) {
      setError("Please enter a short subject line for your inquiry.");
      return;
    }

    if (message.trim().length < 10) {
      setError(
        "Please enter at least 10 characters describing your question or request."
      );
      return;
    }

    setSubmitting(true);

    const newId = `inq-${Date.now()}`;
    const newInquiry: CommitteeInquiry = {
      id: newId,
      senderUserId: userId,
      senderName,
      senderEmail: currentUser?.email || "",
      topic,
      courseContext: courseContext.trim(),
      subject: subject.trim(),
      message: message.trim(),
      urgent,
      unreadForFaculty: false,
      unreadForCommittee: true,
      replies: [],
      createdAt: new Date().toISOString(),
    };

    const updated = [newInquiry, ...allInquiries];
    setAllInquiries(updated);
    saveStoredInquiries(updated);
    setSelectedThreadId(newId);
    setPage(1);

    setSubject("");
    setCourseContext("");
    setMessage("");
    setUrgent(false);
    setSubmitting(false);
    setSuccess(
      "Your inquiry has been delivered to the Assessment Committee inbox."
    );
  };

  const handleSendCommitteeReply = (inquiryId: string) => {
    const draft = (replyDrafts[inquiryId] || "").trim();
    if (!draft) {
      setError("Please enter a response before sending.");
      return;
    }

    setError("");
    const newReply: CommitteeReply = {
      id: `rep-${Date.now()}`,
      responderName: senderName || "Assessment Committee",
      body: draft,
      createdAt: new Date().toISOString(),
    };

    const updated = allInquiries.map((item) => {
      if (item.id !== inquiryId) return item;
      return {
        ...item,
        unreadForFaculty: true,
        unreadForCommittee: false,
        replies: [...item.replies, newReply],
      };
    });

    setAllInquiries(updated);
    saveStoredInquiries(updated);
    setReplyDrafts((prev) => ({ ...prev, [inquiryId]: "" }));
    setSuccess("Your response has been sent to the faculty member's inbox.");
  };

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to={dashboardPath} className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Clean Header without the redundant response count badge */}
      <div className="committee-page-header">
        <div className="committee-page-title-block">
          <span className="a01-phase-pill">
            {isCommittee ? "Committee Messages" : "Shared Support"}
          </span>
          <h2>
            {isCommittee
              ? "Assessment Committee Inbox"
              : "Messages and Contact Assessment Committee"}
          </h2>
        </div>
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

      {/* ============================================================
          SECTION 1: SCALABLE INBOX (HANDLES 1000+ MESSAGES CLEANLY)
          ============================================================ */}
      <section className="s07-inbox-section" aria-labelledby="s07-inbox-heading">
        <div className="s07-section-banner s07-section-banner--inbox">
          <div className="s07-section-banner-left">
            <div className="s07-banner-badge-row">
              <span className="s07-zone-badge s07-zone-badge--inbox">
                {isCommittee ? "Committee Inbox" : "Your Personal Inbox"}
              </span>
              <span className="s07-count-pill">
                {visibleThreads.length}{" "}
                {visibleThreads.length === 1 ? "Thread" : "Threads"}
              </span>
            </div>
            <h3 id="s07-inbox-heading">
              {isCommittee
                ? "Incoming Faculty Inquiries"
                : "Personal Responses from the Assessment Committee"}
            </h3>
          </div>

          <div className="s07-banner-actions">
            {isInboxVisible && visibleThreads.length > 0 && (
              <>
                <input
                  type="search"
                  className="s07-search-input"
                  placeholder="Search messages..."
                  aria-label="Search inbox messages"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />

                <div
                  className="s07-filter-pills"
                  role="group"
                  aria-label="Filter inbox messages"
                >
                  <button
                    type="button"
                    className={`s07-filter-pill ${
                      inboxFilter === "all" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setInboxFilter("all");
                      setPage(1);
                    }}
                  >
                    All ({visibleThreads.length})
                  </button>
                  <button
                    type="button"
                    className={`s07-filter-pill ${
                      inboxFilter === "replied" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      setInboxFilter("replied");
                      setPage(1);
                    }}
                  >
                    Replied ({repliedCount})
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              className="btn-secondary s07-compact-btn"
              aria-expanded={isInboxVisible}
              onClick={() => setIsInboxVisible((prev) => !prev)}
            >
              {isInboxVisible
                ? "Hide Inbox"
                : `Show Inbox (${visibleThreads.length})`}
            </button>
          </div>
        </div>

        {isInboxVisible && (
          <>
            {loadingUser ? (
              <div className="observation-empty-state">
                Loading your inbox...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="observation-empty-state">
                {searchQuery.trim()
                  ? "No messages matched your search."
                  : isCommittee
                  ? "No faculty inquiries have been submitted yet."
                  : inboxFilter === "replied"
                  ? "You have not received any responses from the Assessment Committee yet."
                  : "Your personal inbox is empty. Use the Contact Assessment Committee form below to send a message."}
              </div>
            ) : (
              <div className="s07-gmail-shell">
                {/* Left Column: Fixed-Height Vertical Thread List with Pagination */}
                <div className="s07-gmail-sidebar">
                  <div
                    className="s07-gmail-list"
                    role="listbox"
                    aria-label="Message threads"
                  >
                    {paginatedThreads.map((item) => {
                      const isSelected = activeThread?.id === item.id;
                      const hasReplies = item.replies.length > 0;
                      const latestPreview = hasReplies
                        ? item.replies[item.replies.length - 1].body
                        : item.message;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`s07-gmail-row ${
                            isSelected ? "is-selected" : ""
                          }`}
                          onClick={() => setSelectedThreadId(item.id)}
                        >
                          <div className="s07-gmail-row-top">
                            <span className="s07-gmail-sender">
                              {isCommittee
                                ? item.senderName
                                : "Assessment Committee"}
                            </span>
                            <span className="s07-gmail-date">
                              {new Date(item.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="s07-gmail-subject-line">
                            <span className="s07-gmail-subject">
                              {item.subject}
                            </span>
                            {hasReplies ? (
                              <span className="s07-mini-badge is-replied">
                                Replied
                              </span>
                            ) : (
                              <span className="s07-mini-badge is-pending">
                                Open
                              </span>
                            )}
                          </div>

                          <p className="s07-gmail-snippet">{latestPreview}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination Footer (Always keeps height fixed even with 1,000+ emails) */}
                  <div className="s07-pagination-bar">
                    <span className="s07-pagination-info">
                      {(safePage - 1) * PAGE_SIZE + 1} to{" "}
                      {Math.min(safePage * PAGE_SIZE, filteredThreads.length)}{" "}
                      of {filteredThreads.length}
                    </span>
                    <div className="s07-pagination-btns">
                      <button
                        type="button"
                        className="s07-page-btn"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="s07-page-btn"
                        disabled={safePage >= totalPages}
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Clean Conversation Reading Pane (Vertical Scroll Only) */}
                {activeThread && (
                  <div className="s07-gmail-pane">
                    <div className="s07-pane-header">
                      <div className="s07-pane-title-row">
                        <h4 className="s07-pane-subject">
                          {activeThread.subject}
                        </h4>
                        <div className="s07-history-meta">
                          <span className="s07-topic-pill">
                            {activeThread.topic}
                          </span>
                          {activeThread.urgent && (
                            <span className="s07-urgent-pill">
                              Time-Sensitive
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="s07-thread-meta-line">
                        {activeThread.courseContext && (
                          <span className="s07-course-chip">
                            Course: {activeThread.courseContext}
                          </span>
                        )}
                        <span>
                          Started{" "}
                          {new Date(activeThread.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Clean Threaded Conversation Feed */}
                    <div className="s07-thread-stream">
                      {/* Faculty Inquiry Item */}
                      <div className="s07-msg-item">
                        <div className="s07-msg-item-header">
                          <div className="s07-msg-author">
                            <span className="s07-avatar-circle is-faculty">
                              {getInitials(activeThread.senderName)}
                            </span>
                            <div>
                              <strong className="s07-author-name">
                                {activeThread.senderName}
                              </strong>
                              {activeThread.senderEmail && (
                                <span className="s07-author-email">
                                  {activeThread.senderEmail}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="s07-history-time">
                            {new Date(activeThread.createdAt).toLocaleString(
                              [],
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <p className="s07-msg-body">{activeThread.message}</p>
                      </div>

                      {/* Committee Replies */}
                      {activeThread.replies.map((rep) => (
                        <div
                          key={rep.id}
                          className="s07-msg-item is-committee-msg"
                        >
                          <div className="s07-msg-item-header">
                            <div className="s07-msg-author">
                              <span className="s07-avatar-circle is-committee">
                                AC
                              </span>
                              <div>
                                <strong className="s07-author-name">
                                  Assessment Committee
                                </strong>
                                <span className="s07-author-email">
                                  Responded by {rep.responderName}
                                </span>
                              </div>
                            </div>
                            <span className="s07-history-time">
                              {new Date(rep.createdAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="s07-msg-body">{rep.body}</p>
                        </div>
                      ))}
                    </div>

                    {/* Inline Reply Box for Assessment Committee */}
                    {isCommittee && (
                      <div className="s07-pane-reply-box">
                        <label
                          htmlFor={`reply-input-${activeThread.id}`}
                          className="s07-reply-composer-label"
                        >
                          Reply to {activeThread.senderName}
                        </label>
                        <textarea
                          id={`reply-input-${activeThread.id}`}
                          className="s07-textarea s07-reply-textarea"
                          placeholder={`Write a personal response to ${activeThread.senderName}...`}
                          value={replyDrafts[activeThread.id] || ""}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [activeThread.id]: e.target.value,
                            }))
                          }
                        />
                        <div className="s07-form-actions">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() =>
                              handleSendCommitteeReply(activeThread.id)
                            }
                          >
                            Send Response
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* ============================================================
          SECTION 2: CONTACT ASSESSMENT COMMITTEE FORM
          ============================================================ */}
      {!isCommittee && (
        <>
          <div className="s07-section-divider" role="separator">
            <span>New Message</span>
          </div>

          <section
            className="s07-contact-section"
            aria-labelledby="s07-form-heading"
          >
            <div className="s07-section-banner s07-section-banner--form">
              <div className="s07-section-banner-left">
                <span className="s07-zone-badge s07-zone-badge--form">
                  Contact Form
                </span>
                <h3 id="s07-form-heading">
                  Send a New Message to the Assessment Committee
                </h3>
                <p className="s07-card-subtext">
                  Submit a new inquiry below. Once the Assessment Committee
                  replies, their response will appear in Your Personal Inbox
                  above.
                </p>
              </div>
            </div>

            <div className="s07-workspace-grid">
              {/* Left Column: In-App Inquiry Form */}
              <div className="s07-form-card">
                <form className="s07-form" onSubmit={handleSubmitInquiry}>
                  <div className="s07-form-row-2">
                    <div className="s07-field-group">
                      <label htmlFor="s07-sender-name">Your Name</label>
                      <input
                        id="s07-sender-name"
                        type="text"
                        className="s07-input"
                        value={loadingUser ? "Loading..." : senderName}
                        disabled
                      />
                    </div>

                    <div className="s07-field-group">
                      <label htmlFor="s07-sender-email">UTD Email</label>
                      <input
                        id="s07-sender-email"
                        type="email"
                        className="s07-input"
                        value={
                          loadingUser
                            ? "Loading..."
                            : userEmail || "Signed-in faculty account"
                        }
                        disabled
                      />
                    </div>
                  </div>

                  <div className="s07-form-row-2">
                    <div className="s07-field-group">
                      <label htmlFor="s07-topic">
                        Inquiry Topic <span className="s07-required-star">*</span>
                      </label>
                      <select
                        id="s07-topic"
                        className="s07-select"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      >
                        {TOPIC_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="s07-field-group">
                      <label htmlFor="s07-course">
                        Related Course / Section (Optional)
                      </label>
                      <input
                        id="s07-course"
                        type="text"
                        className="s07-input"
                        placeholder="e.g., CS 3345.002"
                        value={courseContext}
                        onChange={(e) => setCourseContext(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="s07-field-group">
                    <label htmlFor="s07-subject">
                      Subject <span className="s07-required-star">*</span>
                    </label>
                    <input
                      id="s07-subject"
                      type="text"
                      className="s07-input"
                      placeholder="Brief summary of your question or request"
                      maxLength={120}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="s07-field-group">
                    <label htmlFor="s07-message">
                      Message Details{" "}
                      <span className="s07-required-star">*</span>
                    </label>
                    <textarea
                      id="s07-message"
                      className="s07-textarea"
                      placeholder="Include relevant dates, observer names, or details so the Assessment Committee can assist quickly..."
                      maxLength={1200}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                    <div className="s07-char-row">
                      <span>
                        Responses typically arrive within 1 to 2 business days.
                      </span>
                      <span>{message.length} / 1200</span>
                    </div>
                  </div>

                  <label className="s07-checkbox-row">
                    <input
                      type="checkbox"
                      checked={urgent}
                      onChange={(e) => setUrgent(e.target.checked)}
                    />
                    <span>
                      Flag as time-sensitive (e.g., observation scheduled within
                      48 hours or approaching cycle deadline)
                    </span>
                  </label>

                  <div className="s07-form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setSubject("");
                        setCourseContext("");
                        setMessage("");
                        setUrgent(false);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      Clear Form
                    </button>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? "Sending..." : "Send Message to Committee"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: External Email Option */}
              <aside className="s07-side-stack">
                <div className="s07-info-card">
                  <div className="s07-card-header">
                    <span className="a01-phase-pill">External Email Option</span>
                    <h3>Prefer to Use Your Email Client?</h3>
                    <p className="s07-card-subtext">
                      You can also email the Assessment Committee directly,
                      especially if you need to attach syllabi, PDFs, or
                      external documents.
                    </p>
                  </div>

                  <div className="s07-email-box">
                    <span className="s07-email-address">{COMMITTEE_EMAIL}</span>
                    <div className="s07-email-actions">
                      <a href={mailtoHref} className="btn-primary">
                        Open in Email App ↗
                      </a>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleCopyEmail()}
                      >
                        {copiedEmail ? "Copied!" : "Copy Email"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4>Common Reasons to Reach Out</h4>
                    <ul className="s07-topic-list">
                      <li>Requesting a mid-cycle course or section swap</li>
                      <li>
                        Reporting a schedule conflict with a matched observer
                      </li>
                      <li>Asking for an extension on evaluation sign-off</li>
                      <li>
                        Clarifying evaluation cycle eligibility or deferral
                      </li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </>
      )}

      <div className="dashboard-center-action">
        <Link to={dashboardPath} className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}