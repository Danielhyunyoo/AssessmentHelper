// src/pages/observee/E02ObserverSelection.tsx
import { useEffect, useState } from "react";
import { matchingApi, facultyApi } from "../../api/endpoints";
import type { Invitation, Course } from "../../api/types";
import { Link, useLocation } from "react-router-dom";
import DataTable, { Column } from "../../components/DataTable";
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
  const [pendingCourseChange, setPendingCourseChange] =
    useState<PendingCourseChangeRequest | null>(() =>
      getPendingCourseChangeRequest()
    );
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
        const [matches, invitations, profile, availability, registration] =
          await Promise.all([
            matchingApi.matches(),
            matchingApi.sentInvitations(),
            facultyApi.profile(),
            facultyApi.availability(),
            facultyApi.registrationStatus(),
          ]);

        if (cancelled) return;

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
              [],
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

        setRegisteredCourse(profile.selected_course);
        setObservationDeadline(registration.observation_deadline);
        setPendingCourseChange(getPendingCourseChangeRequest());

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
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Unable to load observer candidates and invitations.";
          window.alert(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadObserverSelection();

    const syncPendingRequest = () =>
      setPendingCourseChange(getPendingCourseChangeRequest());
    window.addEventListener("course-change-request-updated", syncPendingRequest);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "course-change-request-updated",
        syncPendingRequest
      );
    };
  }, []);

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
      const msg = "Select at least one observer first.";
      setValidationError(msg);
      window.alert(msg);
      return;
    }

    if (availableDateTimes.length === 0) {
      const msg =
        "No saved observation date/times were found. Return to Course Selection and save your availability.";
      setValidationError(msg);
      window.alert(msg);
      return;
    }

    const candidatesWithoutDates = selectedCandidates.filter(
      (observerId) => (candidateDates[observerId] ?? []).length < 4
    );

    if (candidatesWithoutDates.length > 0) {
      const msg =
        "Select at least four proposed dates for every observer you want to invite.";
      setValidationError(msg);
      window.alert(msg);
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
        `Sent ${selectedCandidates.length} invitation(s). Their responses appear below.`
      );
      setSelectedCandidates([]);
    } catch (err) {
      window.alert(
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
  const isFinalized = responseData.some((row) => row.status === "confirmed");
  const hasAcceptedOrConfirmed = responseData.some(
    (row) => row.status === "accepted" || row.status === "confirmed"
  );
  const invitableIds = candidateData
    .map((candidate) => candidate.id)
    .filter((id) => !openInvitationStatus[Number(id)]);

  const candidateColumns: Column<CandidateRow>[] = [
    {
      header: "Select",
      width: "60px",
      render: (row) => {
        const status = openInvitationStatus[Number(row.id)];
        if (status) {
          return (
            <span className="font-slate font-sm">
              {status === "confirmed" ? "Confirmed" : "Invited"}
            </span>
          );
        }
        return (
          <input
            type="checkbox"
            checked={selectedCandidates.includes(row.id)}
            onChange={() => handleCheckboxToggle(row.id)}
            disabled={isFinalized}
          />
        );
      },
    },
    { header: "Observer Name", accessor: "observerName" },
    { header: "Department", accessor: "department" },
    { header: "Academic Level", accessor: "academicLevel" },
    {
      header: "Observation Date(s)",
      render: (row) => {
        const activeDates = candidateDates[row.id] || [];

        return (
          <div className="candidate-date-pills">
            {selectedDatesList.map((dateStr, idx) => {
              const isSelected = activeDates.includes(dateStr);
              const formattedDate = new Date(
                `${dateStr}T00:00:00`
              ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleCandidateDate(row.id, dateStr)}
                  className={`candidate-date-pill-btn ${
                    isSelected ? "is-selected" : ""
                  }`}
                >
                  {formattedDate}
                </button>
              );
            })}
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
    { header: "Observer", accessor: "observerName" },
    {
      header: "Response",
      render: (row) => (
        <span>
          {STATUS_LABELS[row.status] ?? row.status}
          {row.expiresAt && (
            <span className="font-slate font-sm">
              {" "}
              (expires {formatDateTime(row.expiresAt)})
            </span>
          )}
        </span>
      ),
    },
    { header: "Date", accessor: "date" },
    {
      header: "Actions",
      render: (row) =>
        row.status === "accepted" ? (
          <span className="bulk-btn-group">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectedInvitationId(row.id)}
            >
              {selectedInvitationId === row.id ? "Selected" : "Select"}
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
    setMessageArea("responses");
    setSaving(true);

    try {
      await action();
      setSelectedInvitationId(null);
      setSuccess(message);
      await reloadResponses();
    } catch (err) {
      window.alert(
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
    setMessageArea("responses");

    if (selectedInvitationId === null) {
      const msg = "Please select an observer who has accepted an invitation.";
      window.alert(msg);
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
      window.alert(
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

      {/* Top Section: Course Details & Clean Badge Bar */}
      <section className="table-container theme-orange summary-card-padding">
        <h3>Your Registered Course Information</h3>
        <p className="observation-card-text">
          <strong>Course Number and Title:</strong>{" "}
          {registeredCourse
            ? `${registeredCourse.department_code} ${registeredCourse.course_number} - ${
                registeredCourse.title || "Course Title Unavailable"
              }`
            : "No course selected"}
        </p>

        <p className="observation-card-text">
          <strong>Course Section:</strong>{" "}
          {registeredCourse?.section || "Not available"}
        </p>

        <p className="observation-card-text">
          <strong>Meeting Days and Times:</strong>{" "}
          {registeredCourse?.schedule || "Not available"}
        </p>

        <p className="observation-card-text">
          <strong>Classroom Location(s):</strong>{" "}
          {registeredCourse?.classroom || "Not available"}
        </p>

        {pendingCourseChange && (
          <div className="yellow-banner observer-pending-change-banner">
            <strong>PENDING COURSE CHANGE REQUEST:</strong> You requested to
            switch to{" "}
            <strong>
              {pendingCourseChange.requested_course_label} (Sec.{" "}
              {pendingCourseChange.requested_section})
            </strong>
            . Your current course remains active until an Assessment Committee
            member approves the change.
          </div>
        )}

        {/* Integrated Badge Bar */}
        <div className="committee-section">
          <div className="section-header-bar">
            <strong>
              Selected Proposed Observation Dates ({selectedDatesList.length})
            </strong>
            <Link to="/observee/course-selection" className="registration-link">
              Edit Dates →
            </Link>
          </div>

          {selectedDatesList.length === 0 ? (
            <p className="font-slate font-sm">No observation dates selected.</p>
          ) : (
            <div className="search-input-wrapper button-margin-top proposed-dates-pill-list">
              {selectedDatesList.map((dateStr, idx) => {
                const d = new Date(`${dateStr}T00:00:00`);
                const formatted = d.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <span key={idx} className="version-pill font-semibold">
                    {formatted}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Select from Matched Observer Candidates List (Hidden once an observer accepts or is confirmed) */}
      {!hasAcceptedOrConfirmed && (
        <section className="dashboard-phase section-margin-top">
          <h3>Select from Matched Observer Candidates List</h3>

          <div className="yellow-banner observer-deadline-banner">
            <strong>IMPORTANT:</strong>{" "}
            {observationDeadline
              ? `Please make sure all proposed observation dates fall before ${new Date(
                  `${observationDeadline}T00:00:00`
                ).toLocaleDateString()}.`
              : "The observation deadline could not be loaded. Please verify the allowed observation period."}
          </div>

          {messageArea === "invite" && validationError && (
            <p className="observer-validation-error">{validationError}</p>
          )}

          <DataTable
            themeColor="orange"
            instructionText="Select candidates to send an observation request for your registered course times."
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
                className="btn-select-toggle"
                onClick={() => setSelectedCandidates(invitableIds)}
                disabled={isFinalized}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn-select-toggle"
                onClick={() => setSelectedCandidates([])}
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
              {saving ? "Sending..." : "Send Invitation Requests"}
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
        <h3>Pending and Confirmed Observer Responses</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> Accepting an Observer will lock in your
          choice and automatically decline remaining candidates.
        </div>

        {responseData.length > 0 && (
          <p className="font-slate font-sm">
            <strong>{responseData.length} invited</strong>
            {statusCounts.map(
              ([status, count]) =>
                ` · ${count} ${(STATUS_LABELS[status] ?? status).toLowerCase()}`
            )}
          </p>
        )}

        <DataTable
          themeColor="green"
          instructionText="Review responses from invited observers."
          columns={responseColumns}
          data={responseData}
        />

        <div className="compact-actions-bar unregistered-actions-bar">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleRejectAll()}
            disabled={saving || !hasOpenInvitations}
          >
            Reject All
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleConfirmPairing()}
            disabled={saving || isFinalized || selectedInvitationId === null}
          >
            {saving
              ? "Confirming..."
              : isFinalized
              ? "Observer Confirmed"
              : "Confirm and Lock Changes"}
          </button>
        </div>

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