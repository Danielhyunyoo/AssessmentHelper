// src/pages/committee/A03UnmatchedObservees.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { FacultyRow } from "../../api/types";
import {
  CYCLE_TRANSFER_STORAGE_KEY,
  type CycleTransferRecord,
} from "./A02FacultyMatching";

interface UnmatchedFaculty {
  signup_id: number;
  faculty_id: number;
  name: string;
  department: string | null;
  academic_rank: string;
  course_id: number;
  course: string;
  eligible_observer_count: number;
  reason: string;
  already_carried_forward: boolean;
  transferred_cycle_label?: string;
  from_a02?: boolean;
}

interface EvaluationCycle {
  cycle_id: number;
  semester: string;
  start_date: string;
  status: string;
  is_fallback?: boolean;
}

interface UnmatchedResponse {
  cycle_id: number;
  unmatched: UnmatchedFaculty[];
  next_cycles: EvaluationCycle[];
  scope_note: string;
  carry_forward_note: string;
}

function readQueuedA02Transfers(): Record<string, CycleTransferRecord> {
  try {
    const raw = localStorage.getItem(CYCLE_TRANSFER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Generates a fallback next-semester option when the backend has not seeded
 * a future EvaluationCycle row yet.
 */
function buildFallbackNextCycle(currentStartDate?: string): EvaluationCycle {
  const baseDate = currentStartDate
    ? new Date(`${currentStartDate}T00:00:00`)
    : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth(); // 0-indexed (0 = Jan, 7 = Aug)

  // If current cycle starts in Jan-Jun (Spring), next is Fall of same year.
  // Otherwise (Fall), next is Spring of next year.
  const isSpring = month >= 0 && month <= 5;
  const semester = isSpring ? `Fall ${year}` : `Spring ${year + 1}`;
  const start_date = isSpring ? `${year}-08-24` : `${year + 1}-01-18`;

  return {
    cycle_id: -1,
    semester,
    start_date,
    status: "upcoming",
    is_fallback: true,
  };
}

export default function A03UnmatchedObservees() {
  const [data, setData] = useState<UnmatchedResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [targetCycleId, setTargetCycleId] = useState("");
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadUnmatched = async () => {
    setLoading(true);
    setError("");

    try {
      const [result, rosterRes, cycleDatesRes] = await Promise.all([
        committeeApi.unmatched(),
        committeeApi.faculty().catch(() => ({ faculty: [] as FacultyRow[] })),
        committeeApi.cycleDates().catch(() => null),
      ]);
      const response = result as unknown as UnmatchedResponse;
      const queuedMap = readQueuedA02Transfers();

      const rosterByName = new Map<string, FacultyRow>(
        (rosterRes.faculty ?? []).map((f) => [f.name.toLowerCase(), f])
      );

      const mergedList: UnmatchedFaculty[] = response.unmatched.map((item) => {
        const queued = queuedMap[item.name.toLowerCase()];
        const isCarried =
          item.already_carried_forward ||
          queued?.status === "carried_forward";

        return {
          ...item,
          from_a02: Boolean(queued),
          reason:
            queued?.note && !item.reason ? queued.note : item.reason,
          already_carried_forward: isCarried,
          transferred_cycle_label: isCarried
            ? queued?.target_cycle || "Next Cycle"
            : undefined,
        };
      });

      const existingNames = new Set(
        mergedList.map((item) => item.name.toLowerCase())
      );

      let syntheticIdCounter = -1;
      Object.values(queuedMap).forEach((rec) => {
        const key = rec.professor_name.toLowerCase();
        if (existingNames.has(key)) return;

        const rosterMatch = rosterByName.get(key) as
          | (FacultyRow & { id?: number; faculty_id?: number })
          | undefined;

        const resolvedSignupId =
          rec.signup_id ?? rosterMatch?.signup_id ?? syntheticIdCounter--;

        const resolvedFacultyId =
          rec.faculty_id ?? rosterMatch?.id ?? rosterMatch?.faculty_id ?? 0;

        const courseText =
          rec.course_label ??
          (rosterMatch?.course
            ? `${rosterMatch.course.department_code} ${rosterMatch.course.course_number}.${rosterMatch.course.section}: ${rosterMatch.course.title}`
            : "Course Pending");

        const isCarried = rec.status === "carried_forward";

        mergedList.unshift({
          signup_id: resolvedSignupId,
          faculty_id: resolvedFacultyId,
          name: rec.professor_name,
          department: rec.department ?? rosterMatch?.department ?? null,
          academic_rank:
            rec.academic_rank ?? rosterMatch?.academic_rank ?? "Faculty",
          course_id:
            rec.course_id ?? rosterMatch?.course?.course_id ?? 0,
          course: courseText,
          eligible_observer_count: 0,
          reason: rec.note || "Deferred for next evaluation cycle",
          already_carried_forward: isCarried,
          transferred_cycle_label: isCarried ? rec.target_cycle : undefined,
          from_a02: true,
        });
      });

      // Provide a fallback upcoming cycle if the backend has no future cycle seeded yet
      const availableCycles: EvaluationCycle[] =
        Array.isArray(response.next_cycles) && response.next_cycles.length > 0
          ? response.next_cycles
          : [buildFallbackNextCycle(cycleDatesRes?.start_date)];

      const hydratedResponse: UnmatchedResponse = {
        ...response,
        unmatched: mergedList,
        next_cycles: availableCycles,
      };
      setData(hydratedResponse);

      const eligibleItems = mergedList.filter(
        (item) => !item.already_carried_forward
      );
      const eligibleIds = eligibleItems.map((item) => item.signup_id);

      setSelectedIds((previous) => {
        const kept = previous.filter((id) => eligibleIds.includes(id));
        if (kept.length > 0) return kept;
        const a02Ids = eligibleItems
          .filter((item) => item.from_a02)
          .map((item) => item.signup_id);
        return a02Ids;
      });

      setReason((prevReason) => {
        if (prevReason.trim()) return prevReason;
        const firstA02WithNote = eligibleItems.find(
          (item) => item.from_a02 && item.reason.trim()
        );
        return firstA02WithNote ? firstA02WithNote.reason : prevReason;
      });

      setTargetCycleId((previous) => {
        const stillAvailable = availableCycles.some(
          (cycle) => String(cycle.cycle_id) === previous
        );
        return stillAvailable
          ? previous
          : String(availableCycles[0].cycle_id);
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load unmatched faculty."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUnmatched();

    const handleSync = () => {
      void loadUnmatched();
    };
    window.addEventListener("cycle-transfers-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("cycle-transfers-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const allUnmatched = data?.unmatched ?? [];
  const eligibleFaculty = allUnmatched.filter(
    (item) => !item.already_carried_forward
  );
  const carriedForwardCount = allUnmatched.filter(
    (item) => item.already_carried_forward
  ).length;

  const departments = [
    ...new Set(
      allUnmatched.map((item) => item.department).filter(Boolean)
    ),
  ].sort() as string[];

  const filteredFaculty = allUnmatched.filter((item) => {
    if (departmentFilter && item.department !== departmentFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.department ?? "").toLowerCase().includes(q) ||
      (item.academic_rank ?? "").toLowerCase().includes(q) ||
      item.course.toLowerCase().includes(q) ||
      (item.reason ?? "").toLowerCase().includes(q)
    );
  });

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleEligibleIds = filteredFaculty
      .filter((f) => !f.already_carried_forward)
      .map((f) => f.signup_id);
    setSelectedIds(visibleEligibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleTransfer = async () => {
    setError("");
    setMessage("");

    if (selectedIds.length === 0) {
      setError("Please select at least one faculty member.");
      return;
    }

    if (!targetCycleId) {
      setError("Please select a target evaluation cycle.");
      return;
    }

    if (!reason.trim()) {
      setError("Please enter a reason for the carry-forward.");
      return;
    }

    setSubmitting(true);

    try {
      const numericCycleId = Number(targetCycleId);
      const targetCycleObj = data?.next_cycles.find(
        (c) => c.cycle_id === numericCycleId
      );
      const cycleSemester = targetCycleObj?.semester ?? "Next Evaluation Cycle";
      const realSignupIds = selectedIds.filter((id) => id > 0);
      let transferredCount = selectedIds.length;

      // Only call backend endpoint when a real cycle_id (> 0) exists
      if (numericCycleId > 0 && realSignupIds.length > 0) {
        const result = await committeeApi.carryForward(
          realSignupIds,
          numericCycleId,
          reason.trim()
        );
        if (typeof result.count === "number") {
          transferredCount =
            result.count + (selectedIds.length - realSignupIds.length);
        }
      }

      // Persist carried-forward state in localStorage so both fallback cycles
      // and A02-queued observees stay marked as transferred
      const selectedItems = allUnmatched.filter((item) =>
        selectedIds.includes(item.signup_id)
      );
      const queuedMap = readQueuedA02Transfers();

      selectedItems.forEach((item) => {
        const nameKey = item.name.toLowerCase();
        const existing = queuedMap[nameKey];
        queuedMap[nameKey] = {
          signup_id: item.signup_id > 0 ? item.signup_id : existing?.signup_id ?? null,
          faculty_id: item.faculty_id || existing?.faculty_id || null,
          professor_name: item.name,
          department: item.department,
          academic_rank: item.academic_rank,
          course_id: item.course_id || existing?.course_id || null,
          course_label: item.course,
          target_cycle: cycleSemester,
          note: reason.trim(),
          transferred_at: existing?.transferred_at ?? new Date().toISOString(),
          status: "carried_forward",
        };
      });

      try {
        localStorage.setItem(
          CYCLE_TRANSFER_STORAGE_KEY,
          JSON.stringify(queuedMap)
        );
        window.dispatchEvent(new Event("cycle-transfers-updated"));
      } catch {
        // Ignore storage errors
      }

      setMessage(
        `Successfully transferred ${transferredCount} faculty member${
          transferredCount === 1 ? "" : "s"
        } to ${cycleSemester}.`
      );

      setSelectedIds([]);
      setReason("");

      await loadUnmatched();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to carry faculty forward."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCycleObj = data?.next_cycles.find(
    (c) => String(c.cycle_id) === targetCycleId
  );

  return (
    <div className="dashboard-container">
      {/* Top Back Navigation Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="a02-section-header-bar">
        <div className="a02-section-title-group">
          <h2 className="a02-section-heading">Unmatched Observees</h2>
          <span
            className={`status-chip ${
              eligibleFaculty.length > 0 ? "a02-chip-warning" : "chip-draft"
            }`}
          >
            {eligibleFaculty.length} AWAITING TRANSFER
          </span>
          {carriedForwardCount > 0 && (
            <span className="status-chip chip-draft">
              {carriedForwardCount} TRANSFERRED
            </span>
          )}
        </div>

        <Link to="/committee/matching" className="btn-secondary">
          ← Back to Faculty Matching
        </Link>
      </div>

      {loading && <p>Loading unmatched faculty...</p>}
      {error && (
        <div role="alert" className="yellow-banner">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="feedback-banner-success">
          {message}
        </div>
      )}

      {/* Info Alert Banner */}
      <div className="yellow-banner unmatched-alert-margin">
        <strong>ALERT:</strong> The observees below either could not be matched
        with the required minimum (5) of eligible observer candidates or were
        deferred from Faculty Matching. Select faculty members below to transfer
        them to the next evaluation cycle.
      </div>

      {/* Main Roster Table Card */}
      <section className="dashboard-phase">
        <div className="table-container theme-blue summary-card-padding">
          <div className="a03-toolbar">
            <input
              type="text"
              className="styled-text-input a03-search-input"
              placeholder="Search by name, department, rank, course, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="a03-toolbar-actions">
              {departments.length > 0 && (
                <select
                  aria-label="Filter unmatched observees by department"
                  className="slot-select-input a02-status-filter"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={handleSelectAll}
                className="btn-secondary"
                disabled={eligibleFaculty.length === 0}
              >
                Select All ({eligibleFaculty.length})
              </button>

              <button
                type="button"
                onClick={handleDeselectAll}
                className="btn-secondary"
                disabled={selectedIds.length === 0}
              >
                Clear ({selectedIds.length})
              </button>
            </div>
          </div>

          <div className="unmatched-table-frame a03-table-frame">
            <div className="unmatched-table-wrapper">
              <table className="unmatched-table">
                <thead>
                  <tr>
                    <th className="unmatched-checkbox-cell">Select</th>
                    <th>Candidate Name</th>
                    <th>Department</th>
                    <th>Academic Level</th>
                    <th>Course &amp; Section</th>
                    <th>Status / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((item) => {
                    const isSelected = selectedIds.includes(item.signup_id);

                    return (
                      <tr
                        key={item.signup_id}
                        className={
                          isSelected
                            ? "a03-row-selected"
                            : item.already_carried_forward
                            ? "a03-row-transferred"
                            : ""
                        }
                        onClick={() => {
                          if (!item.already_carried_forward) {
                            handleToggleSelect(item.signup_id);
                          }
                        }}
                      >
                        <td
                          className="unmatched-checkbox-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.name}`}
                            checked={isSelected}
                            disabled={item.already_carried_forward}
                            onChange={() => handleToggleSelect(item.signup_id)}
                          />
                        </td>
                        <td>
                          <span className="a03-candidate-name">
                            {item.name}
                          </span>
                        </td>
                        <td>{item.department ?? "Not provided"}</td>
                        <td className="a03-capitalize">
                          {item.academic_rank || "Not provided"}
                        </td>
                        <td>{item.course}</td>
                        <td>
                          {item.already_carried_forward ? (
                            <span className="status-chip chip-draft a02-chip-xs">
                              Transferred to{" "}
                              {item.transferred_cycle_label || "Next Cycle"}
                            </span>
                          ) : (
                            <span className="a03-reason-text">
                              {item.reason ||
                                `${item.eligible_observer_count} eligible observers`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFaculty.length === 0 && (
                    <tr>
                      <td colSpan={6} className="a03-empty-cell">
                        {allUnmatched.length === 0
                          ? "No unmatched observees in the current evaluation cycle."
                          : "No unmatched observees match your current search or department filter."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Transfer Configuration Card */}
      <section className="dashboard-phase section-margin-top">
        <div className="table-container theme-orange summary-card-padding">
          <div className="a02-section-header-bar">
            <h3 className="a02-section-heading">
              Transfer Selected Observees to Next Cycle
            </h3>
            <span className="status-chip">
              {selectedIds.length} SELECTED
            </span>
          </div>

          <div className="a03-transfer-grid">
            <div className="a03-field-group">
              <label htmlFor="target-cycle">Target Evaluation Cycle</label>
              <select
                id="target-cycle"
                className="slot-select-input"
                value={targetCycleId}
                onChange={(event) => setTargetCycleId(event.target.value)}
                disabled={!data?.next_cycles.length}
              >
                {!data?.next_cycles.length && (
                  <option value="">No later cycles available</option>
                )}

                {data?.next_cycles.map((cycle) => (
                  <option key={cycle.cycle_id} value={cycle.cycle_id}>
                    {cycle.semester}
                  </option>
                ))}
              </select>
              <span className="font-slate font-sm">
                Selected faculty will be added to the target semester&apos;s
                due list.
                {selectedCycleObj?.is_fallback
                  ? " (Queued for upcoming cycle creation)"
                  : ""}
              </span>
            </div>

            <div className="a03-field-group">
              <label htmlFor="carry-forward-reason">
                Reason for Carry-Forward
              </label>
              <textarea
                id="carry-forward-reason"
                className="a03-textarea"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Enter the reason for carrying these faculty members forward..."
                rows={3}
                maxLength={2000}
              />
            </div>
          </div>

          <div className="a03-transfer-footer">
            <p className="font-slate font-sm a02-zero-margin">
              {data?.carry_forward_note ||
                "Carrying forward removes the observee from active matching in the current cycle."}
            </p>

            <button
              type="button"
              onClick={() => void handleTransfer()}
              className="btn-primary"
              disabled={
                submitting ||
                selectedIds.length === 0 ||
                !targetCycleId ||
                !reason.trim()
              }
            >
              {submitting
                ? "Transferring..."
                : `Transfer ${
                    selectedIds.length > 0 ? `(${selectedIds.length}) ` : ""
                  }to Next Evaluation Cycle`}
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Center Return Action */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}