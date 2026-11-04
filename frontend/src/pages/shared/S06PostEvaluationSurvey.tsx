import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function S06PostEvaluationSurvey() {
  const [satisfactionScore, setSatisfactionScore] = useState<number>(0);
  const [difficulties, setDifficulties] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Post-Evaluation Survey submitted successfully!");
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Post-Evaluation Survey</h2>

      {/* Pairing Summary Box */}
      <section className="table-container theme-orange summary-card-padding">
        <h3 className="card-heading-md">Pairing Summary</h3>
        <p className="card-subtext font-slate">Review observation/observee summary</p>

        <div className="pairing-grid">
          <div>
            <strong className="summary-field-label">Observer Name</strong>
            <p className="summary-field-val">Professor B</p>
          </div>
          <div>
            <strong className="summary-field-label">Observee Name</strong>
            <p className="summary-field-val">Professor A</p>
          </div>
          <div>
            <strong className="summary-field-label">Course and Section</strong>
            <p className="summary-field-val">CS 4349 Sec 002 M/W 1:00 PM - 2:15 PM</p>
          </div>
          <div>
            <strong className="summary-field-label">Observation Date</strong>
            <p className="summary-field-val">October 25, 2026</p>
          </div>
        </div>
      </section>

      {/* Survey Main Container */}
      <section className="table-container theme-green summary-card-padding">
        <div className="form-header-row">
          <h3 className="card-heading-md margin-none">Post-Evaluation Cycle Process Survey</h3>
          <span className="version-pill-tag">
            Survey Form V1
          </span>
        </div>

        <p className="form-instruction-subtext">
          For each question, please assign a score (1 = Unsatisfactory, 5 = Very Satisfactory)
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-section-block-sm">
            <h4 className="section-subtitle">
              Overall Process Evaluation
            </h4>

            {/* Q1 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                How satisfied are you with the evaluation process?
              </label>
              <div className="rating-btn-row">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = satisfactionScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSatisfactionScore(score)}
                      className={`rating-score-btn ${isSelected ? "selected" : ""}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fixed Textarea 1 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                Please list any difficulties you ran into throughout this cycle (re: scheduling, communication, or the observation visit, etc.).
              </label>
              <textarea
                placeholder="Enter Text Here..."
                value={difficulties}
                onChange={(e) => setDifficulties(e.target.value)}
                className="fixed-height-textarea"
              />
            </div>

            {/* Fixed Textarea 2 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                Please provide any feedback or suggestions on how the Assessment Committee can improve this workflow.
              </label>
              <textarea
                placeholder="Enter Text Here..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="fixed-height-textarea"
              />
            </div>

            {/* File Upload */}
            <div className="question-field-wrapper">
              <label className="file-upload-label">
                OPTIONAL Supporting Documentation / Statement Upload
              </label>
              <p className="file-upload-subtext">
                Upload documentation or statements regarding any difficulties during the observation cycle.
              </p>
              <input
                type="file"
                onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                className="file-input-field"
              />
              {selectedFile && (
                <span className="file-selected-tag">
                  Selected: {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="submit-action-row">
            <button type="submit" className="btn-primary">
              Submit Survey
            </button>
          </div>
        </form>
      </section>

      {/* Bottom Center Return Button */}
      <div className="dashboard-center-action">
        <Link to="/shared/faculty-dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}