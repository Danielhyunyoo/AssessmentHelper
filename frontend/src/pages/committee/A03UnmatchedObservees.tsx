// src/pages/committee/A03UnmatchedObservees.tsx
import React from "react";

export default function A03UnmatchedObservees(): React.ReactElement {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4rem 2rem",
      textAlign: "center",
      minHeight: "60vh",
      backgroundColor: "#fff1f2", // Soft playful reddish tint for the joke page
    }}>
      <h2 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#9f1239", marginBottom: "1rem" }}>
        ⚠️ Unmatched Observees Emergency Protocol ⚠️
      </h2>
      
      <p style={{ fontSize: "1.1rem", color: "#475569", maxWidth: "600px", marginBottom: "3rem", lineHeight: "1.6" }}>
        All faculty members have successfully matched... or perhaps they got lost reading fictional stories instead. Click the button below to access the official emergency archives repository.
      </p>

      {/* Giant Easter Egg Link Button */}
      <a
        href="https://archiveofourown.org"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          backgroundColor: "#be123c",
          color: "#ffffff",
          fontSize: "2rem",
          fontWeight: "700",
          padding: "2rem 4rem",
          borderRadius: "24px",
          textDecoration: "none",
          boxShadow: "0 10px 25px -5px rgba(190, 18, 60, 0.4)",
          transition: "transform 0.2s ease, background-color 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#9f1239")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#be123c")}
      >
        📖 Open the Archives (A03) 🚀
      </a>

      <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "3rem" }}>
        <em>(Note: This classified committee module will self-destruct before production.)</em>
      </p>
    </div>
  );
}