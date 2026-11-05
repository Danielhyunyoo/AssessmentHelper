import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { FacultyRow, FacultyRoster } from "../../api/types";

export default function A04FacultyRoster() {
  const [roster, setRoster] = useState<FacultyRoster | null>(null);
  const [unregistered, setUnregistered] = useState<FacultyRow[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "department" | "rank" | "status">("name");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFaculty() {
    try {
      const [rosterResult, unregisteredResult] = await Promise.all([
        committeeApi.faculty({ search, sort }),
        committeeApi.unregistered({ search, sort }),
      ]);

      setRoster(rosterResult);
      setUnregistered(unregisteredResult.faculty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load faculty.");
    }
  }

  useEffect(() => {
    void loadFaculty();
  }, [search, sort]);

  async function handleRankChange(userId: number, rank: string) {
    try {
      await committeeApi.updateRank(userId, rank);
      await loadFaculty();
      setMessage("Academic rank updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update rank.");
    }
  }

  async function handleReminders() {
    if (selected.length === 0) {
      setError("Select at least one unregistered faculty member.");
      return;
    }

    try {
      await committeeApi.remindRegistration(selected);
      setMessage("Registration reminders sent.");
      setSelected([]);
      await loadFaculty();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reminders.");
    }
  }

  return (
    <div className="dashboard-container">
      {/* Top Standardized Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <h2>Faculty Registration and Communications</h2>

      {/* Success Banner */}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* SECTION 1: FACULTY ROSTER */}
      <section className="dashboard-phase">
        <h3>This Cycle's Faculty Roster</h3>

        <ul className="instruction-bullet-list">
          <li>
            <em>Make use of this list to view details or contact (email) faculty members.</em>
          </li>
          <li>
            <em>Use the academic-rank dropdown to update a faculty member's rank.</em>
          </li>
        </ul>

        {/* Search & Sort Controls Bar */}
        <div className="roster-controls-row">
          <div className="search-control-group">
            <label>Search by Faculty Name:</label>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Begin typing here..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="styled-text-input"
              />
            </div>
          </div>

          <div className="sort-control-group">
            <label>Sort By:</label>
            <select
              value={sort}
              onChange={(event) =>
                setSort(
                  event.target.value as
                    | "name"
                    | "department"
                    | "rank"
                    | "status"
                )
              }
              className="styled-select-input"
            >
              <option value="name">Name</option>
              <option value="department">Department</option>
              <option value="rank">Academic Rank</option>
              <option value="status">Registration Status</option>
            </select>
          </div>
        </div>

        {/* Green Theme Table Box */}
        <div className="table-container theme-green">
          <div className="table-instruction">
            Select an Observee's name to view their full profile.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Observee Name</th>
                  <th>Course and Section</th>
                  <th>Academic Level</th>
                  <th>Enrollment Status</th>
                  <th className="align-center">Contact</th>
                </tr>
              </thead>
              <tbody>
                {roster?.faculty.map((member) => (
                  <tr key={member.user_id}>
                    <td className="font-semibold">{member.name}</td>

                    <td>
                      {member.course
                        ? `${member.course.department_code} ${member.course.course_number}.${member.course.section}`
                        : "No course selected"}
                    </td>

                    <td>
                      <select
                        className="styled-select-input"
                        value={member.academic_rank}
                        onChange={(event) =>
                          void handleRankChange(member.user_id, event.target.value)
                        }
                      >
                        <option value="">Not specified</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Full Professor">Full Professor</option>
                        <option value="Professor of Instruction">Professor of Instruction</option>
                      </select>
                    </td>

                    <td>{member.progress_status}</td>

                    <td className="align-center">
                      {member.email ? (
                        <a href={`mailto:${member.email}`} className="table-name-link">
                          Email
                        </a>
                      ) : (
                        "No email"
                      )}
                    </td>
                  </tr>
                ))}

                {roster && roster.faculty.length === 0 && (
                  <tr>
                    <td colSpan={5}>No faculty members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 2: UNREGISTERED OBSERVEES */}
      <section className="dashboard-phase phase-spacing">
        <h3>Unregistered Observees (Pending Reminders)</h3>

        <ul className="instruction-bullet-list">
          <li>
            <em>Faculty members below are due for evaluation in this cycle but have not yet registered a course section.</em>
          </li>
          <li>
            <em>Selected faculty members will receive a reminder to register for the current evaluation cycle.</em>
          </li>
        </ul>

        {/* Orange Theme Table Box */}
        <div className="table-container theme-orange">
          <div className="table-instruction">
            Select observees to send a registration reminder.
          </div>

          <div className="table-scroll-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th className="col-checkbox">Select</th>
                  <th>Professor Name</th>
                  <th>Department</th>
                  <th>Academic Level</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {unregistered.map((prof) => (
                  <tr key={prof.user_id}>
                    <td className="align-center">
                      <input
                        type="checkbox"
                        checked={selected.includes(prof.user_id)}
                        onChange={(event) =>
                          setSelected((previous) =>
                            event.target.checked
                              ? [...previous, prof.user_id]
                              : previous.filter((id) => id !== prof.user_id)
                          )
                        }
                      />
                    </td>

                    <td className="font-semibold">{prof.name}</td>
                    <td>{prof.department ?? "Not provided"}</td>
                    <td>{prof.academic_rank || "Not provided"}</td>
                    <td>{prof.email || "No email"}</td>
                  </tr>
                ))}

                {unregistered.length === 0 && (
                  <tr>
                    <td colSpan={5}>No unregistered faculty members.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="unregistered-actions-bar compact-actions-bar">
          <div className="bulk-btn-group">
            <button
              type="button"
              className="btn-select-toggle"
              onClick={() => setSelected(unregistered.map((person) => person.user_id))}
            >
              Select All
            </button>
            <button
              type="button"
              className="btn-select-toggle"
              onClick={() => setSelected([])}
            >
              Deselect All
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleReminders()}
          >
            Send Registration Reminders
          </button>
        </div>
      </section>

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}