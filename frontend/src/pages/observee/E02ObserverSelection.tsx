// src/pages/observee/E02ObserverSelection.tsx
import { useEffect, useState } from "react";
import { matchingApi, facultyApi } from "../../api/endpoints";
import type { Candidate, Invitation, Course } from "../../api/types";
import { Link } from "react-router-dom";
import DataTable, { Column } from "../../components/DataTable";
import Calendar from "../../components/Calendar";

interface CandidateRow {
  id: string;
  observerName: string;
  department: string;
  academicLevel: string;
}

interface ResponseRecord {
  id: string;
  observerName: string;
  proposedDateTime: string;
  responseStatus: "CONFIRMED" | "PENDING" | "DECLINED" | "CANCELLED";
}

function localDateString(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function E02ObserverSelection() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateDates, setCandidateDates] = useState<Record<string, string[]>>({});
  const [candidateData, setCandidateData] = useState<CandidateRow[]>([]);
  const [responseData, setResponseData] = useState<ResponseRecord[]>([]);
  const [selectedInvitationId, setSelectedInvitationId] = useState<number | null>(null);
  const [selectedDatesList, setSelectedDatesList] = useState<string[]>([]);
  const [availableDateTimes, setAvailableDateTimes] = useState<string[]>([]);
  const [cycleStartDate, setCycleStartDate] = useState<string | null>(null);
  const [registeredCourse, setRegisteredCourse] = useState<Course | null>(null);
  const [observationDeadline, setObservationDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadObserverSelection() {
      setLoading(true);
      setError("");

      try {
        const [
          matches,
          invitations,
          profile,
          availability,
          registration,
        ] = await Promise.all([
          matchingApi.matches(),
          matchingApi.sentInvitations(),
          facultyApi.profile(),
          facultyApi.availability(),
          facultyApi.registrationStatus(),
        ]);

        if (cancelled) return;

        const savedDateTimes = availability.available_datetimes ?? [];

        setAvailableDateTimes(savedDateTimes);

        setSelectedDatesList(
          [...new Set(savedDateTimes.map(localDateString).filter(Boolean))]
        );

        setCandidateData(
          (matches.candidates ?? []).map((candidate) => ({
            id: String(candidate.id),
            observerName: candidate.name,
            department: candidate.department || "Not provided",
            academicLevel: candidate.academic_level || "Not provided",
          }))
        );

        setRegisteredCourse(profile.selected_course);
        setObservationDeadline(registration.observation_deadline);
        setCycleStartDate(registration.start_date);

        setResponseData(
          invitations.flatMap((invitation) => {
            const candidate = matches.candidates.find(
              (item) => item.id === invitation.recipient_id
            );

            return invitation.proposed_dates.map((date) => ({
              id: String(invitation.invitation_id),
              observerName:
                candidate?.name || `Observer #${invitation.recipient_id}`,
              proposedDateTime: new Date(date.datetime).toLocaleString(),
              responseStatus:
                invitation.status === "confirmed" || date.status === "accepted"
                  ? "CONFIRMED"
                  : invitation.status === "declined"
                    ? "DECLINED"
                    : invitation.status === "closed" ||
                        invitation.status === "expired"
                      ? "CANCELLED"
                      : "PENDING",
            }));
          })
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load observer candidates and invitations."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadObserverSelection();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendInvitations = async () => {
    setError("");
    setSuccess("");

    if (selectedCandidates.length === 0) {
      setError("Select at least one observer first.");
      return;
    }

    if (availableDateTimes.length === 0) {
      setError(
        "No saved observation date/times were found. Return to Course Selection and save your availability."
      );
      return;
    }

    const candidatesWithoutDates = selectedCandidates.filter(
      (observerId) => (candidateDates[observerId] ?? []).length === 0
    );

    if (candidatesWithoutDates.length > 0) {
      setError(
        "Select at least one proposed date for every observer you want to invite."
      );
      return;
    }

    setSaving(true);

    try {
      for (const observerId of selectedCandidates) {
        const datesForObserver = candidateDates[observerId] ?? [];

        const proposedDateTimes = availableDateTimes.filter(
          (dateTime) => datesForObserver.includes(localDateString(dateTime))
        );

        if (proposedDateTimes.length === 0) {
          throw new Error(
            `No saved date/time choices were found for observer #${observerId}.`
          );
        }

        await matchingApi.sendInvitation(
          Number(observerId),
          proposedDateTimes
        );
      }

      const invitations = await matchingApi.sentInvitations();

      setResponseData(
        invitations.flatMap((invitation) =>
          invitation.proposed_dates.map((date) => ({
            id: String(invitation.invitation_id),
            observerName:
              candidateData.find(
                (candidate) =>
                  candidate.id === String(invitation.recipient_id)
              )?.observerName || `Observer #${invitation.recipient_id}`,
            proposedDateTime: new Date(date.datetime).toLocaleString(),
            responseStatus:
              invitation.status === "declined"
                ? "DECLINED"
                : invitation.status === "expired" ||
                    invitation.status === "closed"
                  ? "CANCELLED"
                  : invitation.status === "accepted" ||
                      invitation.status === "confirmed"
                    ? "CONFIRMED"
                    : "PENDING",
          }))
        )
      );

      setSuccess("Invitation requests were sent successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to send invitation requests."
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle candidate checkbox selection
  const handleCheckboxToggle = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle individual date selection per professor (interactive chips)
  const toggleCandidateDate = (candidateId: string, dateStr: string) => {
    setCandidateDates((prev) => {
      const currentDates = prev[candidateId] || [];
      const exists = currentDates.includes(dateStr);

      const updated = exists
        ? currentDates.filter((d) => d !== dateStr)
        : [...currentDates, dateStr];

      return { ...prev, [candidateId]: updated };
    });
  };

  // Columns for Table 1: Matched Observer Candidates
  const candidateColumns: Column<CandidateRow>[] = [
    {
      header: "Select",
      width: "60px",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedCandidates.includes(row.id)}
          onChange={() => handleCheckboxToggle(row.id)}
        />
      ),
    },
    { header: "Observer Name", accessor: "observerName" },
    { header: "Department", accessor: "department" },
    { header: "Academic Level", accessor: "academicLevel" },
    {
      header: "Observation Date(s)",
      width: "300px",
      render: (row) => {
        const activeDates = candidateDates[row.id] || [];

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
            {selectedDatesList.map((dateStr, idx) => {
              const isSelected = activeDates.includes(dateStr);
              const formattedDate = new Date(`${dateStr}T00:00:00`).toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              );

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCandidateDate(row.id, dateStr)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    border: isSelected ? "1px solid #1e293b" : "1px solid #cbd5e1",
                    backgroundColor: isSelected ? "#1e293b" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#334155",
                    transition: "all 0.15s ease",
                  }}
                >
                  {formattedDate} {isSelected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        );
      },
    },
  ];

  // Columns for Table 2: Pending and Confirmed Responses
  const responseColumns: Column<ResponseRecord>[] = [
    {
      header: "",
      width: "40px",
      render: () => <span style={{ color: "#94a3b8" }}>-</span>,
    },
    { header: "Observer Name", accessor: "observerName" },
    { header: "Proposed Date and Time", accessor: "proposedDateTime" },
    { header: "Observer Response", accessor: "responseStatus" },
    {
      header: "Actions",
      render: (row) => {
        if (row.responseStatus === "PENDING") {
          return <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>AWAITING RESPONSE</span>;
        }
        if (row.responseStatus === "CONFIRMED") {
          const invitationId = Number(row.id);

          return (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSelectedInvitationId(invitationId)}
              style={{
                fontWeight: selectedInvitationId === invitationId ? "700" : "400",
              }}
            >
              {selectedInvitationId === invitationId ? "Selected" : "Select Observer"}
            </button>
          );
        }
        if (row.responseStatus === "DECLINED" || row.responseStatus === "CANCELLED") {
          return (
            <span style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "0.25rem 0.75rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "700" }}>
              DECLINED
            </span>
          );
        }
        return <span>-</span>;
      },
    },
  ];

  const handleConfirmPairing = async () => {
    setError("");
    setSuccess("");

    if (selectedInvitationId === null) {
      setError("Please select an observer who has accepted an invitation.");
      return;
    }

    setSaving(true);

    try {
      await matchingApi.confirmPairing(selectedInvitationId);

      setSuccess("Observer and observation date confirmed successfully.");

      // Reload the page's invitation and response data.
      const invitations = await matchingApi.sentInvitations();

      setResponseData(
        invitations.flatMap((invitation) =>
          invitation.proposed_dates.map((date) => ({
            id: String(invitation.invitation_id),
            observerName:
              candidateData.find(
                (candidate) =>
                  candidate.id === String(invitation.recipient_id)
              )?.observerName || `Observer #${invitation.recipient_id}`,
            proposedDateTime: new Date(date.datetime).toLocaleString(),
            responseStatus:
              invitation.status === "declined"
                ? "DECLINED"
                : invitation.status === "expired" ||
                    invitation.status === "closed"
                  ? "CANCELLED"
                  : invitation.status === "accepted" ||
                      invitation.status === "confirmed" ||
                      date.status === "accepted"
                    ? "CONFIRMED"
                    : "PENDING",
          }))
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to confirm the observation pairing."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection</h2>

      {loading && <p>Loading matched observers and invitations...</p>}
      {error && <div role="alert" className="yellow-banner">{error}</div>}
      {success && <div role="status" className="yellow-banner">{success}</div>}

      {/* Top Section: Registered Course Info & Calendar Widget */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Your Registered Course Information</h3>
            <p>
              <strong>Course Number and Title:</strong>{" "}
              {registeredCourse
                ? `${registeredCourse.department_code} ${registeredCourse.course_number} - ${registeredCourse.title || "Course Title Unavailable"}`
                : "No course selected"}
            </p>

            <p style={{ marginTop: "0.5rem" }}>
              <strong>Course Section:</strong>{" "}
              {registeredCourse?.section || "Not available"}
            </p>

            <p style={{ marginTop: "0.5rem" }}>
              <strong>Meeting Days and Times:</strong>{" "}
              {registeredCourse?.schedule || "Not available"}
            </p>

            <p style={{ marginTop: "0.5rem" }}>
              <strong>Classroom Location(s):</strong>{" "}
              {registeredCourse?.classroom || "Not available"}
            </p>    
          </div>

          {/* Staying hardcoded until backend can give observation period and structured course meeting days */}
          <div>
            <Calendar
              selectedDates={selectedDatesList}
              onDateSelectionChange={() => {}}
              allowedDaysOfWeek={["Mon", "Tue", "Wed", "Thu", "Fri"]}
              maxSelections={8}
              minDate={cycleStartDate ?? undefined}
              maxDate={observationDeadline ?? undefined}
              readOnly
            />
          </div>
        </div>
      </section>

      {/* Section 2: Select from Matched Observer Candidates List */}
      <section className="dashboard-phase" style={{ marginTop: "2rem" }}>
        <h3>Select from Matched Observer Candidates List</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong>{" "}
          {observationDeadline
            ? `Please make sure all proposed observation dates fall before ${new Date(`${observationDeadline}T00:00:00`).toLocaleDateString()}.`
            : "The observation deadline could not be loaded. Please verify the allowed observation period."}
        </div>

        <DataTable
          themeColor="orange"
          instructionText="Select candidates to send an observation request for your registered course times."
          columns={candidateColumns}
          data={candidateData}
        />

        <div className="compact-actions-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn-select-toggle" onClick={() => setSelectedCandidates(candidateData.map((c) => c.id))}>
              Select All
            </button>
            <button type="button" className="btn-select-toggle" onClick={() => setSelectedCandidates([])}>
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSendInvitations()}
            disabled={saving || loading}
          >
            {saving ? "Sending..." : "Send Invitation Requests"}
          </button>
        </div>
      </section>

      {/* Section 3: Pending and Confirmed Observer Responses */}
      <section className="dashboard-phase" style={{ marginTop: "2.5rem" }}>
        <h3>Pending and Confirmed Observer Responses</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Accepting an Observer will lock in your choice and automatically decline remaining candidates.
        </div>

        <DataTable
          themeColor="green"
          instructionText="Review responses from invited observers."
          columns={responseColumns}
          data={responseData}
        />

        <div className="compact-actions-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="btn-secondary">
            Reject All
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleConfirmPairing()}
            disabled={saving || selectedInvitationId === null}
          >
            {saving ? "Confirming..." : "Confirm and Lock Changes"}
          </button>
        </div>

        <div className="dashboard-center-action">
          <Link to="/shared/faculty-dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}