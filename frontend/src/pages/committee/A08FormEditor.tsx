import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { FormQuestion, Template } from "../../api/types";

export default function A08FormEditor() {
  const [activeFormType, setActiveFormType] =
    useState<"observation" | "survey">("observation");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTemplates(type = activeFormType) {
    try {
      const result = await committeeApi.templates(type);
      setTemplates(result.templates);

      if (result.templates.length > 0) {
        const first = result.templates[0];
        setSelectedTemplateId(first.template_id);
        setSelectedTemplate(first);
        setName(first.name);
        setInstructions(first.instructions);
        setQuestions(first.questions);
      } else {
        setSelectedTemplateId(null);
        setSelectedTemplate(null);
        setName(type === "observation" ? "Observation Form" : "Survey Form");
        setInstructions("");
        setQuestions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load templates.");
    }
  }

  useEffect(() => {
    void loadTemplates(activeFormType);
  }, [activeFormType]);

  async function selectTemplate(id: number) {
    try {
      const result = await committeeApi.template(id);
      setSelectedTemplate(result);
      setSelectedTemplateId(result.template_id);
      setName(result.name);
      setInstructions(result.instructions);
      setQuestions(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load template.");
    }
  }

  function updateQuestion(id: string, changes: Partial<FormQuestion>) {
    setQuestions((previous) =>
      previous.map((question) =>
        question.id === id ? { ...question, ...changes } : question
      )
    );
  }

  function addQuestion(type: "rating" | "text") {
    const id = `question_${Date.now()}`;

    setQuestions((previous) => [
      ...previous,
      {
        id,
        text: "",
        type,
        required: false,
        ...(type === "rating" ? { min: 1, max: 5 } : {}),
        order: previous.length,
      },
    ]);
  }

  function deleteQuestion(id: string) {
    setQuestions((previous) =>
      previous.filter((question) => question.id !== id)
    );
  }

  async function saveDraft() {
    try {
      if (!name.trim()) {
        setError("Enter a template name.");
        return;
      }

      if (questions.length === 0) {
        setError("Add at least one question before saving.");
        return;
      }

      if (questions.some((question) => !question.text.trim())) {
        setError("Every question must have question text.");
        return;
      }

      if (
        questions.some(
          (question) =>
            question.type === "rating" &&
            (question.min === undefined ||
              question.max === undefined ||
              question.min >= question.max)
        )
      ) {
        setError("Every rating question must have a minimum below its maximum.");
        return;
      }

      setError("");
      setMessage("");

      if (!selectedTemplateId) {
        const created = await committeeApi.createTemplate({
          name,
          type: activeFormType,
          instructions,
          questions,
        });

        await loadTemplates(activeFormType);
        await selectTemplate(created.template_id);
        setMessage("Draft template created.");
        return;
      }

      if (!selectedTemplate?.can_edit) {
        setError("This template cannot be edited. Clone it first.");
        return;
      }

      await committeeApi.editTemplate(selectedTemplateId, {
        instructions,
        questions,
      });

      await selectTemplate(selectedTemplateId);
      setMessage("Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template.");
    }
  }

  async function cloneTemplate() {
    if (!selectedTemplateId) return;

    try {
      const created = await committeeApi.cloneTemplate(selectedTemplateId);
      await loadTemplates(activeFormType);
      await selectTemplate(created.template_id);
      setMessage("A new draft version was created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clone template.");
    }
  }

  async function publishTemplate() {
    if (!selectedTemplateId) return;

    try {
      await committeeApi.publishTemplate(selectedTemplateId);
      await loadTemplates(activeFormType);
      setMessage("Template published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish template.");
    }
  }

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

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {/* Control Banner */}
      <div className="table-container theme-orange editor-control-banner">
        <div className="editor-control-group">
          <label>
            <strong>Form Type:</strong>
          </label>

          <select
            className="styled-select-input"
            value={activeFormType}
            onChange={(event) =>
              setActiveFormType(
                event.target.value as "observation" | "survey"
              )
            }
          >
            <option value="observation">Observation Form</option>
            <option value="survey">Post-Evaluation Survey</option>
          </select>
        </div>

        <div className="editor-control-group">
          <label>
            <strong>Template:</strong>
          </label>

          <select
            className="styled-select-input"
            value={selectedTemplateId ?? ""}
            onChange={(event) => {
              if (event.target.value) {
                void selectTemplate(Number(event.target.value));
              }
            }}
          >
            {templates.map((template) => (
              <option
                key={template.template_id}
                value={template.template_id}
              >
                {template.name} — Version {template.version} ({template.status})
              </option>
            ))}
          </select>
        </div>

        <div className="editor-control-group">
          <label>
            <strong>Template Name:</strong>
          </label>

          <input
            className="styled-text-input"
            value={name}
            disabled={selectedTemplateId !== null}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setSelectedTemplateId(null);
            setSelectedTemplate(null);
            setName(
              activeFormType === "observation"
                ? "New Observation Form"
                : "New Survey Form"
            );
            setInstructions("");
            setQuestions([]);
            setMessage("");
            setError("");
          }}
        >
          New Template
        </button>
      </div>

      <div className="roster-section-divider" />

      {/* ================= OBSERVATION FORM EDITOR ================= */}
      {activeFormType === "observation" && (
        <section className="evaluation-form-wrapper">
          <div className="evaluation-form-header">
            <h3>{name}</h3>

            <span className="form-version-tag">
              {selectedTemplate
                ? `Version ${selectedTemplate.version}`
                : "New Draft"}
            </span>
          </div>

          <div className="evaluation-form-card">
            <div className="editable-field-container">
              <span className="edit-indicator-tag">Edit Instructions</span>

              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                className="fixed-height-textarea"
              />
            </div>

            <div className="form-section-group">
              <h4 className="form-section-title">Observation Questions</h4>

              {questions.map((question) => (
                <div key={question.id} className="editor-question-card">
                  <div className="editable-field-container">
                    <label>Question Text</label>

                    <input
                      type="text"
                      value={question.text}
                      disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          text: event.target.value,
                        })
                      }
                      className="styled-text-input editor-input-field"
                    />
                  </div>

                  <p>Question type: {question.type}</p>

                  <label>
                    Required:
                    <input
                      type="checkbox"
                      checked={question.required}
                      disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          required: event.target.checked,
                        })
                      }
                    />
                  </label>

                  {question.type === "rating" && (
                    <div className="editor-question-header">
                      <label>
                        Minimum:
                        <input
                          type="number"
                          value={question.min ?? 1}
                          disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              min: Number(event.target.value),
                            })
                          }
                        />
                      </label>

                      <label>
                        Maximum:
                        <input
                          type="number"
                          value={question.max ?? 5}
                          disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              max: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  {(!selectedTemplateId || selectedTemplate?.can_edit) && (
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Delete Question
                    </button>
                  )}
                </div>
              ))}

              {(!selectedTemplateId || selectedTemplate?.can_edit) && (
                <div className="add-question-bar">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => addQuestion("rating")}
                  >
                    + Add Rating Question
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => addQuestion("text")}
                  >
                    + Add Text Question
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================= SURVEY FORM EDITOR ================= */}
      {activeFormType === "survey" && (
        <section className="evaluation-form-wrapper">
          <div className="evaluation-form-header">
            <h3>{name}</h3>

            <span className="form-version-tag">
              {selectedTemplate
                ? `Version ${selectedTemplate.version}`
                : "New Draft"}
            </span>
          </div>

          <div className="evaluation-form-card">
            <div className="editable-field-container">
              <span className="edit-indicator-tag">Edit Instructions</span>

              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                className="fixed-height-textarea"
              />
            </div>

            <div className="form-section-group">
              <h4 className="form-section-title">Survey Questions</h4>

              {questions.map((question) => (
                <div key={question.id} className="editor-question-card">
                  <div className="editable-field-container">
                    <label>Question Text</label>

                    <input
                      type="text"
                      value={question.text}
                      disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          text: event.target.value,
                        })
                      }
                      className="styled-text-input editor-input-field"
                    />
                  </div>

                  <p>Question type: {question.type}</p>

                  <label>
                    Required:
                    <input
                      type="checkbox"
                      checked={question.required}
                      disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          required: event.target.checked,
                        })
                      }
                    />
                  </label>

                  {question.type === "rating" && (
                    <div className="editor-question-header">
                      <label>
                        Minimum:
                        <input
                          type="number"
                          value={question.min ?? 1}
                          disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              min: Number(event.target.value),
                            })
                          }
                        />
                      </label>

                      <label>
                        Maximum:
                        <input
                          type="number"
                          value={question.max ?? 5}
                          disabled={Boolean(selectedTemplateId && !selectedTemplate?.can_edit)}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              max: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}

                  {(!selectedTemplateId || selectedTemplate?.can_edit) && (
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Delete Question
                    </button>
                  )}
                </div>
              ))}

              {(!selectedTemplateId || selectedTemplate?.can_edit) && (
                <div className="add-question-bar">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => addQuestion("rating")}
                  >
                    + Add Rating Question
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => addQuestion("text")}
                  >
                    + Add Text Question
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bottom Action Footer */}
      <div className="editor-action-footer">
        <button
          type="button"
          className="btn-primary"
          onClick={() => void saveDraft()}
        >
          Save Draft
        </button>

        {selectedTemplateId !== null && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void cloneTemplate()}
          >
            Clone as New Version
          </button>
        )}

        {selectedTemplate?.can_publish && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => void publishTemplate()}
          >
            Publish Template
          </button>
        )}
      </div>

      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}