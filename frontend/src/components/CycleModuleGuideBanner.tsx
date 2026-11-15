// src/components/CycleModuleGuideBanner.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ModuleGuideItem } from "../data/moduleGuides";

interface CycleModuleGuideBannerProps {
  storageKey: string;
  eyebrow: string;
  title: string;
  overview: string;
  modules: ModuleGuideItem[];
  defaultOpen?: boolean;
}

export default function CycleModuleGuideBanner({
  storageKey,
  eyebrow,
  title,
  overview,
  modules,
  defaultOpen = false,
}: CycleModuleGuideBannerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "true") return true;
      if (saved === "false") return false;
      return defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  const [selectedPhase, setSelectedPhase] = useState<string>("All");

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const phases = ["All", ...Array.from(new Set(modules.map((m) => m.phase)))];
  const visibleModules =
    selectedPhase === "All"
      ? modules
      : modules.filter((m) => m.phase === selectedPhase);

  const getPhaseTone = (phase: string) => {
    const p = phase.toLowerCase();
    if (p === "observee" || p === "phase 1") return "is-slate";
    if (p === "observer" || p === "phase 2") return "is-amber";
    if (p === "phase 3" || p === "admin") return "is-sage";
    return "is-neutral";
  };

  return (
    <section className="guide-shell" aria-label={title}>
      <div className="guide-shell-header">
        <div className="guide-shell-title-wrap">
          <span className="a01-phase-pill">{eyebrow}</span>
          <h3 className="guide-shell-title">{title}</h3>
        </div>

        <button
          type="button"
          className="btn-secondary guide-toggle-btn"
          onClick={toggleOpen}
          aria-expanded={isOpen}
        >
          {isOpen ? "Hide Guide" : "Show Guide"}
        </button>
      </div>

      {isOpen && (
        <div className="guide-shell-body">
          <div className="guide-top-strip">
            <p className="guide-overview-text">{overview}</p>

            {phases.length > 2 && (
              <div
                className="guide-filter-pills"
                role="tablist"
                aria-label="Filter guide by stage"
              >
                {phases.map((phase) => (
                  <button
                    key={phase}
                    type="button"
                    role="tab"
                    aria-selected={selectedPhase === phase}
                    className={`guide-filter-pill ${
                      selectedPhase === phase ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedPhase(phase)}
                  >
                    {phase}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="guide-rows-frame">
            {visibleModules.map((mod) => (
              <Link
                key={mod.id}
                to={mod.route}
                className="guide-module-row"
              >
                <div className="guide-row-badge-col">
                  <span className={`guide-stage-tag ${getPhaseTone(mod.phase)}`}>
                    {mod.phase}
                  </span>
                </div>

                <div className="guide-row-content-col">
                  <span className="guide-row-title">{mod.title}</span>
                  <span className="guide-row-desc">{mod.detailed}</span>
                </div>

                <div className="guide-row-action-col">
                  <span className="guide-row-arrow" aria-hidden="true">
                    Open →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}