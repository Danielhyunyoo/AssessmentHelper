// src/pages/committee/A02FacultyMatching.tsx
import { useEffect, useState, useRef } from "react";
import { committeeApi, demoApi } from "../../api/endpoints";
import type { FacultyRow } from "../../api/types";
import { Link } from "react-router-dom";

function formatDay(isoDate: string): string {
  const date = isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  const [observationDeadline, setObservationDeadline] = useState<string>("");
  const [surveyDeadline, setSurveyDeadline] = useState<string>("");
  const [currentToday, setCurrentToday] = useState<string>("");
  const [savingDates, setSavingDates] = useState(false);
  const [displayStartDate, setDisplayStartDate] = useState<string>("Sep 13, 2026");
  const [displayEndDate, setDisplayEndDate] = useState<string>("Oct 9, 2026 at 11:59 PM");
  const [releasedAt, setReleasedAt] = useState<Record<number, string>>({});

  // Demo Sandbox State (similar to S04 pattern)
  const [showManualMatching, setShowManualMatching] = useState<boolean>(false);
  const manualSectionRef = useRef<HTMLDivElement>(null);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const scrollToManualMatching = () => {
    manualSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveDates = async () => {
    if (!startDate || !endDate || !observationDeadline || !surveyDeadline) {
      setMatchError("Please enter all four cycle dates.");
      return;
    }

    if (startDate > endDate) {
      setMatchError("The registration opening date must be before the closing date.");
      return;
    }

    if (endDate > observationDeadline) {
      setMatchError("The observation deadline cannot be before registration closes.");
      return;
    }

    if (observationDeadline >= surveyDeadline) {
      setMatchError("The survey deadline must be after the observation deadline.");
      return;
    }

    setSavingDates(true);
    setMatchError("");
    setMatchSuccess("");

    try {
      const updated = await committeeApi.updateCycleDates({
        start_date: startDate,
        signup_deadline: endDate,
        observation_deadline: observationDeadline,
        survey_deadline: surveyDeadline,
      });

      setStartDate(updated.start_date);
      setEndDate(updated.signup_deadline);
      setObservationDeadline(updated.observation_deadline);
      setSurveyDeadline(updated.survey_deadline);

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
        demoApi.date().then((dateRes) => {
          if (!cancelled) {
            setCurrentToday(dateRes.today);
          }
        }).catch(() => {});

        const cycleDates = await committeeApi.cycleDates();

        if (cancelled) return;

        setStartDate(cycleDates.start_date);
        setEndDate(cycleDates.signup_deadline);
        setObservationDeadline(cycleDates.observation_deadline);
        setSurveyDeadline(cycleDates.survey_deadline);

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
            releasedAt: string | null;
          }
        ][] = await Promise.all(
          eligibleObservees.map(async (faculty) => {
            const signupId = faculty.signup_id!;

            try {
              const result = await committeeApi.candidatePool(signupId);

              const candidates = Array.isArray(result.candidates)
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

              const releasedAt =
                typeof result.matches_released_at === "string" ? result.matches_released_at : null;

              return [
                signupId,
                { candidates, releasedObserverIds, releasedAt },
              ];
            } catch {
              return [
                signupId,
                { candidates: [], releasedObserverIds: [], releasedAt: null },
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
            poolResults.map(([signupId, result]) => [
              signupId,
              result.releasedAt
                ? result.releasedObserverIds
                : result.candidates.slice(0, 5).map((candidate) => candidate.id),
            ])
          )
        );

        setReleasedAt(
          Object.fromEntries(
            poolResults
              .filter(([, result]) => result.releasedAt)
              .map(([signupId, result]) => [signupId, result.releasedAt!])
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

      const unique = current.filter(
        (id, index) => id !== 0 && current.indexOf(id) === index
      );

      return { ...previous, [signupId]: unique };
    });
  };

  const handleConfirmMatches = async (signupId: number, observeeName: string) => {
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
      setReleasedAt((previous) => ({ ...previous, [signupId]: currentToday || new Date().toISOString() }));
      setMatchSuccess(`Released ${observerIds.length} observer(s) to ${observeeName}. They have been notified.`);
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

  const effectiveToday = currentToday ? new Date(`${currentToday}T00:00:00`) : new Date();
  const deadlineDate = new Date(`${endDate}T23:59:59`);
  const isOpen = effectiveToday <= deadlineDate;

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection and Matching</h2>

      {loadingMatches && <p>Loading faculty and eligible observer candidates...</p>}
      {matchError && <div role="alert" className="yellow-banner">{matchError}</div>}
      {matchSuccess && <div role="status" className="feedback-banner-success">{matchSuccess}</div>}

      {/* Top Banner Card */}
      <section className="table-container theme-orange summary-card-padding">
        <h3>Manage Course Registrations</h3>
        <p className="status-banner-text">
          <strong>Current Status:</strong>{" "}
          <span className={`status-dot ${isOpen ? "dot-green" : "dot-red"}`}></span>{" "}
          {isOpen ? "COURSE REGISTRATION CURRENTLY OPEN" : "COURSE REGISTRATION CLOSED"} <br />
          <span className="font-slate font-sm">
            (Open from {displayStartDate} until {displayEndDate})
          </span>
        </p>
        <p className="status-banner-text">
          <strong>Next Scheduled Action:</strong>{" "}
          {isOpen
            ? `Course registration closes on ${displayEndDate}`
            : `Course registration closed on ${displayEndDate}`}
        </p>
        <button
          type="button"
          className="btn-secondary button-margin-top"
          onClick={handleOpenModal}
        >
          Edit Course Registration Dates
        </button>
      </section>

      {showManualMatching && (
        <button
          type="button"
          className="btn-secondary button-margin-top"
          onClick={scrollToManualMatching}
        >
          Jump to Manual Matching Section ↓
        </button>
      )}

      {/* 1. Review & Approve (Automatic Matching Section First) */}
      <section className="dashboard-phase section-margin-top">
        <h3>Review and Approve Suggested Observer Candidates</h3>

        <div className="yellow-banner">
          <strong>NOTE:</strong> The system provides an initial list of faculty candidates
          from the observee's department. These candidates require committee review
          before matches are approved and released.
        </div>

        <div className="table-container theme-blue summary-card-padding">
          <p className="section-intro-text">
            Up to five candidates are pre-selected for each observee. Review their
            eligibility, adjust the selections if needed, and release the approved
            matches to notify the observee.
          </p>

          <div className="pairing-grid">
            {observeeList.map((person) => {
              const signupId = person.signup_id;

              if (signupId == null) return null;

              const candidates = candidateOptions[signupId] ?? [];
              const selectedIds = selectedObservers[signupId] ?? [];
              const released = releasedAt[signupId];

              return (
                <div key={signupId} className="approved-observee-card">
                  <h4>{person.name}</h4>
                  <p className="font-slate font-sm">
                    {person.academic_rank}
                    {person.course &&
                      ` · ${person.course.department_code} ${person.course.course_number}.${person.course.section} ${person.course.title}`}
                  </p>

                  {released ? (
                    <p className="released-summary">
                      <strong>Released {formatDay(released)}:</strong>{" "}
                      {candidates
                        .filter((candidate) => selectedIds.includes(candidate.id))
                        .map((candidate) => candidate.name)
                        .join(", ")}
                    </p>
                  ) : candidates.length === 0 ? (
                    <p className="font-sm">No eligible candidates were returned.</p>
                  ) : (
                    <>
                      <strong className="block-label">Suggested observers (up to 5)</strong>
                      <div className="observer-checkbox-list">
                        {candidates.map((candidate) => (
                          <label key={candidate.id} className="checkbox-row-label">
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
                                (!selectedIds.includes(candidate.id) && selectedIds.length >= 5)
                              }
                            />
                            <span>
                              {candidate.name} <span className="font-slate">({candidate.academic_level})</span>
                            </span>
                          </label>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn-primary btn-block button-margin-top"
                        onClick={() => void handleConfirmMatches(signupId, person.name)}
                        disabled={savingSignupId === signupId || selectedIds.length === 0}
                      >
                        {savingSignupId === signupId
                          ? "Releasing..."
                          : `Release ${selectedIds.length} observer(s) to ${person.name}`}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* S04-style Demo Toggle Box placed strictly under the automatic matching section */}
      <div className="demo-toggle-section button-margin-top">
        <label className="checkbox-row-label">
          <input
            type="checkbox"
            checked={showManualMatching}
            onChange={(e) => setShowManualMatching(e.target.checked)}
          />
          <span>
            <strong>Demo Sandbox:</strong> Show the manual matching and override controls.
          </span>
        </label>
      </div>

      {/* 2. Manual Matching Section (Hidden until toggled on) */}
      {showManualMatching && (
        <section ref={manualSectionRef} className="dashboard-phase section-margin-top">
          <h3>Manual Observer Selection and Override</h3>

          <div className="yellow-banner">
            <strong>IMPORTANT:</strong> Use these controls to manually adjust observer
            selections. The available candidates are preliminary department-level
            suggestions, not confirmed eligible observers. Verify academic rank,
            course-level rules, recent teaching history, and scheduling conflicts
            before approving matches.
          </div>

          <div className="table-container theme-green summary-card-padding">
            <div className="pairing-grid">
              {observeeList.map((observee) => {
                const signupId = observee.signup_id!;

                return (
                  <div key={signupId} className="manual-observee-card">
                    <h4>Observee Name</h4>
                    <p className="observee-name-text">
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

                    <div className="observer-select-list">
                      {[0, 1, 2, 3, 4].map((slotIndex) => (
                        <select
                          key={slotIndex}
                          value={selectedObservers[signupId]?.[slotIndex] ?? ""}
                          onChange={(event) =>
                            handleObserverChange(signupId, slotIndex, Number(event.target.value))
                          }
                          className="slot-select-input"
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
                              {candidate.name} ({candidate.academic_level})
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn-secondary btn-block button-margin-top"
                      onClick={() => void handleConfirmMatches(signupId, observee.name)}
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
      )}

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* Date Control Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Evaluation Cycle Dates</h3>
            <p>
              Configure the registration, observation, and process survey deadlines
              for the active evaluation cycle.
            </p>
            <div className="modal-field">
              <label htmlFor="reg-opens">
                Registration opens <span className="modal-fixed-note">(12:00 AM fixed)</span>
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
                Registration closes <span className="modal-fixed-note">(11:59 PM fixed)</span>
              </label>
              <input
                id="reg-closes"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="observation-deadline">
                Observation Records End
              </label>
              <input
                id="observation-deadline"
                type="date"
                value={observationDeadline}
                onChange={(e) => setObservationDeadline(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="survey-deadline">
                Process Surveys End
              </label>
              <input
                id="survey-deadline"
                type="date"
                value={surveyDeadline}
                onChange={(e) => setSurveyDeadline(e.target.value)}
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