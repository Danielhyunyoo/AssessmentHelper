/** Initials shared by faculty avatars. Empty names use a visible fallback. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const RANK_LABELS: Record<string, string> = {
  assistant: "Assistant Professor",
  associate: "Associate Professor",
  full: "Full Professor",
  professor_of_instruction: "Professor of Instruction",
};

/** Normalize known display labels while preserving unrecognized values. */
export function normalizeRankValue(rank: string | null | undefined): string {
  if (!rank) return "";
  const normalized = rank.trim().toLowerCase();
  if (normalized === "assistant" || normalized === "assistant professor") return "assistant";
  if (normalized === "associate" || normalized === "associate professor") return "associate";
  if (normalized === "full" || normalized === "full professor") return "full";
  if (normalized === "professor_of_instruction" || normalized === "professor of instruction") {
    return "professor_of_instruction";
  }
  return rank;
}

/** Callers can keep their existing wording for missing rank data. */
export function formatAcademicRank(
  rank: string | null | undefined,
  emptyLabel = "Not specified"
): string {
  if (!rank) return emptyLabel;
  return RANK_LABELS[normalizeRankValue(rank)] || rank;
}
