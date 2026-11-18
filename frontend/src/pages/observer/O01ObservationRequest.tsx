// src/pages/observer/O01ObservationRequest.tsx
import { useEffect, useState } from "react";
import { matchingApi } from "../../api/endpoints";
import type { Invitation } from "../../api/types";
import { Link } from "react-router-dom";
import profileIcon from "../../assets/icons/profile_icon.png";
import { formatDateTime as formatMoment } from "../../api/format";

interface ProposedDateSlot {
  id: string;
  date: string;
  time: string;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function O01ObservationRequest() {
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const proposedDates: ProposedDateSlot[] = (
    invitation?.proposed_dates ?? []
  ).map((date) => {
    const formatted = formatDateTime(date.datetime);
    return {
      id: String(date.proposed_date_id),
      date: formatted.date,
      time: formatted.time,
    };
  });

  useEffect(() => {
    let cancelled = false;

    async function loadInvitations() {
      setLoading(true);
      setLoadError("");

      try {
        const invitations = await matchingApi.incomingInvitations();
        if (cancelled) return;

        const pending = invitations.find((item) => item.status === "pending");
        setInvitation(pending ?? invitations[0] ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Unable to load observation invitations."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInvitations();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAcceptSelectedDate = async () => {
    if (!invitation) {
      setStatusMessage({
        type: "error",
        text: "There is no invitation to respond to.",
      });
      return;
    }

    if (!selectedSlotId) {
      setStatusMessage({
        type: "error",
        text: "Please select one date and time slot before accepting.",
      });
      return;
    }

    setSaving(true);

    try {
      const updated = await matchingApi.respond(
        invitation.invitation_id,
        "accept",
        Number(selectedSlotId)
      );
      setInvitation(updated);
      setStatusMessage({
        type: "success",
        text: "Invitation accepted! Waiting for the observee to confirm your visit.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to accept the invitation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) {
      setStatusMessage({
        type: "error",
        text: "There is no invitation to decline.",
      });
      return;
    }

    setSaving(true);

    try {
      await matchingApi.respond(invitation.invitation_id, "decline");
      setStatusMessage({ type: "success", text: "Invitation declined." });
      setInvitation(null);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to decline the invitation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const acceptedDate = invitation?.proposed_dates.find(
    (date) => date.status === "accepted"
  );
  const answeredStatus: Record<string, string> = {
    accepted: "You accepted this invitation",
    confirmed: "The observee confirmed you",
    declined: "You declined this invitation",
    expired: "This invitation expired",
    closed: "This invitation was closed",
    rejected: "The observee withdrew this request",
  };
  const acceptedWhen = acceptedDate
    ? ` for ${new Date(acceptedDate.datetime).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`
    : "";
  const answeredText =
    invitation && invitation.status !== "pending"
      ? `${answeredStatus[invitation.status] ?? invitation.status}${acceptedWhen}.`
      : null;

  const senderFullName = invitation?.sender
    ? `${invitation.sender.first_name} ${invitation.sender.last_name}`.trim() ||
      invitation.sender.username
    : "Faculty details unavailable";

  const statusPillClass =
    invitation?.status === "accepted" || invitation?.status === "confirmed"
      ? "is-confirmed"
      : invitation?.status === "declined" ||
        invitation?.status === "expired" ||
        invitation?.status === "rejected"
      ? "is-declined"
      : "is-pending";

  return (
    <div className="dashboard-container">
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Standardized Page Header */}
      <div className="committee-page-header">
        <div className="committee-page-title-block">
          <div className="committee-page-title-row">
            <h2>Observation Request</h2>
          </div>
        </div>

        {invitation && (
          <div className="committee-page-header-meta">
            <span
              className={`status-chip ${
                invitation.status === "accepted" ||
                invitation.status === "confirmed"
                  ? "chip-draft"
                  : invitation.status === "declined" ||
                    invitation.status === "expired" ||
                    invitation.status === "rejected"
                  ? "chip-locked"
                  : "a02-chip-warning"
              }`}
            >
              {invitation.status === "pending"
                ? "ACTION REQUIRED"
                : invitation.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="a07-state-box">Loading incoming invitations...</div>
      )}

      {loadError && (
        <div role="alert" className="signin-error-banner">
          {loadError}
        </div>
      )}

      {!loading && !invitation && (
        <div className="a07-state-box">
          You currently have no observation invitations.
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className={
            statusMessage.type === "success"
              ? "feedback-banner-success"
              : "signin-error-banner"
          }
        >
          <strong>Status:</strong> {statusMessage.text}
        </div>
      )}

      {!loading && invitation && (
        <>
          <section className="e02-course-card">
            {!answeredText && invitation.expires_at && (
              <div className="e02-callout-notice a02-zero-margin">
                <strong>Response Window:</strong> Respond by{" "}
                {formatMoment(invitation.expires_at)}.
              </div>
            )}

            <div className="o01-request-grid">
              <div>
                <h3 className="e02-card-title o01-request-heading">
                  This faculty member is requesting you to be their observer.
                </h3>

                <div className="o01-details-stack">
                  <div>
                    <span className="s04-meta-label">Faculty Observee</span>
                    <div className="e01-preview-meta-val o01-detail-val">
                      {senderFullName}
                    </div>
                    <div className="assignment-subtext">
                      {invitation?.sender?.academic_level ||
                        "Academic level not provided"}
                    </div>
                  </div>

                  <div>
                    <span className="s04-meta-label">Course and Section</span>
                    <div className="e01-preview-meta-val o01-detail-val">
                      {invitation?.course
                        ? `${invitation.course.department_code} ${invitation.course.course_number}.${invitation.course.section}`
                        : "Course details unavailable"}
                    </div>
                    {invitation?.course?.title && (
                      <div className="assignment-subtext">
                        {invitation.course.title}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="s04-meta-label">
                      Meeting Days and Times
                    </span>
                    <div className="e01-preview-meta-val o01-detail-val">
                      {invitation?.course?.schedule || "Schedule not provided"}
                    </div>
                  </div>

                  <div>
                    <span className="s04-meta-label">Classroom Location</span>
                    <div className="e01-preview-meta-val o01-detail-val">
                      {invitation?.course?.classroom || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="o01-avatar-col">
                <div className="o01-avatar-ring">
                  <img
                    src={invitation.sender?.profile_photo || profileIcon}
                    alt={senderFullName}
                    className="o01-avatar-img"
                  />
                </div>
                <span className="s04-meta-label">Observee</span>
              </div>
            </div>
          </section>

          {answeredText && (
            <section className="e02-course-card">
              <div className="a02-section-title-group">
                <span className="a01-phase-pill">Response Recorded</span>
                <h3 className="e02-card-title">Your Response</h3>
              </div>

              <div
                className={`${
                  invitation.status === "accepted" ||
                  invitation.status === "confirmed"
                    ? "feedback-banner-success"
                    : "e02-callout-notice"
                } a02-zero-margin`}
              >
                <strong>{answeredText}</strong>
                {invitation?.status === "accepted" &&
                  " Waiting for the observee to confirm the visit."}
              </div>
            </section>
          )}

          {!answeredText && (
            <section className="e02-course-card">
              <div className="e02-card-header">
                <div className="a02-section-title-group">
                  <span className="a01-phase-pill">Schedule</span>
                  <h3 className="e02-card-title">
                    Observation Date and Time Selection
                  </h3>
                  <p className="e02-card-subtitle">
                    Select one date and time slot when you can attend their
                    class.
                  </p>
                </div>

                {selectedSlotId && (
                  <span className="s01-progress-badge">1 Slot Selected</span>
                )}
              </div>

              <div className="e02-callout-notice a02-zero-margin">
                <strong>Confirming Availability:</strong> Accepting this
                invitation confirms your availability and locks the visit date
                once approved by faculty.
              </div>

              {proposedDates.length === 0 ? (
                <p className="font-slate font-sm a02-zero-margin">
                  No proposed observation dates are attached to this invitation.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Proposed observation date slots"
                  className="o01-slot-list"
                >
                  {proposedDates.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <label
                        key={slot.id}
                        className={`checkbox-row-label o01-slot-option ${
                          isSelected ? "is-selected" : ""
                        }`}
                      >
                        <div className="o01-slot-left">
                          <input
                            type="radio"
                            name="observationDateSlot"
                            value={slot.id}
                            checked={isSelected}
                            onChange={() => setSelectedSlotId(slot.id)}
                          />
                          <span className="o01-slot-date">{slot.date}</span>
                        </div>

                        <span
                          className={
                            isSelected
                              ? "e02-saved-date-chip"
                              : "e02-summary-chip"
                          }
                        >
                          {slot.time}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="l03-footer-bar">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDeclineInvitation}
                  disabled={saving || !invitation}
                >
                  Decline Invitation
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptSelectedDate}
                  disabled={!selectedSlotId || saving || !invitation}
                >
                  {saving ? "Saving..." : "Accept Selected Date"}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}