// src/pages/observer/O01ObservationRequest.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import avatarPlaceholder from "../../assets/avatar.png";

interface ProposedDateSlot {
  id: string;
  date: string;
  time: string;
}

const PROPOSED_DATES: ProposedDateSlot[] = [
  { id: "slot-1", date: "Oct 12, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-2", date: "Oct 14, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-3", date: "Oct 16, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-4", date: "Oct 19, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-5", date: "Oct 21, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-6", date: "Oct 23, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-7", date: "Oct 26, 2026", time: "1:00 PM - 2:15 PM" },
  { id: "slot-8", date: "Oct 28, 2026", time: "1:00 PM - 2:15 PM" },
];

export default function O01ObservationRequest() {
  const navigate = useNavigate();

  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAcceptSelectedDate = () => {
    if (!selectedSlotId) {
      setStatusMessage({ type: "error", text: "Please select one date and time slot before accepting." });
      return;
    }

    const chosenSlot = PROPOSED_DATES.find((slot) => slot.id === selectedSlotId);
    setStatusMessage({
      type: "success",
      text: `Invitation accepted for ${chosenSlot?.date} @ ${chosenSlot?.time}! This date has been locked in.`,
    });

    setTimeout(() => {
      navigate("/shared/faculty-dashboard");
    }, 2000);
  };

  const handleDeclineInvitation = () => {
    setStatusMessage({ type: "error", text: "Invitation declined." });

    setTimeout(() => {
      navigate("/shared/faculty-dashboard");
    }, 2000);
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observation Request</h2>

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
          ⏰ <strong>NOTE:</strong> Current Invitation Expires in 48 Hours!
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "2rem", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a", marginBottom: "1rem" }}>
              This faculty member is requesting you to be their observer.
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
              <div>
                <strong>Professor A</strong>
                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>Associate Professor</p>
              </div>

              <div>
                <strong>Course and Section</strong>
                <p style={{ margin: 0, color: "#334155" }}>CS 4349.002</p>
              </div>

              <div>
                <strong>Meeting Days and Times</strong>
                <p style={{ margin: 0, color: "#334155" }}>MW 1:00 PM - 2:15 PM</p>
              </div>

              <div>
                <strong>Classroom Location</strong>
                <p style={{ margin: 0, color: "#334155" }}>ECSS 2.412</p>
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
                {PROPOSED_DATES.map((slot) => (
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
          >
            Decline Invitation
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleAcceptSelectedDate}
            disabled={!selectedSlotId}
          >
            Accept Selected Date
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