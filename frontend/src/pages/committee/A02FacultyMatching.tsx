// src/pages/committee/A02FacultyMatching.tsx
import { useEffect, useState } from "react";
import { committeeApi } from "../../api/endpoints";
import type { CycleDates } from "../../api/types";
import type { FacultyRow } from "../../api/types";
import { Link } from "react-router-dom";

export default function A02FacultyMatching() {
  const [observeeList, setObserveeList] = useState<FacultyRow[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<
    Record<number, { id: number; name: string; academic_level: string }[]>
  >({});
  const [selectedObservers, setSelectedObservers] = useState<
    Record<number, number[]>
  >({});
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [savingSignupId, setSavingSignupId] = useState<number | null>(null);
  const [matchError, setMatchError] = useState("");
  const [matchSuccess, setMatchSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("2026-09-13");
  const [endDate, setEndDate] = useState<string>("2026-10-09");
  const [savingDates, setSavingDates] = useState(false);
  const [displayStartDate, setDisplayStartDate] = useState<string>("Sep 13, 2026");
  const [displayEndDate, setDisplayEndDate] = useState<string>("Oct 9, 2026 at 11:59 PM");
  const [sendingNotifications, setSendingNotifications] = useState(false);


  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveDates = async () => {
    if (!startDate || !endDate) {
      setMatchError("Enter both the registration opening and closing dates.");
      return;
    }

    if (startDate > endDate) {
      setMatchError("The registration opening date must be before the closing date.");
      return;
    }

    setSavingDates(true);
    setMatchError("");
    setMatchSuccess("");

    try {
      const updated = await committeeApi.updateCycleDates({
        start_date: startDate,
        signup_deadline: endDate,
      });

      setStartDate(updated.start_date);
      setEndDate(updated.signup_deadline);

      setDisplayStartDate(
        new Date(`${updated.start_date}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      );

      setDisplayEndDate(
        `${new Date(`${updated.signup_deadline}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )} at 11:59 PM`
      );

      setMatchSuccess("Registration dates saved to the evaluation cycle.");
      setIsModalOpen(false);
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save registration dates."
      );
    } finally {
      setSavingDates(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMatchingData() {
      setLoadingMatches(true);
      setMatchError("");

      try {
        const cycleDates = await committeeApi.cycleDates();

        if (cancelled) return;

        setStartDate(cycleDates.start_date);
        setEndDate(cycleDates.signup_deadline);

        setDisplayStartDate(
          new Date(`${cycleDates.start_date}T00:00:00`).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" }
          )
        );

        setDisplayEndDate(
          `${new Date(`${cycleDates.signup_deadline}T00:00:00`).toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric", year: "numeric" }
          )} at 11:59 PM`
        );

        const roster = await committeeApi.faculty();

        const eligibleObservees = roster.faculty.filter(
          (faculty) => faculty.signup_id !== null && faculty.course !== null
        );

        if (cancelled) return;

        setObserveeList(eligibleObservees);

        const poolResults: [
          number,
          {
            candidates: {
              id: number;
              name: string;
              academic_level: string;
            }[];
            releasedObserverIds: number[];
          }
        ][] = await Promise.all(
          eligibleObservees.map(async (faculty) => {
            const signupId = faculty.signup_id!;

            try {
              const result = await committeeApi.candidatePool(signupId);

              const candidates: {
                id: number;
                name: string;
                academic_level: string;
              }[] = Array.isArray(result.candidates)
                ? (result.candidates as {
                    id: number;
                    name: string;
                    academic_level: string;
                  }[])
                : [];

              const releasedObserverIds: number[] = Array.isArray(
                result.released_observer_ids
              )
                ? result.released_observer_ids.filter(
                    (id): id is number => typeof id === "number"
                  )
                : [];

              return [
                signupId,
                { candidates, releasedObserverIds },
              ];
            } catch {
              return [
                signupId,
                { candidates: [], releasedObserverIds: [] },
              ];
            }
          })
        );

        if (cancelled) return;

        setCandidateOptions(
          Object.fromEntries(
            poolResults.map(([signupId, result]) => [
              signupId,
              result.candidates,
            ])
          )
        );

        setSelectedObservers(
          Object.fromEntries(
            poolResults
              .filter(([, result]) => result.releasedObserverIds.length > 0)
              .map(([signupId, result]) => [
                signupId,
                result.releasedObserverIds,
              ])
          )
        );

      } catch (err) {
        if (!cancelled) {
          setMatchError(
            err instanceof Error
              ? err.message
              : "Unable to load committee matching data."
          );
        }
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    }

    void loadMatchingData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleObserverChange = (
    signupId: number,
    slotIndex: number,
    observerId: number
  ) => {
    setSelectedObservers((previous) => {
      const current = [...(previous[signupId] ?? [])];
      current[slotIndex] = observerId;

      // Prevent selecting the same observer in multiple slots.
      const unique = current.filter(
        (id, index) => id !== 0 && current.indexOf(id) === index
      );

      return { ...previous, [signupId]: unique };
    });
  };

  const handleConfirmMatches = async (signupId: number) => {
    const observerIds = (selectedObservers[signupId] ?? []).filter(Boolean);

    if (observerIds.length === 0) {
      setMatchError("Select at least one eligible observer before confirming.");
      return;
    }

    if (observerIds.length > 5) {
      setMatchError("You can select at most five observers.");
      return;
    }

    setSavingSignupId(signupId);
    setMatchError("");
    setMatchSuccess("");

    try {
      await committeeApi.releaseCandidates(signupId, observerIds);
      setMatchSuccess(`Candidate list released for signup #${signupId}.`);
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save the selected observer candidates."
      );
    } finally {
      setSavingSignupId(null);
    }
  };

  const handleSendNotifications = async () => {
    const selectedEntries = observeeList
      .filter((person) => person.signup_id != null)
      .map((person) => ({
        person,
        signupId: person.signup_id!,
        observerIds: (selectedObservers[person.signup_id!] ?? []).filter(Boolean),
      }))
      .filter((entry) => entry.observerIds.length > 0);

    if (selectedEntries.length === 0) {
      setMatchError("Select at least one observer before sending notifications.");
      setMatchSuccess("");
      return;
    }

    const invalidEntry = selectedEntries.find(
      (entry) => entry.observerIds.length > 5
    );

    if (invalidEntry) {
      setMatchError("You can select at most five observers per observee.");
      setMatchSuccess("");
      return;
    }

    setSendingNotifications(true);
    setMatchError("");
    setMatchSuccess("");

    let succeeded = 0;
    const failures: string[] = [];

    try {
      for (const entry of selectedEntries) {
        try {
          await committeeApi.releaseCandidates(
            entry.signupId,
            entry.observerIds
          );
          succeeded++;
        } catch (err) {
          failures.push(
            `${entry.person.name}: ${
              err instanceof Error ? err.message : "Request failed"
            }`
          );
        }
      }

      if (failures.length > 0) {
        setMatchError(
          `${succeeded} observee(s) notified successfully. ${failures.length} failed: ${failures.join("; ")}`
        );
      }

      if (succeeded > 0) {
        setMatchSuccess(
          `Successfully released candidate lists and triggered notifications for ${succeeded} observee(s).`
        );
      }
    } finally {
      setSendingNotifications(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection and Matching</h2>

      {loadingMatches && <p>Loading faculty and eligible observer candidates...</p>}
      {matchError && <div role="alert" className="yellow-banner">{matchError}</div>}
      {matchSuccess && <div role="status" className="yellow-banner">{matchSuccess}</div>}

      {/* Top Banner Card */}
      <section className="table-container theme-orange" style={{ padding: "1.5rem" }}>
        <h3>Manage Course Registrations</h3>
        <p style={{ marginTop: "0.5rem" }}>
          <strong>Current Status:</strong> 🟢 COURSE REGISTRATION CURRENTLY OPEN <br />
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            (Open from {displayStartDate} until {displayEndDate})
          </span>
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          <strong>Next Scheduled Action:</strong> Auto-Lock Course Registrations and Generate Matches on Oct 10, 2026
        </p>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: "1rem" }}
          onClick={handleOpenModal}
        >
          Edit Course Registration Dates
        </button>
      </section>

      {/* Manual Matching */}
      <section className="dashboard-phase" style={{ marginTop: "1rem" }}>
        <h3>Manual Observer-Observee Matching</h3>

        <div className="yellow-banner">
          <strong>IMPORTANT:</strong> The following Observees have either 0 or insufficient Observers currently matched to them. Please ensure each Observee has 5 Observers assigned. Manually select eligible Observers from the dropdowns below.
        </div>

        <div className="table-container theme-green" style={{ padding: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
            {observeeList.map((observee) => {
              const signupId = observee.signup_id!;

              return (
                <div
                  key={signupId}
                  style={{
                    backgroundColor: "#fff7ed",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid #fed7aa",
                  }}
                >
                  <h4>Observee Name</h4>
                  <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "0.75rem" }}>
                    {observee.name}
                  </p>

                  <p>
                    <strong>
                      {observee.course
                        ? `${observee.course.department_code} ${observee.course.course_number}.${observee.course.section}`
                        : "Course not selected"}
                    </strong>
                  </p>

                  <strong>List of Available Observers</strong>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {[0, 1, 2, 3, 4].map((slotIndex) => (
                      <select
                        key={slotIndex}
                        value={selectedObservers[signupId]?.[slotIndex] ?? ""}
                        onChange={(event) =>
                          handleObserverChange(signupId, slotIndex, Number(event.target.value))
                        }
                        style={{ padding: "0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                      >
                        <option value="">Select observer {slotIndex + 1}...</option>
                        {(candidateOptions[signupId] ?? []).map((candidate) => (
                          <option
                            key={candidate.id}
                            value={candidate.id}
                            disabled={(selectedObservers[signupId] ?? []).some(
                              (id, index) => id === candidate.id && index !== slotIndex
                            )}
                          >
                            {candidate.name} {candidate.academic_level}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn-secondary btn-block"
                    style={{ marginTop: "1rem" }}
                    onClick={() => void handleConfirmMatches(signupId)}
                    disabled={savingSignupId === signupId}
                  >
                    {savingSignupId === signupId ? "Saving..." : "Confirm Matches"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Review & Approve */}
      <section className="dashboard-phase">
        <h3>Review and Approve Existing Observer-Observee Matched Lists</h3>

        <div className="yellow-banner">
          <strong>NOTE:</strong> Course registration closed on October 9. Below are the system-generated matched observer lists ready for review, manual override, and notification dispatch to Observees.
        </div>

        <div className="table-container theme-blue" style={{ padding: "1.25rem" }}>
          <p style={{ marginBottom: "1rem", fontWeight: "600" }}>
            Review the following completed matched lists. Select each Observee you'd like to notify about their successful matches:
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {observeeList.map((person) => {
              const signupId = person.signup_id;

              if (signupId == null) return null;

              const candidates = candidateOptions[signupId] ?? [];
              const selectedIds = selectedObservers[signupId] ?? [];

              return (
                <div
                  key={signupId}
                  style={{
                    backgroundColor: "#f0fdf4",
                    padding: "1rem",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <h4>Observee Name</h4>
                  <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                    {person.name}
                  </p>

                  <strong style={{ display: "block", marginTop: "0.75rem" }}>
                    List of Eligible Observers
                  </strong>

                  {candidates.length === 0 ? (
                    <p style={{ fontSize: "0.85rem" }}>
                      No eligible candidates were returned.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      {candidates.map((candidate) => (
                        <label
                          key={candidate.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(candidate.id)}
                            onChange={(event) => {
                              const updated = event.target.checked
                                ? [...selectedIds, candidate.id]
                                : selectedIds.filter((id) => id !== candidate.id);

                              setSelectedObservers((previous) => ({
                                ...previous,
                                [signupId]: updated,
                              }));
                            }}
                            disabled={
                              savingSignupId === signupId ||
                              (!selectedIds.includes(candidate.id) &&
                                selectedIds.length >= 5)
                            }
                          />
                          <span>
                            {candidate.name} ({candidate.academic_level})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary btn-block"
                    style={{ marginTop: "1rem" }}
                    onClick={() => void handleConfirmMatches(signupId)}
                    disabled={
                      savingSignupId === signupId || selectedIds.length === 0
                    }
                  >
                    {savingSignupId === signupId
                      ? "Saving..."
                      : `Approve ${selectedIds.length} Candidate(s)`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls Bar - Using standardized grey toggle buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={() => {
                const allSelected: Record<number, number[]> = {};

                observeeList.forEach((person) => {
                  if (person.signup_id == null) return;

                  const candidates = candidateOptions[person.signup_id] ?? [];
                  allSelected[person.signup_id] = candidates
                    .slice(0, 5)
                    .map((candidate) => candidate.id);
                });

                setSelectedObservers(allSelected);
              }}
            >
              Select All
            </button>

            <button
              type="button"
              className="btn-select-toggle"
              onClick={() => setSelectedObservers({})}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSendNotifications()}
            disabled={sendingNotifications}
          >
            {sendingNotifications ? "Sending..." : "Release Selected Lists & Notify"}
          </button>
        </div>

        {/* Bottom Centered Return Button */}
        <div className="dashboard-center-action">
          <Link to="/committee/dashboard" className="btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </section>

      {/* Date Control Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Course Registration Dates</h3>

            <div className="modal-field">
              <label htmlFor="reg-opens">
                Registration opens <span style={{ fontSize: "0.8rem", color: "#64748b" }}>(12:00 AM fixed)</span>
              </label>
              <input
                id="reg-opens"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-closes">
                Registration closes <span style={{ fontSize: "0.8rem", color: "#64748b" }}>(11:59 PM fixed)</span>
              </label>
              <input
                id="reg-closes"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-btn-secondary" onClick={handleCloseModal}>
                Close
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => void handleSaveDates()}
                disabled={savingDates}
              >
                {savingDates ? "Saving..." : "Save Dates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}