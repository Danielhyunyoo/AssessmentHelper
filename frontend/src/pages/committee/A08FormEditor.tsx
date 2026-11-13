// src/pages/committee/A08FormEditor.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { committeeApi } from "../../api/endpoints";
import type { FormQuestion, Template } from "../../api/types";

export default function A08FormEditor() {
  const [activeFormType, setActiveFormType] =
    useState<"observation" | "survey">("observation");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>([]);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isEditable = !selectedTemplateId || Boolean(selectedTemplate?.can_edit);

  async function loadTemplates(type = activeFormType) {
    try {
      const result = await committeeApi.templates(type);
      setTemplates(result.templates);

      if (result.templates.length > 0) {
        const draftOrLatest =
          result.templates.find((t) => t.can_edit) ??
          result.templates[result.templates.length - 1];

        setSelectedTemplateId(draftOrLatest.template_id);
        setSelectedTemplate(draftOrLatest);
        setName(draftOrLatest.name);
        setInstructions(draftOrLatest.instructions);
        setQuestions(draftOrLatest.questions);
      } else {
        setSelectedTemplateId(null);
        setSelectedTemplate(null);
        setName(
          type === "observation" ? "New Observation Form" : "New Survey Form"
        );
        setInstructions("");
        setQuestions([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load templates."
      );
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
      setError("");
      setMessage("");
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

  function moveQuestion(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setQuestions((previous) => {
      const updated = [...previous];
      const [moved] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, moved);
      return updated.map((q, idx) => ({ ...q, order: idx }));
    });
  }

  function deleteQuestion(id: string) {
    setQuestions((previous) =>
      previous
        .filter((question) => question.id !== id)
        .map((q, idx) => ({ ...q, order: idx }))
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
        setError(
          "Every rating question must have a minimum below its maximum."
        );
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
        setMessage("Draft template created successfully.");
        return;
      }

      if (!selectedTemplate?.can_edit) {
        setError(
          "This template is published and locked. Click 'Clone as New Version' to make changes."
        );
        return;
      }

      await committeeApi.editTemplate(selectedTemplateId, {
        instructions,
        questions,
      });

      await selectTemplate(selectedTemplateId);
      setMessage("Draft saved successfully.");
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
      setMessage(
        `Cloned successfully! You are now editing Version ${created.version} as a new draft.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to clone template."
      );
    }
  }

  async function publishTemplate() {
    if (!selectedTemplateId) return;

    try {
      await committeeApi.publishTemplate(selectedTemplateId);
      await loadTemplates(activeFormType);
      setMessage("Template published successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to publish template."
      );
    }
  }

  return (
    <div className="dashboard-container form-editor-page">
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="editor-top-bar">
        <h2>Edit Evaluation & Survey Forms</h2>
      </div>

      {error && (
        <p className="signin-error-banner" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="feedback-banner-success" role="status">
          {message}
        </p>
      )}

      {/* Top Control Banner */}
      <div className="editor-control-banner">
        <div className="editor-control-group">
          <label htmlFor="a08-form-type">Form Type:</label>
          <select
            id="a08-form-type"
            value={activeFormType}
            onChange={(event) =>
              setActiveFormType(event.target.value as "observation" | "survey")
            }
          >
            <option value="observation">Observation Form</option>
            <option value="survey">Post-Evaluation Survey</option>
          </select>
        </div>

        <div className="editor-control-group">
          <label htmlFor="a08-template-select">Template Select:</label>
          <select
            id="a08-template-select"
            value={selectedTemplateId ?? ""}
            onChange={(event) => {
              if (event.target.value) {
                void selectTemplate(Number(event.target.value));
              }
            }}
          >
            {templates.length === 0 && (
              <option value="">No saved templates</option>
            )}
            {templates.map((template) => (
              <option key={template.template_id} value={template.template_id}>
                {template.name} (v{template.version} -{" "}
                {template.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="editor-control-group">
          <label htmlFor="a08-template-name">Template Name:</label>
          <input
            id="a08-template-name"
            type="text"
            value={name}
            disabled={!isEditable}
            placeholder="e.g. Peer Observation Form"
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
            setMessage("Started a blank new template.");
            setError("");
          }}
        >
          + Blank Form
        </button>
      </div>

      {/* Questions Section */}
      <section className="evaluation-form-wrapper">
        <div
          className={`a08-form-header-card ${!isEditable ? "is-locked" : ""}`}
        >
          <div className="header-title-group">
            <h3>{name || "Untitled Form"}</h3>
            {selectedTemplate && (
              <span className="version-pill">v{selectedTemplate.version}</span>
            )}
          </div>

          <div className="a08-header-right-actions">
            {selectedTemplateId !== null && (
              <button
                type="button"
                className="btn-secondary header-clone-btn"
                onClick={() => void cloneTemplate()}
              >
                Clone as New Version
              </button>
            )}
            <span
              className={
                isEditable
                  ? "status-chip chip-draft"
                  : "status-chip chip-locked"
              }
            >
              {isEditable ? "Editable Draft" : "Published (Locked)"}
            </span>
          </div>
        </div>

        <div className="editor-question-card">
          <label htmlFor="a08-instructions" className="card-input-label">
            Instructions / Guidelines
          </label>
          <textarea
            id="a08-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            disabled={!isEditable}
            placeholder="Enter instructions for observers or survey respondents..."
            rows={3}
            className="full-row-textarea"
          />
        </div>

        <div className="form-section-group">
          <div className="a08-questions-header-row">
            <h4 className="form-section-title">
              {activeFormType === "observation"
                ? "Observation Questions"
                : "Survey Questions"}
            </h4>
            <span className="a08-question-count-badge">
              {questions.length}{" "}
              {questions.length === 1 ? "Question" : "Questions"}
            </span>
          </div>

          {questions.length === 0 && (
            <div className="observation-empty-state">
              No questions in this form yet.{" "}
              {isEditable &&
                "Click below to add rating or text questions."}
            </div>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="editor-question-card">
              <div className="card-question-header">
                <div className="a08-question-title-group">
                  <span className="question-number">Question {index + 1}</span>
                  <span
                    className={`status-chip a02-chip-xs ${
                      question.type === "rating"
                        ? "a05-chip-info"
                        : "a02-chip-warning"
                    }`}
                  >
                    {question.type === "rating"
                      ? "Rating Scale"
                      : "Written Response"}
                  </span>
                </div>

                {isEditable && (
                  <div className="a08-question-header-actions">
                    <button
                      type="button"
                      className="a08-move-btn"
                      disabled={index === 0}
                      title="Move question up"
                      aria-label={`Move question ${index + 1} up`}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="a08-move-btn"
                      disabled={index === questions.length - 1}
                      title="Move question down"
                      aria-label={`Move question ${index + 1} down`}
                      onClick={() => moveQuestion(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-danger-sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="editor-question-row">
                <label htmlFor={`q-text-${question.id}`}>Question Text</label>
                <input
                  id={`q-text-${question.id}`}
                  type="text"
                  value={question.text}
                  disabled={!isEditable}
                  placeholder="Enter evaluation question here..."
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      text: event.target.value,
                    })
                  }
                />
              </div>

              <div className="editor-question-meta-row">
                <label className="checkbox-row-label">
                  <input
                    type="checkbox"
                    checked={question.required}
                    disabled={!isEditable}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Required Question
                </label>

                {question.type === "rating" && (
                  <div className="editor-range-group">
                    <div className="stepper-field-card">
                      <span className="stepper-label">Min Score</span>
                      <div className="custom-stepper-control">
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={!isEditable || (question.min ?? 1) <= 0}
                          onClick={() =>
                            updateQuestion(question.id, {
                              min: Math.max(0, (question.min ?? 1) - 1),
                            })
                          }
                        >
                          −
                        </button>
                        <span className="stepper-value-badge">
                          {question.min ?? 1}
                        </span>
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={
                            !isEditable ||
                            (question.min ?? 1) >= (question.max ?? 5) - 1
                          }
                          onClick={() =>
                            updateQuestion(question.id, {
                              min: (question.min ?? 1) + 1,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="stepper-field-card">
                      <span className="stepper-label">Max Score</span>
                      <div className="custom-stepper-control">
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={
                            !isEditable ||
                            (question.max ?? 5) <= (question.min ?? 1) + 1
                          }
                          onClick={() =>
                            updateQuestion(question.id, {
                              max: Math.max(
                                (question.min ?? 1) + 1,
                                (question.max ?? 5) - 1
                              ),
                            })
                          }
                        >
                          −
                        </button>
                        <span className="stepper-value-badge">
                          {question.max ?? 5}
                        </span>
                        <button
                          type="button"
                          className="stepper-btn"
                          disabled={!isEditable}
                          onClick={() =>
                            updateQuestion(question.id, {
                              max: (question.max ?? 5) + 1,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isEditable && (
            <div className="add-questions-bar">
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
      </section>

      {/* Footer Actions */}
      {(isEditable || selectedTemplate?.can_publish) && (
        <div className="form-editor-footer-actions">
          {isEditable && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void saveDraft()}
            >
              Save Draft
            </button>
          )}

          {selectedTemplate?.can_publish && (
            <button
              type="button"
              className="btn-accent-blue"
              onClick={() => void publishTemplate()}
            >
              Publish Template
            </button>
          )}
        </div>
      )}

      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}