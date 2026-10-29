// src/pages/observer/O01ObservationRequest.tsx
import { useEffect, useState } from "react";
import { matchingApi } from "../../api/endpoints";
import type { Invitation } from "../../api/types";
import { Link, useNavigate } from "react-router-dom";
import avatarPlaceholder from "../../assets/avatar.png";

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
  const navigate = useNavigate();

  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const proposedDates: ProposedDateSlot[] = (invitation?.proposed_dates ?? []).map(
    (date) => {
      const formatted = formatDateTime(date.datetime);
      return {
        id: String(date.proposed_date_id),
        date: formatted.date,
        time: formatted.time,
      };
    }
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInvitations() {
      setLoading(true);
      setLoadError("");

      try {
        const invitations = await matchingApi.incomingInvitations();

        if (cancelled) return;

        const pending = invitations.find(
          (item) => item.status === "pending"
        );

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
      setStatusMessage({ type: "error", text: "There is no invitation to respond to." });
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
      await matchingApi.respond(
        invitation.invitation_id,
        "accept",
        Number(selectedSlotId)
      );

      setStatusMessage({
        type: "success",
        text: "Your response was saved. The observee must confirm the final pairing.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Unable to accept the invitation.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) {
      setStatusMessage({ type: "error", text: "There is no invitation to decline." });
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
        text: err instanceof Error ? err.message : "Unable to decline the invitation.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          Back to Dashboard
        </Link>
      </div>

      <h2>Observation Request</h2>

      {loading && <p>Loading incoming invitations...</p>}

      {loadError && (
        <div role="alert" className="yellow-banner">{loadError}</div>
      )}

      {!loading && !invitation && (
        <div className="yellow-banner">You have no pending observation invitations.</div>
      )}

      {statusMessage && (
        <div
          className="yellow-banner"
          style={{
            backgroundColor: statusMessage.type === "success" ? "#dcfce7" : "#fee2e2",
            color: statusMessage.type === "success" ? "#166534" : "#991b1b",
            borderLeftColor: statusMessage.type === "success" ? "#22c55e" : "#ef4444",
            marginBottom: "1.5rem",
          }}
        >
          {statusMessage.type === "success" ? "🟢" : "🔴"} <strong>Status:</strong> {statusMessage.text}
        </div>
      )}

      {/* Faculty Request Card Section */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem" }}>
        <div className="yellow-banner" style={{ marginBottom: "1.25rem" }}>
          <strong>NOTE:</strong> Current Invitation Expires in 48 Hours!
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "2rem", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginBottom: "1rem" }}>
              This faculty member is requesting you to be their observer.
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
              <div>
                <strong>
                  {invitation?.sender
                    ? `${invitation.sender.first_name} ${invitation.sender.last_name}`.trim() ||
                      invitation.sender.username
                    : "Faculty details unavailable"}
                </strong>

                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                  {invitation?.sender?.academic_level || "Academic level not provided"}
                </p>
              </div>

              <div>
                <strong>Course and Section</strong>
                <p style={{ margin: 0, color: "#334155" }}>
                  {invitation?.course
                    ? `${invitation.course.department_code} ${invitation.course.course_number}.${invitation.course.section}`
                    : "Course details unavailable"}
                </p>

                {invitation?.course?.title && (
                  <p style={{ margin: 0, color: "#334155" }}>
                    {invitation.course.title}
                  </p>
                )}
              </div>

              <div>
                <strong>Meeting Days and Times</strong>
                <p style={{ margin: 0, color: "#334155" }}>
                  {invitation?.course?.schedule || "Schedule not provided"}
                </p>
              </div>

              <div>
                <strong>Classroom Location</strong>
                <p style={{ margin: 0, color: "#334155" }}>
                  {invitation?.course?.classroom || "Not provided"}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Avatar Silhouette */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={avatarPlaceholder}
              alt="Faculty Avatar"
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                objectFit: "cover",
                backgroundColor: "#f1f5f9",
                border: "2px solid #cbd5e1",
              }}
            />
          </div>
        </div>
      </section>

      {/* Observation Date and Time Selection Section */}
      <section className="dashboard-phase" style={{ marginTop: "2rem" }}>
        <h3>Observation Date and Time Selection</h3>

        <div className="yellow-banner" style={{ marginBottom: "1rem" }}>
          <strong>NOTE:</strong> Accepting this invitation confirms your availability and locks the visit date once approved by faculty.
        </div>

        <div className="table-container theme-orange">
          <div className="table-instruction">
            Select ONE date/time in which you can attend their class.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>Select</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {proposedDates.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <input
                        type="radio"
                        name="observationDateSlot"
                        value={slot.id}
                        checked={selectedSlotId === slot.id}
                        onChange={() => setSelectedSlotId(slot.id)}
                      />
                    </td>
                    <td>{slot.date}</td>
                    <td>{slot.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
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

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}