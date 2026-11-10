// src/pages/committee/A03UnmatchedObservees.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";

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
}

interface EvaluationCycle {
  cycle_id: number;
  semester: string;
  start_date: string;
  status: string;
}

interface UnmatchedResponse {
  cycle_id: number;
  unmatched: UnmatchedFaculty[];
  next_cycles: EvaluationCycle[];
  scope_note: string;
  carry_forward_note: string;
}

export default function A03UnmatchedObservees() {
  const [data, setData] = useState<UnmatchedResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [targetCycleId, setTargetCycleId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadUnmatched = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await committeeApi.unmatched();
      const response = result as unknown as UnmatchedResponse;

      setData(response);

      const eligibleIds = response.unmatched
        .filter((item) => !item.already_carried_forward)
        .map((item) => item.signup_id);

      setSelectedIds((previous) =>
        previous.filter((id) => eligibleIds.includes(id))
      );

      if (response.next_cycles.length > 0) {
        setTargetCycleId((previous) => {
          const stillAvailable = response.next_cycles.some(
            (cycle) => String(cycle.cycle_id) === previous
          );

          return stillAvailable
            ? previous
            : String(response.next_cycles[0].cycle_id);
        });
      } else {
        setTargetCycleId("");
      }
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
  }, []);

  const eligibleFaculty =
    data?.unmatched.filter((item) => !item.already_carried_forward) ?? [];

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(eligibleFaculty.map((f) => f.signup_id));
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
      const result = await committeeApi.carryForward(
        selectedIds,
        Number(targetCycleId),
        reason.trim()
      );

      const count =
        typeof result.count === "number" ? result.count : selectedIds.length;

      setMessage(
        `Successfully carried forward ${count} faculty member(s).`
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

  return (
    <div className="dashboard-container">
      {/* Top Back Navigation Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>View Unmatched Observees</h2>

      {loading && <p>Loading unmatched faculty...</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* Yellow Banner with Coded Grey Triangle Icon */}
      <div className="yellow-banner unmatched-alert-margin">
        <strong>
           ALERT:
        </strong>{" "}
        The observees below could not be matched with the required minimum (5) of eligible observer candidates for this cycle. Select faculty members below to defer them to the next evaluation cycle.
      </div>

      {/* Main Table Container */}
      <div className="unmatched-table-frame">
        <p className="unmatched-table-instruction">
          Select unmatched faculty members to transfer them to next semester's Due List.
        </p>

        <div className="unmatched-table-wrapper">
          <table className="unmatched-table">
            <thead>
              <tr>
                <th className="unmatched-checkbox-cell">Select</th>
                <th>Candidate Name</th>
                <th>Department</th>
                <th>Academic Level</th>
                <th>Course and Section</th>
              </tr>
            </thead>
            <tbody>
              {data?.unmatched.map((item) => {
                const isSelected = selectedIds.includes(item.signup_id);

                return (
                  <tr key={item.signup_id}>
                    <td className="unmatched-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={item.already_carried_forward}
                        onChange={() => handleToggleSelect(item.signup_id)}
                      />
                    </td>
                    <td>{item.name}</td>
                    <td>{item.department ?? "Not provided"}</td>
                    <td>{item.academic_rank || "Not provided"}</td>
                    <td>{item.course}</td>
                  </tr>
                );
              })}

              {data?.unmatched.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    No unmatched observees in the current evaluation cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="unmatched-transfer-details">
        <div className="form-group">
          <label htmlFor="target-cycle">Target Evaluation Cycle</label>
          <select
            id="target-cycle"
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
        </div>

        <div className="form-group">
          <label htmlFor="carry-forward-reason">
            Reason for Carry-Forward
          </label>
          <textarea
            id="carry-forward-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Enter the reason for carrying these faculty members forward..."
            rows={3}
            maxLength={2000}
          />
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="unmatched-actions-row">
        <div className="unmatched-select-btns">
          <button
            type="button"
            onClick={handleSelectAll}
            className="btn-secondary"
            disabled={eligibleFaculty.length === 0}
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="btn-secondary"
            disabled={selectedIds.length === 0}
          >
            Deselect All
          </button>
        </div>

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
          {submitting ? "Processing..." : "Transfer Professors to Next Evaluation Cycle"}
        </button>
      </div>

      {data?.carry_forward_note && (
        <p className="table-instruction">
          {data.carry_forward_note}
        </p>
      )}

      {/* Bottom Center Return Action */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}