import { useState } from "react";
import { Link } from "react-router-dom";

interface EditorQuestion {
  id: string;
  label: string;
  type: "rating" | "textbox";
}

export default function A08FormEditor() {
  const [activeFormType, setActiveFormType] = useState<"observation" | "survey">("observation");
  const [formVersion, setFormVersion] = useState<string>("V1");

  const [isEditingObsTitle, setIsEditingObsTitle] = useState(false);
  const [isEditingSurveyTitle, setIsEditingSurveyTitle] = useState(false);

  // Editable Observation Form State
  const [obsTitle, setObsTitle] = useState("Observation Record and Evaluation Form");
  const [obsInstruction, setObsInstruction] = useState(
    "For each question, please assign a score (1 = Lowest/Worst, 5 = Highest/Best)"
  );
  const [obsQuestions, setObsQuestions] = useState<EditorQuestion[]>([
    { id: "obs_1", label: "Please rank the student's overall engagement levels.", type: "rating" },
    { id: "obs_2", label: "Was the academic rigor appropriate for the course level?", type: "rating" },
    { id: "obs_3", label: "How good was the pace of the lecture?", type: "rating" },
    { id: "obs_4", label: "How well did the lecture align with the syllabus?", type: "rating" },
    {
      id: "obs_5",
      label: "Please include any additional notes, comments or concerns you may have.",
      type: "textbox",
    },
  ]);
  const [newObsQType, setNewObsQType] = useState<"rating" | "textbox">("rating");

  // Editable Survey Form State
  const [surveyTitle, setSurveyTitle] = useState("Post-Evaluation Cycle Process Survey");
  const [surveyInstruction, setSurveyInstruction] = useState(
    "For each question, please assign a score (1 = Unsatisfactory, 5 = Very Satisfactory)"
  );
  const [surveyQuestions, setSurveyQuestions] = useState<EditorQuestion[]>([
    { id: "surv_1", label: "How satisfied are you with the evaluation process?", type: "rating" },
    {
      id: "surv_2",
      label: "Please list any difficulties you ran into throughout this cycle (re: scheduling, communication, or observation visit).",
      type: "textbox",
    },
    {
      id: "surv_3",
      label: "Please provide any feedback or suggestions on how the Assessment Committee can improve this workflow.",
      type: "textbox",
    },
  ]);
  const [newSurveyQType, setNewSurveyQType] = useState<"rating" | "textbox">("rating");

  // Handlers for Observation Questions
  const handleAddObsQuestion = () => {
    const newQ: EditorQuestion = {
      id: `obs_q_${Date.now()}`,
      label: newObsQType === "rating" ? "New Rating Question (1-5)" : "New Open Response Question",
      type: newObsQType,
    };
    setObsQuestions([...obsQuestions, newQ]);
  };

  const handleDeleteObsQuestion = (id: string) => {
    setObsQuestions(obsQuestions.filter((q) => q.id !== id));
  };

  const handleUpdateObsLabel = (id: string, text: string) => {
    setObsQuestions(obsQuestions.map((q) => (q.id === id ? { ...q, label: text } : q)));
  };

  // Handlers for Survey Questions
  const handleAddSurveyQuestion = () => {
    const newQ: EditorQuestion = {
      id: `survey_q_${Date.now()}`,
      label: newSurveyQType === "rating" ? "New Rating Question (1-5)" : "New Open Response Question",
      type: newSurveyQType,
    };
    setSurveyQuestions([...surveyQuestions, newQ]);
  };

  const handleDeleteSurveyQuestion = (id: string) => {
    setSurveyQuestions(surveyQuestions.filter((q) => q.id !== id));
  };

  const handleUpdateSurveyLabel = (id: string, text: string) => {
    setSurveyQuestions(surveyQuestions.map((q) => (q.id === id ? { ...q, label: text } : q)));
  };

  const handleSaveNewVersion = () => {
    alert(
      `Successfully saved changes as a new form version for ${
        activeFormType === "observation" ? "Observation Form" : "Survey Form"
      }!`
    );
  };

  const handleUndo = () => {
    if (window.confirm("Are you sure you want to undo all unsaved changes?")) {
      window.location.reload();
    }
  };

  return (
    <div className="dashboard-container form-editor-page">
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Return to Dashboard
        </Link>
      </div>

      <div className="editor-top-bar">
        <h2>Edit Evaluation / Survey Forms</h2>
      </div>

      {/* Control Banner */}
      <div className="table-container theme-orange editor-control-banner">
        <div className="editor-control-group">
          <label><strong>Select Form to Edit:</strong></label>
          <select
            className="styled-select-input"
            value={activeFormType}
            onChange={(e) => setActiveFormType(e.target.value as "observation" | "survey")}
          >
            <option value="observation">Observation Record and Evaluation Form</option>
            <option value="survey">Post-Evaluation Cycle Process Survey</option>
          </select>
        </div>

        <div className="editor-control-group">
          <label><strong>Form Version:</strong></label>
          <select
            className="styled-select-input"
            value={formVersion}
            onChange={(e) => setFormVersion(e.target.value)}
          >
            <option value="V1">Current Evaluation Form (V1)</option>
            <option value="V2">Draft Version (V2)</option>
          </select>
        </div>
      </div>

      <div className="roster-section-divider" />

      {/* ================= OBSERVATION FORM EDITOR ================= */}
      {activeFormType === "observation" && (
        <section className="evaluation-form-wrapper">
          <div className="evaluation-form-header">
            {isEditingObsTitle ? (
              <div className="editor-title-edit-wrapper">
                <input
                  type="text"
                  value={obsTitle}
                  onChange={(e) => setObsTitle(e.target.value)}
                  className="styled-text-input editor-input-field font-bold"
                />
                <button type="button" className="btn-primary btn-sm" onClick={() => setIsEditingObsTitle(false)}>
                  Done
                </button>
              </div>
            ) : (
              <div className="editor-title-display-wrapper">
                <h3>{obsTitle}</h3>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsEditingObsTitle(true)}>
                  Edit Title
                </button>
              </div>
            )}
            <span className="form-version-tag">Evaluation Form {formVersion}</span>
          </div>

          <div className="evaluation-form-card">
            <div className="editable-field-container">
              <span className="edit-indicator-tag">✏️ Edit Instruction</span>
              <input
                type="text"
                value={obsInstruction}
                onChange={(e) => setObsInstruction(e.target.value)}
                className="styled-text-input editor-input-field italic instruction-editor-input"
              />
            </div>

            <div className="form-section-group">
              <h4 className="form-section-title">Form Questions & Fields:</h4>

              {obsQuestions.map((q) => (
                <div key={q.id} className="editor-question-card">
                  <div className="editor-question-header">
                    <div className="editable-field-container flex-grow">
                      <span className="edit-indicator-tag">✏️ Edit Question Text</span>
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => handleUpdateObsLabel(q.id, e.target.value)}
                        className="styled-text-input editor-input-field"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={() => handleDeleteObsQuestion(q.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {q.type === "rating" ? (
                    <div className="rating-button-group disabled-preview-group">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" className="rating-score-btn" disabled>
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      placeholder="(READ ONLY TEXTBOX PREVIEW)"
                      disabled
                      className="form-textarea-input fixed-textarea-preview"
                    />
                  )}
                </div>
              ))}

              <div className="add-question-bar">
                <div className="add-question-inputs">
                  <label><strong>Question Type:</strong></label>
                  <select
                    className="styled-select-input"
                    value={newObsQType}
                    onChange={(e) => setNewObsQType(e.target.value as "rating" | "textbox")}
                  >
                    <option value="rating">Rating (1–5 Score)</option>
                    <option value="textbox">Text Box (Long Answer)</option>
                  </select>
                </div>
                <button type="button" className="btn-primary" onClick={handleAddObsQuestion}>
                  ＋ Add Question
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= SURVEY FORM EDITOR ================= */}
      {activeFormType === "survey" && (
        <section className="evaluation-form-wrapper">
          <div className="evaluation-form-header">
            {isEditingSurveyTitle ? (
              <div className="editor-title-edit-wrapper">
                <input
                  type="text"
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="styled-text-input editor-input-field font-bold"
                />
                <button type="button" className="btn-primary btn-sm" onClick={() => setIsEditingSurveyTitle(false)}>
                  Done
                </button>
              </div>
            ) : (
              <div className="editor-title-display-wrapper">
                <h3>{surveyTitle}</h3>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsEditingSurveyTitle(true)}>
                  Edit Title
                </button>
              </div>
            )}
            <span className="form-version-tag">Survey Form {formVersion}</span>
          </div>

          <div className="evaluation-form-card">
            <div className="editable-field-container">
              <span className="edit-indicator-tag">✏️ Edit Instruction</span>
              <input
                type="text"
                value={surveyInstruction}
                onChange={(e) => setSurveyInstruction(e.target.value)}
                className="styled-text-input editor-input-field italic instruction-editor-input"
              />
            </div>

            <div className="form-section-group">
              <h4 className="form-section-title">Survey Questions & Fields:</h4>

              {surveyQuestions.map((q) => (
                <div key={q.id} className="editor-question-card">
                  <div className="editor-question-header">
                    <div className="editable-field-container flex-grow">
                      <span className="edit-indicator-tag">✏️ Edit Question Text</span>
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => handleUpdateSurveyLabel(q.id, e.target.value)}
                        className="styled-text-input editor-input-field"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={() => handleDeleteSurveyQuestion(q.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {q.type === "rating" ? (
                    <div className="rating-button-group disabled-preview-group">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" className="rating-score-btn" disabled>
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      placeholder="(READ ONLY TEXTBOX PREVIEW)"
                      disabled
                      className="form-textarea-input fixed-textarea-preview"
                    />
                  )}
                </div>
              ))}

              <div className="add-question-bar">
                <div className="add-question-inputs">
                  <label><strong>Question Type:</strong></label>
                  <select
                    className="styled-select-input"
                    value={newSurveyQType}
                    onChange={(e) => setNewSurveyQType(e.target.value as "rating" | "textbox")}
                  >
                    <option value="rating">Rating (1–5 Score)</option>
                    <option value="textbox">Text Box (Long Answer)</option>
                  </select>
                </div>
                <button type="button" className="btn-primary" onClick={handleAddSurveyQuestion}>
                  ＋ Add Question
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Action Footer */}
      <div className="editor-action-footer">
        <button type="button" className="btn-modal-danger" onClick={handleUndo}>
          Undo All Changes
        </button>
        <button type="button" className="btn-primary" onClick={handleSaveNewVersion}>
          Save Changes as a New Form Version
        </button>
      </div>

      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}