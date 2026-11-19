// src/pages/observee/E02ObserverSelection.tsx
import { useEffect, useState } from "react";
import { matchingApi, facultyApi, observationApi } from "../../api/endpoints";
import type { Invitation, Course } from "../../api/types";
import { Link, useLocation } from "react-router-dom";
import DataTable, { Column } from "../../components/DataTable";
import { formatDate } from "../../api/format";
import {
  getPendingCourseChangeRequest,
  type PendingCourseChangeRequest,
} from "./E01CourseSelection";

interface CandidateRow {
  id: string;
  observerName: string;
  department: string;
  academicLevel: string;
}

interface ResponseRecord {
  id: number;
  observerId: number;
  observerName: string;
  status: string;
  date: string;
  expiresAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting response",
  accepted: "Accepted",
  confirmed: "Confirmed",
  declined: "Declined",
  expired: "Expired",
  closed: "Closed",
  rejected: "Rejected",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string, includeWeekday = false): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    ...(includeWeekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
  });
}

function toResponseRows(
  invitations: Invitation[],
  names: Record<number, string>
): ResponseRecord[] {
  return invitations.map((invitation) => {
    const chosen = invitation.proposed_dates.find(
      (date) => date.status === "accepted"
    );
    return {
      id: invitation.invitation_id,
      observerId: invitation.recipient_id,
      observerName:
        names[invitation.recipient_id] ||
        `Observer #${invitation.recipient_id}`,
      status: invitation.status,
      date: chosen ? formatDateTime(chosen.datetime) : "",
      expiresAt: invitation.status === "pending" ? invitation.expires_at : null,
    };
  });
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
  const location = useLocation();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [candidateDates, setCandidateDates] = useState<
    Record<string, string[]>
  >({});
  const [candidateData, setCandidateData] = useState<CandidateRow[]>([]);
  const [responseData, setResponseData] = useState<ResponseRecord[]>([]);
  const [selectedInvitationId, setSelectedInvitationId] = useState<
    number | null
  >(null);
  const [selectedDatesList, setSelectedDatesList] = useState<string[]>([]);
  const [availableDateTimes, setAvailableDateTimes] = useState<string[]>([]);
  const [released, setReleased] = useState(false);
  const [registeredCourse, setRegisteredCourse] = useState<Course | null>(null);
  const [observationDeadline, setObservationDeadline] = useState<string | null>(
    null
  );
  const [professorIdentity, setProfessorIdentity] = useState<{
    id?: number;
    name?: string;
  }>({});
  const [pendingCourseChange, setPendingCourseChange] =
    useState<PendingCourseChangeRequest | null>(null);
  const [hasScheduledObservation, setHasScheduledObservation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [success, setSuccess] = useState("");
  const [messageArea, setMessageArea] = useState<
    "page" | "invite" | "responses"
  >("page");

  useEffect(() => {
    let cancelled = false;

    async function loadObserverSelection() {
      setLoading(true);

      try {
        const [
          matches,
          invitations,
          profile,
          availability,
          registration,
          scheduledVisits,
        ] = await Promise.all([
          matchingApi
            .matches()
            .catch(() => ({ released: false, candidates: [] })),
          matchingApi.sentInvitations().catch(() => [] as Invitation[]),
          facultyApi.profile(),
          facultyApi
            .availability()
            .catch(() => ({ available_datetimes: [] as string[] })),
          facultyApi.registrationStatus(),
          observationApi.scheduled().catch(() => []),
        ]);

        if (cancelled) return;

        const profRec = profile.professor as unknown as Record<string, unknown>;
        const resolvedId =
          typeof profRec?.id === "number"
            ? profRec.id
            : typeof profRec?.professor_id === "number"
            ? profRec.professor_id
            : undefined;
        const resolvedName = profile.professor
          ? `${profile.professor.first_name} ${profile.professor.last_name}`.trim()
          : undefined;

        setProfessorIdentity({ id: resolvedId, name: resolvedName });

        const savedDateTimes = availability.available_datetimes ?? [];
        setAvailableDateTimes(savedDateTimes);

        const savedDates = [
          ...new Set(savedDateTimes.map(localDateString).filter(Boolean)),
        ].sort();
        setSelectedDatesList(savedDates);
        setReleased(Boolean(matches.released));

        setCandidateDates(
          Object.fromEntries(
            (matches.candidates ?? []).map((candidate) => [
              String(candidate.id),
              savedDates.slice(0, 8),
            ])
          )
        );

        setCandidateData(
          (matches.candidates ?? []).map((candidate) => ({
            id: String(candidate.id),
            observerName: candidate.name,
            department: candidate.department || "Not provided",
            academicLevel: candidate.academic_level || "Not provided",
          }))
        );

        const activeScheduled = (scheduledVisits ?? []).some((visit) => {
          const vRec = visit as unknown as Record<string, unknown>;
          const role = String(
            vRec.role ?? vRec.user_role ?? ""
          ).toLowerCase();
          const status = String(vRec.status ?? "").toLowerCase();
          return (
            (!role || role === "observee") &&
            status !== "cancelled" &&
            status !== "canceled"
          );
        });
        setHasScheduledObservation(activeScheduled);
        setRegisteredCourse(profile.selected_course);
        setResponseData(
          toResponseRows(
            invitations,
            Object.fromEntries(
              (matches.candidates ?? []).map((candidate) => [
                candidate.id,
                candidate.name,
              ])
            )
          )
        );

        setObservationDeadline(registration.observation_deadline);
        setPendingCourseChange(
          getPendingCourseChangeRequest(resolvedId, resolvedName)
        );
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Unable to load observer candidates and invitations.";
          setMessageArea("page");
          setValidationError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadObserverSelection();

    const handleDemoReset = () => {
      void loadObserverSelection();
    };

    window.addEventListener("demo-reset", handleDemoReset);

    return () => {
      cancelled = true;
      window.removeEventListener("demo-reset", handleDemoReset);
    };
  }, []);

  useEffect(() => {
    const syncPendingRequest = () => {
      if (professorIdentity.id != null || professorIdentity.name) {
        setPendingCourseChange(
          getPendingCourseChangeRequest(
            professorIdentity.id,
            professorIdentity.name
          )
        );
      }
    };
    window.addEventListener("course-change-request-updated", syncPendingRequest);
    window.addEventListener("storage", syncPendingRequest);
    return () => {
      window.removeEventListener(
        "course-change-request-updated",
        syncPendingRequest
      );
      window.removeEventListener("storage", syncPendingRequest);
    };
  }, [professorIdentity]);

  useEffect(() => {
    if (!loading && location.hash === "#responses") {
      document
        .getElementById("responses")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [loading, location.hash]);

  const handleSendInvitations = async () => {
    setSuccess("");
    setValidationError("");
    setMessageArea("invite");

    if (selectedCandidates.length === 0) {
      setValidationError("Select at least one observer first.");
      return;
    }

    if (availableDateTimes.length === 0) {
      setValidationError(
        "No saved observation date/times were found. Return to Course Selection and save your availability."
      );
      return;
    }

    const candidatesWithoutDates = selectedCandidates.filter(
      (observerId) => (candidateDates[observerId] ?? []).length < 4
    );

    if (candidatesWithoutDates.length > 0) {
      setValidationError(
        "Select at least four proposed dates for every observer you want to invite."
      );
      return;
    }

    if (
      selectedCandidates.some(
        (observerId) => (candidateDates[observerId] ?? []).length > 8
      )
    ) {
      setValidationError("Propose at most eight dates to each observer.");
      return;
    }

    setSaving(true);

    try {
      for (const observerId of selectedCandidates) {
        const datesForObserver = candidateDates[observerId] ?? [];

        const proposedDateTimes = availableDateTimes.filter((dateTime) =>
          datesForObserver.includes(localDateString(dateTime))
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

      setResponseData(toResponseRows(invitations, observerNames));
      setSuccess(
        `Sent ${selectedCandidates.length} invitation${selectedCandidates.length === 1 ? "" : "s"}. Their responses appear below.`
      );
      setSelectedCandidates([]);
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "Unable to send invitation requests."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxToggle = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

  const openInvitationStatus: Record<number, string> = Object.fromEntries(
    responseData
      .filter((row) => ["pending", "accepted", "confirmed"].includes(row.status))
      .map((row) => [row.observerId, row.status])
  );
  const confirmedRow = responseData.find((row) => row.status === "confirmed");
  const isFinalized = Boolean(confirmedRow) || hasScheduledObservation;
  const hasAcceptedOrConfirmed = responseData.some(
    (row) => row.status === "accepted" || row.status === "confirmed"
  );
  const invitableIds = candidateData
    .map((candidate) => candidate.id)
    .filter((id) => !openInvitationStatus[Number(id)]);

  const candidateColumns: Column<CandidateRow>[] = [
    {
      header: "Select",
      headerClassName: "table-col-selection",
      render: (row) => {
        const status = openInvitationStatus[Number(row.id)];
        if (status) {
          return (
            <span
              className={`e02-status-pill ${
                status === "confirmed" ? "is-confirmed" : "is-invited"
              }`}
            >
              {status === "confirmed" ? "Confirmed" : "Invited"}
            </span>
          );
        }
        if (isFinalized) return null;
        return (
          <input
            type="checkbox"
            aria-label={`Select ${row.observerName}`}
            checked={selectedCandidates.includes(row.id)}
            onChange={() => handleCheckboxToggle(row.id)}
          />
        );
      },
    },
    {
      header: "Observer Name",
      render: (row) => (
        <span className="e02-observer-name">{row.observerName}</span>
      ),
    },
    { header: "Department", accessor: "department" },
    { header: "Academic Level", accessor: "academicLevel" },
    {
      header: "Proposed Dates (4–8)",
      render: (row) => {
        if (isFinalized || openInvitationStatus[Number(row.id)]) return null;
        const activeDates = candidateDates[row.id] || [];
        const isValidCount =
          activeDates.length >= 4 && activeDates.length <= 8;

        return (
          <div className="e02-dates-cell">
            <div className="candidate-date-pills">
              {selectedDatesList.map((dateStr, idx) => {
                const isSelected = activeDates.includes(dateStr);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleCandidateDate(row.id, dateStr)}
                    className={`candidate-date-pill-btn ${
                      isSelected ? "is-selected" : ""
                    }`}
                  >
                    {formatShortDate(dateStr)}
                  </button>
                );
              })}
            </div>
            <span
              className={`e02-date-count-tag ${
                isValidCount ? "is-valid" : "is-warning"
              }`}
            >
              {activeDates.length}/8 selected
            </span>
          </div>
        );
      },
    },
  ];

  const observerNames = Object.fromEntries(
    candidateData.map((candidate) => [
      Number(candidate.id),
      candidate.observerName,
    ])
  );

  const responseColumns: Column<ResponseRecord>[] = [
    {
      header: "Observer",
      render: (row) => (
        <span className="e02-observer-name">{row.observerName}</span>
      ),
    },
    {
      header: "Response",
      render: (row) => (
        <div className="e02-response-status-cell">
          <span className={`e02-status-pill is-${row.status}`}>
            {STATUS_LABELS[row.status] ?? row.status}
          </span>
          {row.expiresAt && (
            <span className="font-slate font-sm">
              expires {formatDateTime(row.expiresAt)}
            </span>
          )}
        </div>
      ),
    },
    { header: "Scheduled Date", accessor: "date" },
    {
      header: "Actions",
      render: (row) =>
        row.status === "accepted" ? (
          <span className="bulk-btn-group">
            <button
              type="button"
              className={
                selectedInvitationId === row.id
                  ? "primary-btn"
                  : "btn-secondary"
              }
              onClick={() => setSelectedInvitationId(row.id)}
            >
              {selectedInvitationId === row.id ? "✓ Selected" : "Select"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleReject(row.id)}
              disabled={saving}
            >
              Reject
            </button>
          </span>
        ) : null,
    },
  ];

  const statusCounts = Object.entries(
    responseData.reduce<Record<string, number>>((counts, row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      return counts;
    }, {})
  );

  const reloadResponses = async () => {
    const invitations = await matchingApi.sentInvitations();
    setResponseData(toResponseRows(invitations, observerNames));
  };

  const runAction = async (
    action: () => Promise<unknown>,
    message: string
  ) => {
    setSuccess("");
    setValidationError("");
    setMessageArea("responses");
    setSaving(true);

    try {
      await action();
      setSelectedInvitationId(null);
      setSuccess(message);
      await reloadResponses();
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "Unable to update the invitation."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReject = (invitationId: number) =>
    runAction(
      () => matchingApi.reject(invitationId),
      "Response rejected. You can invite this observer again."
    );

  const handleRejectAll = () =>
    runAction(
      () => matchingApi.rejectAll(),
      "All open invitations were withdrawn."
    );

  const hasOpenInvitations = responseData.some(
    (row) => row.status === "pending" || row.status === "accepted"
  );

  const handleConfirmPairing = async () => {
    setSuccess("");
    setValidationError("");
    setMessageArea("responses");

    if (selectedInvitationId === null) {
      setValidationError(
        "Please select an observer who has accepted an invitation."
      );
      return;
    }

    setSaving(true);

    try {
      await matchingApi.confirmPairing(selectedInvitationId);
      setSuccess("Observer and observation date confirmed.");
      setSelectedInvitationId(null);
      const invitations = await matchingApi.sentInvitations();
      setResponseData(toResponseRows(invitations, observerNames));
    } catch (err) {
      setValidationError(
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
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Standardized Page Header */}
      <div className="committee-page-header">
        <div className="committee-page-title-block">
          <span className="a01-phase-pill">Observee Workflow: Step 2</span>
          <div className="committee-page-title-row">
            <h2>Observer Selection</h2>
          </div>
        </div>

        <div className="committee-page-header-meta">
          {isFinalized ? (
            <span className="status-chip chip-draft">PAIRING CONFIRMED</span>
          ) : (
            observationDeadline && (
              <span className="status-chip a02-chip-warning">
                DEADLINE: {formatDate(observationDeadline).toUpperCase()}
              </span>
            )
          )}
        </div>
      </div>

      {loading && (
        <div className="a07-state-box">
          Loading matched observers and invitations...
        </div>
      )}
      {messageArea === "page" && validationError && (
        <div role="alert" className="signin-error-banner">
          {validationError}
        </div>
      )}

      {/* Top Section: Course Details & Clean Badge Bar */}
      <section className="e02-course-card">
        <div className="e02-card-header">
          <div>
            <h3 className="e02-card-title">Registered Course Information</h3>
            <p className="e02-card-subtitle">
              {isFinalized
                ? "Your observation pairing and scheduled date are locked."
                : "Invitations will be sent for your registered class meeting times."}
            </p>
          </div>
          {isFinalized ? (
            <span className="status-pill-active">Confirmed &amp; Locked</span>
          ) : (
            <Link to="/observee/course-selection" className="btn-secondary">
              Edit Availability →
            </Link>
          )}
        </div>

        <div className="form-summary-grid-4">
          <div className="form-summary-cell">
            <span className="summary-field-label">Course</span>
            <p className="summary-field-val">
              {registeredCourse
                ? `${registeredCourse.department_code} ${registeredCourse.course_number} - ${
                    registeredCourse.title || "Title Unavailable"
                  }`
                : "No course selected"}
            </p>
          </div>

          <div className="form-summary-cell">
            <span className="summary-field-label">Section</span>
            <p className="summary-field-val">
              {registeredCourse?.section || "Not available"}
            </p>
          </div>

          <div className="form-summary-cell">
            <span className="summary-field-label">Meeting Days and Times</span>
            <p className="summary-field-val">
              {registeredCourse?.schedule || "Not available"}
            </p>
          </div>

          <div className="form-summary-cell">
            <span className="summary-field-label">Classroom Location</span>
            <p className="summary-field-val">
              {registeredCourse?.classroom || "Not available"}
            </p>
          </div>
        </div>

        {!isFinalized && pendingCourseChange && (
          <div className="e02-callout-notice observer-pending-change-banner">
            <strong>Pending Course Change Request:</strong> You requested to
            switch to{" "}
            <strong>
              {pendingCourseChange.requested_course_label} (Sec.{" "}
              {pendingCourseChange.requested_section})
            </strong>
            . Your current course remains active until an Assessment Committee
            member approves the change.
          </div>
        )}

        <div className="e02-dates-footer">
          <div className="e02-dates-footer-head">
            <span className="summary-field-label">
              {isFinalized
                ? "Confirmed Observation Date"
                : `Saved Proposed Observation Dates (${selectedDatesList.length})`}
            </span>
          </div>

          {isFinalized && confirmedRow?.date ? (
            <div className="proposed-dates-pill-list">
              <span className="e02-saved-date-chip">{confirmedRow.date}</span>
            </div>
          ) : selectedDatesList.length === 0 ? (
            <p className="font-slate font-sm a02-zero-margin">
              No observation dates selected.
            </p>
          ) : (
            <div className="proposed-dates-pill-list">
              {selectedDatesList.map((dateStr, idx) => (
                <span key={idx} className="e02-saved-date-chip">
                  {formatShortDate(dateStr, true)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LOCKED BANNER WHEN PAIRING IS CONFIRMED */}
      {isFinalized && (
        <section className="dashboard-phase phase-spacing">
          <div className="e02-callout-notice">
            <p style={{ margin: "0 0 0.75rem 0" }}>
              <strong>Observation Pairing Confirmed &amp; Locked:</strong> Your
              observation pairing
              {confirmedRow?.observerName
                ? ` with ${confirmedRow.observerName}`
                : ""}{" "}
              is confirmed. Because both parties have confirmed this match, you
              can no longer change your course, availability dates, or observer
              selection here.
            </p>
            <p style={{ margin: "0 0 1rem 0" }}>
              To request a cancellation or any changes to a confirmed
              observation, please contact the Assessment Committee at{" "}
              <a
                href="mailto:assessment-committee@utdallas.edu?subject=Confirmed%20Observation%20Change%20Request"
                className="s04-inline-link"
              >
                assessment-committee@utdallas.edu
              </a>{" "}
              or submit a message through the Contact Assessment Committee page.
            </p>
            <div className="bulk-btn-group">
              <Link to="/shared/contact-committee" className="btn-primary">
                Contact Assessment Committee (S07) →
              </Link>
              <a
                href="mailto:assessment-committee@utdallas.edu?subject=Confirmed%20Observation%20Change%20Request"
                className="btn-secondary"
              >
                Email Assessment Committee
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Select from Matched Observer Candidates List */}
      {!isFinalized && !hasAcceptedOrConfirmed && (
        <section className="dashboard-phase phase-spacing">
          <div className="a01-phase-title-group">
            <span className="a01-phase-pill">Matched Pool</span>
            <h3>Select from Matched Observer Candidates</h3>
          </div>

          <div className="e02-callout-notice observer-deadline-banner">
            <strong>Scheduling Window:</strong>{" "}
            {observationDeadline
              ? `Ensure all proposed observation dates fall on or before ${formatDate(
                  observationDeadline
                )}. Select 4 to 8 dates per observer.`
              : "The observation deadline could not be loaded. Please verify the allowed observation period."}
          </div>

          {messageArea === "invite" && validationError && (
            <div role="alert" className="signin-error-banner">
              {validationError}
            </div>
          )}

          <DataTable
            themeColor="orange"
            instructionText="Select candidates and customize their 4–8 proposed dates before sending requests."
            columns={candidateColumns}
            emptyMessage={
              released
                ? "No observers were released to you."
                : "Waiting for the Assessment Committee to release your observers."
            }
            data={candidateData}
          />

          <div className="compact-actions-bar unregistered-actions-bar">
            <div className="bulk-btn-group">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedCandidates(invitableIds)}
                disabled={isFinalized || invitableIds.length === 0}
              >
                Select All ({invitableIds.length})
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedCandidates([])}
                disabled={selectedCandidates.length === 0}
              >
                Deselect All
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleSendInvitations()}
              disabled={
                saving ||
                loading ||
                isFinalized ||
                selectedCandidates.length === 0
              }
            >
              {saving
                ? "Sending..."
                : selectedCandidates.length > 0
                ? `Send Invitation Request${
                    selectedCandidates.length === 1 ? "" : "s"
                  } (${selectedCandidates.length})`
                : "Send Invitation Requests"}
            </button>
          </div>

          {messageArea === "invite" && success && (
            <div
              role="status"
              className="feedback-banner-success observer-feedback-banner"
            >
              {success}
            </div>
          )}
        </section>
      )}

      {/* Section 3: Pending and Confirmed Observer Responses */}
      <section id="responses" className="dashboard-phase phase-spacing">
        <div className="e02-responses-header">
          <div className="a01-phase-title-group">
            <span className="a01-phase-pill">Invitation Status</span>
            <h3>Pending and Confirmed Observer Responses</h3>
          </div>

          {responseData.length > 0 && (
            <div className="e02-status-summary-bar">
              <span className="e02-summary-total">
                {responseData.length} invited
              </span>
              {statusCounts.map(([status, count]) => (
                <span key={status} className="e02-summary-chip">
                  {count} {(STATUS_LABELS[status] ?? status).toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {!isFinalized && (
          <div className="e02-callout-notice">
            <strong>Finalizing Your Pairing:</strong> Confirming an accepted
            observer locks in your pairing and automatically declines any
            remaining open invitations.
          </div>
        )}

        <DataTable
          themeColor="green"
          instructionText={
            isFinalized
              ? "Your confirmed observer pairing details."
              : "Review responses from invited observers."
          }
          columns={responseColumns}
          data={responseData}
        />

        {!isFinalized && hasOpenInvitations && (
          <div className="compact-actions-bar unregistered-actions-bar">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleRejectAll()}
              disabled={saving}
            >
              Withdraw All Open Invitations
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleConfirmPairing()}
              disabled={saving || selectedInvitationId === null}
            >
              {saving ? "Confirming..." : "Confirm and Lock Pairing"}
            </button>
          </div>
        )}

        {messageArea === "responses" && validationError && (
          <div role="alert" className="signin-error-banner">
            {validationError}
          </div>
        )}

        {messageArea === "responses" && success && (
          <div
            role="status"
            className="feedback-banner-success observer-feedback-banner"
          >
            {success}
          </div>
        )}

        <div className="dashboard-center-action">
          <Link to="/shared/faculty-dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}