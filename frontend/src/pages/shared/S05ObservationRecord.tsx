import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function S05ObservationRecord() {
  const [ratings, setRatings] = useState<Record<string, number>>({
    engagement: 0,
    rigor: 0,
    pace: 0,
    alignment: 0,
  });

  const [comments, setComments] = useState("");
  const [observerSig, setObserverSig] = useState("");
  const [observeeSig, setObserveeSig] = useState("");

  const handleRatingSelect = (field: string, score: number) => {
    setRatings((prev) => ({ ...prev, [field]: score }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert("Downloading Observation Record as PDF...");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Observation Record and Evaluation Form submitted successfully!");
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <div className="back-dashboard-wrapper">
        <Link to="/shared/faculty-dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observation Record</h2>

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

      {/* Evaluation Form Main Container */}
      <section className="table-container theme-green summary-card-padding">
        <div className="form-header-row">
          <h3 className="card-heading-md margin-none">Observation Record and Evaluation Form</h3>
          <span className="version-pill-tag">
            Evaluation Form V1
          </span>
        </div>

        <p className="form-instruction-subtext">
          For each question, please assign a score (1 = Lowest/Worst, 5 = Highest/Best)
        </p>

        <form onSubmit={handleSubmit}>
          {/* OBSERVER SECTION */}
          <div className="form-section-block">
            <h4 className="section-subtitle">
              The following sections are intended for the OBSERVER to fill in:
            </h4>

            {/* Q1 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                Please rank the student's overall engagement levels.
              </label>
              <div className="rating-btn-row">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = ratings.engagement === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleRatingSelect("engagement", score)}
                      className={`rating-score-btn ${isSelected ? "selected" : ""}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q2 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                Was the academic rigor appropriate for the course level?
              </label>
              <div className="rating-btn-row">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = ratings.rigor === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleRatingSelect("rigor", score)}
                      className={`rating-score-btn ${isSelected ? "selected" : ""}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q3 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                How good was the pace of the lecture?
              </label>
              <div className="rating-btn-row">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = ratings.pace === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleRatingSelect("pace", score)}
                      className={`rating-score-btn ${isSelected ? "selected" : ""}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Q4 */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                How well did the lecture align with the syllabus?
              </label>
              <div className="rating-btn-row">
                {[1, 2, 3, 4, 5].map((score) => {
                  const isSelected = ratings.alignment === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleRatingSelect("alignment", score)}
                      className={`rating-score-btn ${isSelected ? "selected" : ""}`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fixed Textarea */}
            <div className="question-field-wrapper">
              <label className="question-label-bold">
                Please include any additional notes, comments or concerns you may have.
              </label>
              <textarea
                placeholder="Enter Text Here..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="fixed-height-textarea"
              />
            </div>

            {/* Observer Signature */}
            <div className="signature-wrapper">
              <div className="signature-header">
                <label className="question-label-bold">OBSERVER Digital Signature</label>
                <span className="signature-timestamp">Signed by First Name Last Name on XX/XX/XXXX</span>
              </div>
              <input
                type="text"
                placeholder="Observer First and Last Names"
                value={observerSig}
                onChange={(e) => setObserverSig(e.target.value)}
                className="styled-text-input full-width-input"
              />
            </div>
          </div>

          {/* OBSERVEE SECTION */}
          <div className="form-section-block-sm">
            <h4 className="section-subtitle">
              The following sections are intended for the OBSERVEE to fill in:
            </h4>

            <div>
              <div className="signature-header">
                <label className="question-label-bold">OBSERVEE Digital Signature</label>
                <span className="signature-timestamp">Signed by First Name Last Name on XX/XX/XXXX</span>
              </div>
              <input
                type="text"
                placeholder="Observee First and Last Names"
                value={observeeSig}
                onChange={(e) => setObserveeSig(e.target.value)}
                className="styled-text-input full-width-input"
              />
            </div>

            <p className="disclaimer-text">
              By signing this form, I acknowledge that an in-person classroom observation occurred on [Date]. I understand that signing indicates confirmation that the visit took place, irrespective of whether I agree with the ratings provided.
            </p>
          </div>

          {/* Submit Button */}
          <div className="submit-action-row">
            <button type="submit" className="btn-primary">
              Submit
            </button>
          </div>
        </form>

        {/* Action Buttons: Print & Download */}
        <div className="external-action-row">
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" className="btn-secondary" onClick={handleDownload}>
            Download
          </button>
        </div>
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