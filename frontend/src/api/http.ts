import type { ApiErrorPayload } from "./types";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const mockMode = import.meta.env.VITE_USE_MOCKS === "true";
export function isMockMode() { return mockMode; }
export class ApiError extends Error {
  constructor(public status: number, public payload: ApiErrorPayload | string) {
    super(errorText(payload));
    this.name = "ApiError";
  }
}
function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorText).join(" ");
  if (value && typeof value === "object") {
    const fields = value as Record<string, unknown>;
    if (typeof fields.detail === "string") return fields.detail;
    return Object.entries(fields).map(([key, item]) =>
      key === "non_field_errors" || key === "responses" ? errorText(item) : `${fieldLabel(key)}: ${errorText(item)}`
    ).join(" ");
  }
  return String(value ?? "");
}
function fieldLabel(key: string) {
  const words = key.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function cookie(name: string): string | undefined {
  return document.cookie.split("; ").find(item => item.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = cookie("csrftoken");
    if (csrf) headers.set("X-CSRFToken", decodeURIComponent(csrf));
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, { ...options, headers, credentials: "include" });
  } catch { throw new ApiError(0, "Unable to reach Django. Check that the backend is running and the Vite proxy is configured."); }
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("json") ? await response.json() as ApiErrorPayload : await response.text();
    throw new ApiError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, value?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(value ?? {}) });
export const patch = <T>(path: string, value: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(value) });
export const put = <T>(path: string, value: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(value) });
export function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([,v]) => v !== undefined).map(([k,v])=>[k,String(v)]);
  const q = new URLSearchParams(entries).toString(); return q ? `?${q}` : "";
}
export function downloadKpiCsv(cycleId?: number) {
  // Use a direct GET for a browser-managed CSV download. With Vite proxy this is same-origin.
  const q = qs({ cycle_id: cycleId });
  window.open(`${baseUrl}/api/committee/kpis/export.csv${q}`, "_blank", "noopener");
}
export async function downloadSurveyFile(surveyId: number) {
  const response = await fetch(
    `${baseUrl}/api/committee/surveys/${surveyId}/file/`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const message = contentType.includes("json")
      ? (await response.json()).detail || "Unable to download attachment."
      : "Unable to download attachment.";

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = `survey-${surveyId}-attachment`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}