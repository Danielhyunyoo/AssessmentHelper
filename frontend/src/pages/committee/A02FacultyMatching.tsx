// src/pages/committee/A02FacultyMatching.tsx
import { useEffect, useState } from "react";
import { committeeApi, demoApi, facultyApi } from "../../api/endpoints";
import type { Course, FacultyRow } from "../../api/types";
import { Link } from "react-router-dom";

function formatDay(isoDate: string): string {
  const date =
    isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const CYCLE_TRANSFER_STORAGE_KEY = "ac_cycle_transfers";
const PENDING_COURSE_CHANGE_KEY = "pending_course_change_requests";
const LEGACY_PENDING_COURSE_CHANGE_KEY = "pending_course_change_request";

export interface CycleTransferRecord {
  professor_name: string;
  target_cycle: string;
  note: string;
  transferred_at: string;
}

export interface CourseChangeRequestItem {
  request_id?: string;
  storage_key?: string;
  professor_id?: number;
  professor_name?: string;
  current_course_id?: number;
  requested_course_id: number;
  requested_course_label: string;
  requested_section: string;
  requested_schedule: string;
  requested_dates: string[];
  reason?: string;
  submitted_at: string;
}

interface ConfirmedMatchInfo {
  confirmedObserverNames: string[];
  confirmedAt?: string;
}

type ResolutionActionType =
  | "approve_and_select_observers"
  | "approve_keep_observers"
  | "reassign_course"
  | "transfer_cycle"
  | "deny_request";

function normalizeRequestItem(
  raw: unknown,
  storageKey: string,
  fallbackIndex = 0
): CourseChangeRequestItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.requested_course_id !== "number") return null;

  const profName =
    typeof obj.professor_name === "string"
      ? obj.professor_name
      : "Faculty Observee";
  const submittedAt =
    typeof obj.submitted_at === "string"
      ? obj.submitted_at
      : new Date().toISOString();
  const reqId =
    typeof obj.request_id === "string" && obj.request_id.trim()
      ? obj.request_id
      : `${storageKey}::${profName}::${obj.requested_course_id}::${submittedAt}::${fallbackIndex}`;

  return {
    request_id: reqId,
    storage_key: storageKey,
    professor_id:
      typeof obj.professor_id === "number" ? obj.professor_id : undefined,
    professor_name: profName,
    current_course_id:
      typeof obj.current_course_id === "number"
        ? obj.current_course_id
        : undefined,
    requested_course_id: obj.requested_course_id,
    requested_course_label:
      typeof obj.requested_course_label === "string"
        ? obj.requested_course_label
        : `Course #${obj.requested_course_id}`,
    requested_section:
      typeof obj.requested_section === "string" ? obj.requested_section : "001",
    requested_schedule:
      typeof obj.requested_schedule === "string"
        ? obj.requested_schedule
        : "TBD",
    requested_dates: Array.isArray(obj.requested_dates)
      ? obj.requested_dates.filter((d): d is string => typeof d === "string")
      : [],
    reason: typeof obj.reason === "string" ? obj.reason : undefined,
    submitted_at: submittedAt,
  };
}

function readAllPendingChangeRequests(): CourseChangeRequestItem[] {
  const collected: CourseChangeRequestItem[] = [];
  const seenIds = new Set<string>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("pending_course_change")) continue;

      const rawVal = localStorage.getItem(key);
      if (!rawVal) continue;

      const parsed = JSON.parse(rawVal);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry, idx) => {
          const item = normalizeRequestItem(entry, key, idx);
          if (item && item.request_id && !seenIds.has(item.request_id)) {
            seenIds.add(item.request_id);
            collected.push(item);
          }
        });
      } else {
        const item = normalizeRequestItem(parsed, key, 0);
        if (item && item.request_id && !seenIds.has(item.request_id)) {
            seenIds.add(item.request_id);
            collected.push(item);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  return collected.sort((a, b) =>
    b.submitted_at.localeCompare(a.submitted_at)
  );
}

function deletePendingChangeRequest(
  targetReq: CourseChangeRequestItem
): CourseChangeRequestItem[] {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("pending_course_change")) continue;

      const rawVal = localStorage.getItem(key);
      if (!rawVal) continue;

      const parsed = JSON.parse(rawVal);
      if (Array.isArray(parsed)) {
        const remaining = parsed.filter((entry, idx) => {
          const norm = normalizeRequestItem(entry, key, idx);
          if (!norm) return false;
          const sameId =
            targetReq.request_id && norm.request_id === targetReq.request_id;
          const sameSignature =
            norm.professor_name?.toLowerCase() ===
              targetReq.professor_name?.toLowerCase() &&
            norm.requested_course_id === targetReq.requested_course_id &&
            norm.submitted_at === targetReq.submitted_at;
          return !sameId && !sameSignature;
        });

        if (remaining.length > 0) {
          localStorage.setItem(key, JSON.stringify(remaining));
        } else {
          localStorage.removeItem(key);
        }
      } else {
        const norm = normalizeRequestItem(parsed, key, 0);
        const sameId =
          norm &&
          targetReq.request_id &&
          norm.request_id === targetReq.request_id;
        const sameSignature =
          norm &&
          norm.professor_name?.toLowerCase() ===
            targetReq.professor_name?.toLowerCase() &&
          norm.requested_course_id === targetReq.requested_course_id &&
          norm.submitted_at === targetReq.submitted_at;

        if (
          sameId ||
          sameSignature ||
          key === LEGACY_PENDING_COURSE_CHANGE_KEY
        ) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignore storage errors
  }

  const next = readAllPendingChangeRequests();
  try {
    if (next.length > 0) {
      localStorage.setItem(PENDING_COURSE_CHANGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore storage errors
  }

  window.dispatchEvent(new Event("course-change-request-updated"));
  return next;
}

/**
 * Checks localStorage for any observee-approved observer invitation acceptances
 * (written when an observee approves an observer on E02).
 */
function readLocalConfirmedObserverMap(): Record<string, ConfirmedMatchInfo> {
  const map: Record<string, ConfirmedMatchInfo> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.includes("confirmed_observer") ||
        key.includes("approved_observer") ||
        key.includes("accepted_match")
      ) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object" && parsed !== null
          ? Object.values(parsed)
          : [];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const rec = item as Record<string, unknown>;
          const observeeName =
            typeof rec.observee_name === "string"
              ? rec.observee_name
              : typeof rec.professor_name === "string"
              ? rec.professor_name
              : null;
          const observerName =
            typeof rec.observer_name === "string"
              ? rec.observer_name
              : typeof rec.name === "string"
              ? rec.name
              : null;
          if (observeeName && observerName) {
            const k = observeeName.toLowerCase();
            if (!map[k]) {
              map[k] = {
                confirmedObserverNames: [],
                confirmedAt:
                  typeof rec.confirmed_at === "string"
                    ? rec.confirmed_at
                    : undefined,
              };
            }
            if (!map[k].confirmedObserverNames.includes(observerName)) {
              map[k].confirmedObserverNames.push(observerName);
            }
          }
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return map;
}

export default function A02FacultyMatching() {
  const [observeeList, setObserveeList] = useState<FacultyRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("Computer Science");
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [candidateOptions, setCandidateOptions] = useState<
    Record<number, { id: number; name: string; academic_level: string; eligible?: boolean; problems?: string[] }[]>
  >({});
  const [selectedObservers, setSelectedObservers] = useState<
    Record<number, number[]>
  >({});
  const [confirmedBySignupId, setConfirmedBySignupId] = useState<
    Record<number, ConfirmedMatchInfo>
  >({});
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [savingSignupId, setSavingSignupId] = useState<number | null>(null);
  const [matchError, setMatchError] = useState("");
  const [matchSuccess, setMatchSuccess] = useState("");

  // Master-Detail active observee selection
  const [activeSignupId, setActiveSignupId] = useState<number | null>(null);

  const [matchSearchQuery, setMatchSearchQuery] = useState("");
  const [matchStatusFilter, setMatchStatusFilter] = useState<
    "all" | "released" | "unreleased" | "pending_change"
  >("all");
  const [changeReqSearchQuery, setChangeReqSearchQuery] = useState("");

  // Multiple pending course change requests & session visibility flag
  const [pendingChangeRequests, setPendingChangeRequests] = useState<
    CourseChangeRequestItem[]
  >(() => readAllPendingChangeRequests());
  const [hadRequestsThisSession, setHadRequestsThisSession] = useState<boolean>(
    () => readAllPendingChangeRequests().length > 0
  );
  const [expandedRequestIds, setExpandedRequestIds] = useState<
    Record<string, boolean>
  >({});
  const [resolutionActionByReq, setResolutionActionByReq] = useState<
    Record<string, ResolutionActionType>
  >({});
  const [reassignedCourseByReq, setReassignedCourseByReq] = useState<
    Record<string, number | "">
  >({});
  const [targetCycleByReq, setTargetCycleByReq] = useState<
    Record<string, string>
  >({});
  const [acNoteByReq, setAcNoteByReq] = useState<Record<string, string>>({});
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null
  );

  // Track transferred observees in current session
  const [transferredObservees, setTransferredObservees] = useState<
    Record<string, CycleTransferRecord>
  >(() => {
    try {
      const raw = localStorage.getItem(CYCLE_TRANSFER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Allow AC to unlock and re-edit already released (unconfirmed) observer lists
  const [unlockedSignupIds, setUnlockedSignupIds] = useState<
    Record<number, boolean>
  >({});

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("2026-09-13");
  const [endDate, setEndDate] = useState<string>("2026-10-09");
  const [observationDeadline, setObservationDeadline] = useState<string>("");
  const [surveyDeadline, setSurveyDeadline] = useState<string>("");
  const [currentToday, setCurrentToday] = useState<string>("");
  const [savingDates, setSavingDates] = useState(false);
  const [displayStartDate, setDisplayStartDate] =
    useState<string>("Sep 13, 2026");
  const [displayEndDate, setDisplayEndDate] = useState<string>(
    "Oct 9, 2026 at 11:59 PM"
  );
  const [releasedAt, setReleasedAt] = useState<Record<number, string>>({});

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const getReqKey = (req: CourseChangeRequestItem, idx: number): string =>
    req.request_id ?? `${req.professor_name || "req"}-${idx}`;

  const focusObserveeMatchCard = (observeeName: string, signupId?: number) => {
    setMatchStatusFilter("all");
    setMatchSearchQuery("");
    if (signupId != null) {
      setActiveSignupId(signupId);
      setUnlockedSignupIds((prev) => ({ ...prev, [signupId]: true }));
      requestAnimationFrame(() => {
        const el = document.getElementById("a02-match-workspace");
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } else {
      setMatchSearchQuery(observeeName);
    }
  };

  const handleSaveDates = async () => {
    if (!startDate || !endDate || !observationDeadline || !surveyDeadline) {
      setMatchError("Please enter all four cycle dates.");
      return;
    }

    if (startDate > endDate) {
      setMatchError(
        "The registration opening date must be before the closing date."
      );
      return;
    }

    if (endDate > observationDeadline) {
      setMatchError(
        "The observation deadline cannot be before registration closes."
      );
      return;
    }

    if (observationDeadline >= surveyDeadline) {
      setMatchError(
        "The survey deadline must be after the observation deadline."
      );
      return;
    }

    setSavingDates(true);
    setMatchError("");
    setMatchSuccess("");

    try {
      const updated = await committeeApi.updateCycleDates({
        start_date: startDate,
        signup_deadline: endDate,
        observation_deadline: observationDeadline,
        survey_deadline: surveyDeadline,
      });

      setStartDate(updated.start_date);
      setEndDate(updated.signup_deadline);
      setObservationDeadline(updated.observation_deadline);
      setSurveyDeadline(updated.survey_deadline);

      setDisplayStartDate(
        new Date(`${updated.start_date}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      );

      setDisplayEndDate(
        `${new Date(`${updated.signup_deadline}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )} at 11:59 PM`
      );

      setMatchSuccess("Registration dates saved to the evaluation cycle.");
      setIsModalOpen(false);
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save registration dates."
      );
    } finally {
      setSavingDates(false);
    }
  };

  async function loadMatchingData(isCancelled?: () => boolean) {
    setLoadingMatches(true);
    setMatchError("");

    try {
      demoApi
        .date()
        .then((dateRes) => {
          if (!isCancelled?.()) {
            setCurrentToday(dateRes.today);
          }
        })
        .catch(() => {});

      const [cycleDates, roster, coursesResp] = await Promise.all([
        committeeApi.cycleDates(),
        committeeApi.faculty(),
        facultyApi.courses().catch(() => [] as Course[]),
      ]);

      if (isCancelled?.()) return;

      setStartDate(cycleDates.start_date);
      setEndDate(cycleDates.signup_deadline);
      setObservationDeadline(cycleDates.observation_deadline);
      setSurveyDeadline(cycleDates.survey_deadline);

      setDisplayStartDate(
        new Date(`${cycleDates.start_date}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )
      );

      setDisplayEndDate(
        `${new Date(`${cycleDates.signup_deadline}T00:00:00`).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" }
        )} at 11:59 PM`
      );

      const eligibleObservees: FacultyRow[] = roster.faculty.filter(
        (faculty: FacultyRow) =>
          faculty.signup_id !== null && faculty.course !== null
      );

      const courseMap = new Map<number, Course>();
      (Array.isArray(coursesResp) ? coursesResp : []).forEach((c: Course) =>
        courseMap.set(c.course_id, c)
      );
      roster.faculty.forEach((f: FacultyRow) => {
        if (f.course) {
          courseMap.set(f.course.course_id, f.course);
        }
      });
      setAvailableCourses(Array.from(courseMap.values()));
      setObserveeList(eligibleObservees);

      const currentReqs = readAllPendingChangeRequests();
      setPendingChangeRequests(currentReqs);
      if (currentReqs.length > 0) {
        setHadRequestsThisSession(true);
      }
      setReassignedCourseByReq((prev) => {
        const next = { ...prev };
        currentReqs.forEach((req, idx) => {
          const key = getReqKey(req, idx);
          if (next[key] === undefined) {
            next[key] = req.requested_course_id;
          }
        });
        return next;
      });

      const localConfirmed = readLocalConfirmedObserverMap();

      const poolResults: [
        number,
        {
          candidates: {
            id: number;
            name: string;
            academic_level: string;
            eligible?: boolean;
            problems?: string[];
          }[];
          releasedObserverIds: number[];
          releasedAt: string | null;
          confirmedInfo: ConfirmedMatchInfo | null;
        }
      ][] = await Promise.all(
        eligibleObservees.map(async (faculty: FacultyRow) => {
          const signupId = faculty.signup_id!;
          const facultyRec = faculty as unknown as Record<string, unknown>;
          const localInfo = localConfirmed[faculty.name.toLowerCase()];

          try {
            const result = (await committeeApi.candidatePool(
              signupId
            )) as Record<string, unknown>;

            const candidates = Array.isArray(result.candidates)
              ? (result.candidates as {
                  id: number;
                  name: string;
                  academic_level: string;
                  eligible?: boolean;
                  problems?: string[];
                }[])
              : [];

            const releasedObserverIds: number[] = Array.isArray(
              result.released_observer_ids
            )
              ? result.released_observer_ids.filter(
                  (id): id is number => typeof id === "number"
                )
              : [];

            const releasedAt =
              typeof result.matches_released_at === "string"
                ? result.matches_released_at
                : null;

            const rawConfirmedIds: number[] = Array.isArray(
              result.confirmed_observer_ids
            )
              ? result.confirmed_observer_ids.filter(
                  (id): id is number => typeof id === "number"
                )
              : typeof result.matched_observer_id === "number"
              ? [result.matched_observer_id]
              : typeof result.confirmed_observer_id === "number"
              ? [result.confirmed_observer_id]
              : typeof facultyRec.observer_id === "number"
              ? [facultyRec.observer_id]
              : [];

            const rawConfirmedNames: string[] = Array.isArray(
              result.confirmed_observer_names
            )
              ? result.confirmed_observer_names.filter(
                  (n): n is string => typeof n === "string"
                )
              : typeof result.matched_observer_name === "string"
              ? [result.matched_observer_name]
              : typeof facultyRec.observer_name === "string" &&
                facultyRec.observer_name.trim()
              ? [facultyRec.observer_name]
              : rawConfirmedIds.length > 0
              ? candidates
                  .filter((c) => rawConfirmedIds.includes(c.id))
                  .map((c) => c.name)
              : [];

            const candidateAcceptedNames = candidates
              .filter((c) => {
                const cRec = c as unknown as Record<string, unknown>;
                const cStatus = String(cRec.status ?? "").toLowerCase();
                return (
                  cRec.accepted === true ||
                  cRec.confirmed === true ||
                  cRec.is_confirmed === true ||
                  cStatus === "accepted" ||
                  cStatus === "confirmed" ||
                  cStatus === "scheduled"
                );
              })
              .map((c) => c.name);

            const rosterStatus = String(facultyRec.status ?? "").toLowerCase();
            const poolStatus = String(result.status ?? "").toLowerCase();

            const isConfirmed =
              rawConfirmedIds.length > 0 ||
              rawConfirmedNames.length > 0 ||
              candidateAcceptedNames.length > 0 ||
              Boolean(result.match_confirmed_at) ||
              poolStatus === "confirmed" ||
              poolStatus === "matched" ||
              poolStatus === "scheduled" ||
              rosterStatus === "confirmed" ||
              rosterStatus === "matched" ||
              rosterStatus === "scheduled" ||
              rosterStatus === "in_progress" ||
              rosterStatus === "completed" ||
              Boolean(localInfo);

            let confirmedInfo: ConfirmedMatchInfo | null = null;
            if (isConfirmed) {
              const mergedNames = Array.from(
                new Set([
                  ...rawConfirmedNames,
                  ...candidateAcceptedNames,
                  ...(localInfo?.confirmedObserverNames ?? []),
                ])
              );
              confirmedInfo = {
                confirmedObserverNames: mergedNames,
                confirmedAt:
                  typeof result.match_confirmed_at === "string"
                    ? result.match_confirmed_at
                    : localInfo?.confirmedAt,
              };
            }

            return [
              signupId,
              { candidates, releasedObserverIds, releasedAt, confirmedInfo },
            ];
          } catch {
            return [
              signupId,
              {
                candidates: [],
                releasedObserverIds: [],
                releasedAt: null,
                confirmedInfo: localInfo ?? null,
              },
            ];
          }
        })
      );

      if (isCancelled?.()) return;

      setCandidateOptions(
        Object.fromEntries(
          poolResults.map(([signupId, result]) => [
            signupId,
            result.candidates,
          ])
        )
      );

      setSelectedObservers(
        Object.fromEntries(
          poolResults.map(([signupId, result]) => [
            signupId,
            result.releasedAt
              ? result.releasedObserverIds
              : result.candidates
                  .filter((candidate) => candidate.eligible !== false)
                  .slice(0, 5)
                  .map((candidate) => candidate.id),
          ])
        )
      );

      setReleasedAt(
        Object.fromEntries(
          poolResults
            .filter(([, result]) => result.releasedAt)
            .map(([signupId, result]) => [signupId, result.releasedAt!])
        )
      );

      const confirmedMap = Object.fromEntries(
        poolResults
          .filter(([, result]) => result.confirmedInfo !== null)
          .map(([signupId, result]) => [signupId, result.confirmedInfo!])
      );
      setConfirmedBySignupId(confirmedMap);

      const activePool = eligibleObservees.filter((f: FacultyRow) => {
        const sid = f.signup_id!;
        const hasReq = currentReqs.some(
          (req) =>
            req.professor_name?.toLowerCase() === f.name.toLowerCase() ||
            (req.current_course_id != null &&
              req.current_course_id === f.course?.course_id)
        );
        return !confirmedMap[sid] || hasReq;
      });

      setActiveSignupId((prev) => {
        if (
          prev !== null &&
          activePool.some((f: FacultyRow) => f.signup_id === prev)
        ) {
          return prev;
        }
        return activePool[0]?.signup_id ?? null;
      });
    } catch (err) {
      if (!isCancelled?.()) {
        setMatchError(
          err instanceof Error
            ? err.message
            : "Unable to load committee matching data."
        );
      }
    } finally {
      if (!isCancelled?.()) setLoadingMatches(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void loadMatchingData(() => cancelled);

    const syncPending = () => {
      const latest = readAllPendingChangeRequests();
      setPendingChangeRequests(latest);
      if (latest.length > 0) {
        setHadRequestsThisSession(true);
      }
    };
    window.addEventListener("course-change-request-updated", syncPending);
    window.addEventListener("notifications-changed", syncPending);
    window.addEventListener("storage", syncPending);

    return () => {
      cancelled = true;
      window.removeEventListener("course-change-request-updated", syncPending);
      window.removeEventListener("notifications-changed", syncPending);
      window.removeEventListener("storage", syncPending);
    };
  }, []);

  const handleResolveChangeRequest = async (
    req: CourseChangeRequestItem,
    reqKey: string
  ) => {
    const action =
      resolutionActionByReq[reqKey] ?? "approve_and_select_observers";
    const reassignedId =
      reassignedCourseByReq[reqKey] ?? req.requested_course_id;
    const cycle = targetCycleByReq[reqKey] ?? "Next Evaluation Cycle";
    const note = acNoteByReq[reqKey] ?? "";
    const observeeName = req.professor_name || "Observee";
    const matchedObservee = observeeList.find(
      (obs) => obs.name.toLowerCase() === observeeName.toLowerCase()
    );

    setProcessingRequestId(reqKey);
    setMatchError("");
    setMatchSuccess("");

    try {
      if (
        action === "approve_and_select_observers" ||
        action === "approve_keep_observers"
      ) {
        try {
          await facultyApi.selectCourse(req.requested_course_id);
        } catch {
          // Allow UI completion even if AC session lacks observee token
        }

        const targetCourse = availableCourses.find(
          (c) => c.course_id === req.requested_course_id
        );
        if (targetCourse) {
          setObserveeList((prev) =>
            prev.map((obs) =>
              obs.name.toLowerCase() === observeeName.toLowerCase()
                ? { ...obs, course: targetCourse }
                : obs
            )
          );
        }

        if (
          action === "approve_and_select_observers" &&
          matchedObservee?.signup_id != null
        ) {
          const sid = matchedObservee.signup_id;
          setConfirmedBySignupId((prev) => {
            const next = { ...prev };
            delete next[sid];
            return next;
          });
        }

        const remaining = deletePendingChangeRequest(req);
        setPendingChangeRequests(remaining);
        window.dispatchEvent(new Event("notifications-changed"));
        await loadMatchingData();

        if (action === "approve_and_select_observers") {
          focusObserveeMatchCard(
            observeeName,
            matchedObservee?.signup_id ?? undefined
          );
          setMatchSuccess(
            `Approved ${req.requested_course_label} (Sec. ${req.requested_section}) for ${observeeName}. Select and release their observers in the workspace below.`
          );
        } else {
          setMatchSuccess(
            `Approved ${req.requested_course_label} (Sec. ${req.requested_section}) for ${observeeName} and kept their current observer list.`
          );
        }
      } else if (action === "reassign_course") {
        if (reassignedId === "") {
          setMatchError("Please select a course section to reassign.");
          setProcessingRequestId(null);
          return;
        }

        const chosenCourse = availableCourses.find(
          (c) => c.course_id === Number(reassignedId)
        );

        try {
          await facultyApi.selectCourse(Number(reassignedId));
        } catch {
          // Allow UI completion even if AC session lacks observee token
        }

        if (chosenCourse) {
          setObserveeList((prev) =>
            prev.map((obs) =>
              obs.name.toLowerCase() === observeeName.toLowerCase()
                ? { ...obs, course: chosenCourse }
                : obs
            )
          );
        }

        if (matchedObservee?.signup_id != null) {
          const sid = matchedObservee.signup_id;
          setConfirmedBySignupId((prev) => {
            const next = { ...prev };
            delete next[sid];
            return next;
          });
        }

        const courseLabel = chosenCourse
          ? `${chosenCourse.department_code} ${chosenCourse.course_number}.${chosenCourse.section}`
          : `Course #${reassignedId}`;

        const remaining = deletePendingChangeRequest(req);
        setPendingChangeRequests(remaining);
        window.dispatchEvent(new Event("notifications-changed"));
        await loadMatchingData();

        focusObserveeMatchCard(
          observeeName,
          matchedObservee?.signup_id ?? undefined
        );
        setMatchSuccess(
          `Reassigned ${observeeName} to ${courseLabel}${
            note.trim() ? ` (Note: "${note.trim()}")` : ""
          }. Select and release their observers in the workspace below.`
        );
      } else if (action === "transfer_cycle") {
        if (!cycle.trim()) {
          setMatchError("Please specify the target evaluation cycle.");
          setProcessingRequestId(null);
          return;
        }

        const transferRecord: CycleTransferRecord = {
          professor_name: observeeName,
          target_cycle: cycle.trim(),
          note: note.trim(),
          transferred_at: new Date().toISOString(),
        };

        const updatedTransfers = {
          ...transferredObservees,
          [observeeName.toLowerCase()]: transferRecord,
        };
        setTransferredObservees(updatedTransfers);
        try {
          localStorage.setItem(
            CYCLE_TRANSFER_STORAGE_KEY,
            JSON.stringify(updatedTransfers)
          );
        } catch {
          // Ignore storage errors
        }

        const remaining = deletePendingChangeRequest(req);
        setPendingChangeRequests(remaining);
        window.dispatchEvent(new Event("notifications-changed"));

        setMatchSuccess(
          `Transferred ${observeeName} to ${cycle.trim()}${
            note.trim() ? ` (${note.trim()})` : ""
          }.`
        );
      } else if (action === "deny_request") {
        const remaining = deletePendingChangeRequest(req);
        setPendingChangeRequests(remaining);
        window.dispatchEvent(new Event("notifications-changed"));

        setMatchSuccess(
          `Denied course change request for ${observeeName}${
            note.trim() ? ` (Note: "${note.trim()}")` : ""
          }. Their original course remains active.`
        );
      }

      setAcNoteByReq((prev) => ({ ...prev, [reqKey]: "" }));
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to process course change request."
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleConfirmMatches = async (
    signupId: number,
    observeeName: string
  ) => {
    const observerIds = (selectedObservers[signupId] ?? []).filter(Boolean);

    if (observerIds.length === 0) {
      setMatchError("Select at least one eligible observer before confirming.");
      return;
    }

    if (observerIds.length > 5) {
      setMatchError("You can select at most five observers.");
      return;
    }

    setSavingSignupId(signupId);
    setMatchError("");
    setMatchSuccess("");

    try {
      await committeeApi.releaseCandidates(signupId, observerIds);
      setReleasedAt((previous) => ({
        ...previous,
        [signupId]: currentToday || new Date().toISOString(),
      }));
      setUnlockedSignupIds((prev) => ({ ...prev, [signupId]: false }));
      setMatchSuccess(
        `Released ${observerIds.length} observer${observerIds.length === 1 ? "" : "s"} to ${observeeName}. They have been notified.`
      );
    } catch (err) {
      setMatchError(
        err instanceof Error
          ? err.message
          : "Unable to save the selected observer candidates."
      );
    } finally {
      setSavingSignupId(null);
    }
  };

  const effectiveToday = currentToday
    ? new Date(`${currentToday}T00:00:00`)
    : new Date();
  const deadlineDate = new Date(`${endDate}T23:59:59`);
  const isOpen = effectiveToday <= deadlineDate;

  const findRequestForObservee = (
    person: FacultyRow
  ): CourseChangeRequestItem | undefined =>
    pendingChangeRequests.find(
      (req) =>
        req.professor_name?.toLowerCase() === person.name.toLowerCase() ||
        (req.current_course_id != null &&
          req.current_course_id === person.course?.course_id)
    );

  const filteredChangeRequests = pendingChangeRequests.filter((req) => {
    const q = changeReqSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (req.professor_name ?? "").toLowerCase().includes(q) ||
      (req.requested_course_label ?? "").toLowerCase().includes(q) ||
      (req.requested_section ?? "").toLowerCase().includes(q) ||
      (req.reason ?? "").toLowerCase().includes(q)
    );
  });

  const validObservees = observeeList.filter((p) => p.signup_id != null);

  const confirmedObservees = validObservees.filter((p) => {
    const sid = p.signup_id!;
    const hasPendingChange = Boolean(findRequestForObservee(p));
    return Boolean(confirmedBySignupId[sid]) && !hasPendingChange;
  });

  const activeObservees = validObservees.filter((p) => {
    const sid = p.signup_id!;
    const hasPendingChange = Boolean(findRequestForObservee(p));
    return !confirmedBySignupId[sid] || hasPendingChange;
  });

  const releasedCount = activeObservees.filter((p) =>
    Boolean(releasedAt[p.signup_id!])
  ).length;
  const unreleasedCount = activeObservees.length - releasedCount;
  const pendingChangeCount = activeObservees.filter((p) =>
    Boolean(findRequestForObservee(p))
  ).length;

  const departments = [...new Set(validObservees.map((person) => person.department).filter(Boolean))].sort() as string[];
  const shownDepartment = departments.includes(departmentFilter) ? departmentFilter : "";
  const shownActive = activeObservees.filter(
    (person) => !shownDepartment || person.department === shownDepartment
  );
  const shownConfirmed = confirmedObservees.filter(
    (person) => !shownDepartment || person.department === shownDepartment
  );

  const filteredObservees = activeObservees.filter((person) => {
    const signupId = person.signup_id!;
    if (shownDepartment && person.department !== shownDepartment) return false;
    const isReleased = Boolean(releasedAt[signupId]);
    const isPendingChange = Boolean(findRequestForObservee(person));

    if (matchStatusFilter === "released" && !isReleased) return false;
    if (matchStatusFilter === "unreleased" && isReleased) return false;
    if (matchStatusFilter === "pending_change" && !isPendingChange)
      return false;

    const q = matchSearchQuery.trim().toLowerCase();
    if (!q) return true;

    const candidates = candidateOptions[signupId] ?? [];
    const selectedIds = selectedObservers[signupId] ?? [];
    const assignedNames = candidates
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => c.name.toLowerCase())
      .join(" ");

    const courseText = person.course
      ? `${person.course.department_code} ${person.course.course_number}.${person.course.section} ${person.course.title}`.toLowerCase()
      : "";

    return (
      person.name.toLowerCase().includes(q) ||
      (person.academic_rank ?? "").toLowerCase().includes(q) ||
      courseText.includes(q) ||
      assignedNames.includes(q)
    );
  });

  const selectedPerson =
    filteredObservees.find((p) => p.signup_id === activeSignupId) ??
    filteredObservees[0] ??
    null;

  const showChangeRequestsSection =
    pendingChangeRequests.length > 0 || hadRequestsThisSession;

  return (
    <div className="dashboard-container">
      {/* Top-Left Back Link */}
      <div className="back-dashboard-wrapper">
        <Link to="/committee/dashboard" className="back-dashboard-link">
          ← Back to Dashboard
        </Link>
      </div>

      <h2>Observer Selection and Matching</h2>

      {loadingMatches && (
        <p>Loading faculty and eligible observer candidates...</p>
      )}
      {matchError && (
        <div role="alert" className="yellow-banner">
          {matchError}
        </div>
      )}
      {matchSuccess && (
        <div role="status" className="feedback-banner-success">
          {matchSuccess}
        </div>
      )}

      {/* 1. Course Registration Change Requests */}
      {showChangeRequestsSection && (
        <section className="dashboard-phase a02-section-block">
          <div className="a02-section-header-bar">
            <div className="a02-section-title-group">
              <h3 className="a02-section-heading">
                Course Registration Change Requests
              </h3>
              <span
                className={`status-chip ${
                  pendingChangeRequests.length > 0 ? "a02-chip-warning" : ""
                }`}
              >
                {pendingChangeRequests.length} PENDING
              </span>
            </div>

            {pendingChangeRequests.length > 2 && (
              <input
                type="text"
                className="styled-text-input a02-req-search-input"
                placeholder="Filter requests by professor or course..."
                value={changeReqSearchQuery}
                onChange={(e) => setChangeReqSearchQuery(e.target.value)}
              />
            )}
          </div>

          <div className="table-container theme-orange summary-card-padding">
            {pendingChangeRequests.length === 0 ? (
              <p className="font-slate font-sm a02-zero-margin">
                No pending course registration change requests at this time.
              </p>
            ) : filteredChangeRequests.length === 0 ? (
              <p className="font-slate font-sm a02-zero-margin">
                No change requests match your current search.
              </p>
            ) : (
              <div className="a02-req-stack">
                {filteredChangeRequests.map((req, idx) => {
                  const reqKey = getReqKey(req, idx);
                  const action =
                    resolutionActionByReq[reqKey] ??
                    "approve_and_select_observers";
                  const reassignedId =
                    reassignedCourseByReq[reqKey] ?? req.requested_course_id;
                  const cycle =
                    targetCycleByReq[reqKey] ?? "Next Evaluation Cycle";
                  const note = acNoteByReq[reqKey] ?? "";
                  const isNoteOpen = Boolean(expandedRequestIds[reqKey]);
                  const isProcessingThis = processingRequestId === reqKey;

                  const actionButtonLabel = isProcessingThis
                    ? "Applying..."
                    : action === "approve_and_select_observers"
                    ? "Approve & Select Observers"
                    : action === "approve_keep_observers"
                    ? "Approve & Keep Observers"
                    : action === "reassign_course"
                    ? "Reassign & Select Observers"
                    : action === "transfer_cycle"
                    ? "Transfer to Next Cycle"
                    : "Deny Request";

                  return (
                    <article key={reqKey} className="a02-req-card">
                      <div className="a02-req-card-header">
                        <div className="a02-req-identity">
                          <h4 className="a02-req-prof-name">
                            {req.professor_name || "Faculty Observee"}
                          </h4>
                          <span className="a02-req-course-badge">
                            {req.requested_course_label} · Sec.{" "}
                            {req.requested_section}
                          </span>
                        </div>

                        <div className="a02-req-header-meta">
                          <span className="font-slate font-sm">
                            Submitted{" "}
                            {new Date(req.submitted_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="status-chip a02-chip-warning a02-chip-xs">
                            Pending Review
                          </span>
                        </div>
                      </div>

                      <div className="a02-req-card-body">
                        <div className="a02-req-details-panel">
                          <div className="a02-req-detail-row">
                            <span className="a02-req-detail-label">
                              Schedule
                            </span>
                            <span className="a02-req-detail-val">
                              {req.requested_schedule}
                            </span>
                          </div>

                          <div className="a02-req-detail-row">
                            <span className="a02-req-detail-label">
                              Proposed Dates ({req.requested_dates.length})
                            </span>
                            <div className="a02-req-date-chips">
                              {req.requested_dates.map((d) => (
                                <span key={d} className="a02-date-chip">
                                  {new Date(`${d}T00:00:00`).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>

                          {req.reason && (
                            <div className="a02-req-detail-row">
                              <span className="a02-req-detail-label">
                                Reason
                              </span>
                              <span className="a02-req-detail-val">
                                {req.reason}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="a02-req-controls-panel">
                          <label
                            htmlFor={`action-select-${reqKey}`}
                            className="a02-card-section-label"
                          >
                            Committee Decision
                          </label>

                          <select
                            id={`action-select-${reqKey}`}
                            className="slot-select-input a02-full-select"
                            value={action}
                            onChange={(e) =>
                              setResolutionActionByReq((prev) => ({
                                ...prev,
                                [reqKey]: e.target.value as ResolutionActionType,
                              }))
                            }
                            disabled={isProcessingThis}
                          >
                            <option value="approve_and_select_observers">
                              Approve course &amp; select observers
                            </option>
                            <option value="approve_keep_observers">
                              Approve course &amp; keep current observers
                            </option>
                            <option value="reassign_course">
                              Reassign to different course &amp; select
                              observers
                            </option>
                            <option value="transfer_cycle">
                              Transfer to next evaluation cycle
                            </option>
                            <option value="deny_request">
                              Deny request &amp; keep current course
                            </option>
                          </select>

                          {action === "reassign_course" && (
                            <select
                              aria-label="Select replacement course section"
                              className="slot-select-input a02-full-select"
                              value={reassignedId}
                              onChange={(e) =>
                                setReassignedCourseByReq((prev) => ({
                                  ...prev,
                                  [reqKey]: e.target.value
                                    ? Number(e.target.value)
                                    : "",
                                }))
                              }
                            >
                              <option value="">
                                Select course section...
                              </option>
                              {availableCourses.map((c) => (
                                <option key={c.course_id} value={c.course_id}>
                                  {c.department_code} {c.course_number}.
                                  {c.section}: {c.title} ({c.schedule})
                                </option>
                              ))}
                            </select>
                          )}

                          {action === "transfer_cycle" && (
                            <select
                              aria-label="Select target evaluation cycle"
                              className="slot-select-input a02-full-select"
                              value={cycle}
                              onChange={(e) =>
                                setTargetCycleByReq((prev) => ({
                                  ...prev,
                                  [reqKey]: e.target.value,
                                }))
                              }
                            >
                              <option value="Next Evaluation Cycle">
                                Next Evaluation Cycle
                              </option>
                              <option value="Spring 2027">Spring 2027</option>
                              <option value="Fall 2027">Fall 2027</option>
                              <option value="Spring 2028">Spring 2028</option>
                            </select>
                          )}

                          {isNoteOpen && (
                            <input
                              type="text"
                              className="styled-text-input a02-note-input"
                              placeholder="Optional committee note..."
                              value={note}
                              onChange={(e) =>
                                setAcNoteByReq((prev) => ({
                                  ...prev,
                                  [reqKey]: e.target.value,
                                }))
                              }
                            />
                          )}

                          <div className="a02-req-action-buttons">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() =>
                                void handleResolveChangeRequest(req, reqKey)
                              }
                              disabled={isProcessingThis}
                            >
                              {actionButtonLabel}
                            </button>

                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() =>
                                setExpandedRequestIds((prev) => ({
                                  ...prev,
                                  [reqKey]: !prev[reqKey],
                                }))
                              }
                              disabled={isProcessingThis}
                            >
                              {isNoteOpen ? "Hide Note" : "Add Note"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Manage Course Registrations */}
      <section className="table-container theme-orange summary-card-padding">
        <h3>Manage Course Registrations</h3>
        <p className="status-banner-text">
          <strong>Current Status:</strong>{" "}
          <span
            className={`status-dot ${isOpen ? "dot-green" : "dot-red"}`}
          ></span>{" "}
          {isOpen
            ? "COURSE REGISTRATION CURRENTLY OPEN"
            : "COURSE REGISTRATION CLOSED"}{" "}
          <br />
          <span className="font-slate font-sm">
            (Open from {displayStartDate} until {displayEndDate})
          </span>
        </p>
        <p className="status-banner-text">
          <strong>Next Scheduled Action:</strong>{" "}
          {isOpen
            ? `Course registration closes on ${displayEndDate}`
            : `Course registration closed on ${displayEndDate}`}
        </p>
        <button
          type="button"
          className="btn-secondary button-margin-top"
          onClick={handleOpenModal}
        >
          Edit Course Registration Dates
        </button>
      </section>

      {/* 3. Master-Detail Workspace for Pending / Unconfirmed Observer Lists */}
      <section
        id="a02-match-workspace"
        className="dashboard-phase section-margin-top"
      >
        <h3>Review and Approve Existing Observer-Observee Matched Lists</h3>

        <div className="yellow-banner">
          <strong>NOTE:</strong> Course registration closes on {displayEndDate}.
          <p className="a02-banner-subcopy">
            Select an observee on the left to review, customize, or release
            their assigned observers on the right. Once an observee approves
            their observer match, they move to the locked confirmed section
            below.
          </p>
        </div>

        <div className="table-container theme-blue summary-card-padding">
          {/* Search & Status Filter Toolbar */}
          <div className="a02-match-toolbar a02-toolbar-flush">
            <input
              type="text"
              className="styled-text-input a02-match-search"
              placeholder="Search observee, rank, course, or assigned observer..."
              value={matchSearchQuery}
              onChange={(e) => setMatchSearchQuery(e.target.value)}
            />

            <div className="a02-match-toolbar-actions">
              <select
                aria-label="Filter matched lists by department"
                className="slot-select-input a02-status-filter"
                value={shownDepartment}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select
                aria-label="Filter matched lists by status"
                className="slot-select-input a02-status-filter"
                value={matchStatusFilter}
                onChange={(e) =>
                  setMatchStatusFilter(
                    e.target.value as
                      | "all"
                      | "released"
                      | "unreleased"
                      | "pending_change"
                  )
                }
              >
                <option value="all">All ({activeObservees.length})</option>
                <option value="unreleased">
                  Awaiting Release ({unreleasedCount})
                </option>
                <option value="released">
                  Released / Awaiting Acceptance ({releasedCount})
                </option>
                {pendingChangeCount > 0 && (
                  <option value="pending_change">
                    Change Requests ({pendingChangeCount})
                  </option>
                )}
              </select>

              {matchSearchQuery && (
                <button
                  type="button"
                  className="btn-select-toggle"
                  onClick={() => setMatchSearchQuery("")}
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>

          {shownActive.length === 0 ? (
            <p className="font-slate font-sm a02-zero-margin">
              All active observees have confirmed their observer matches.
            </p>
          ) : filteredObservees.length === 0 ? (
            <p className="font-slate font-sm a02-zero-margin">
              No observee matched lists match your current search or filter.
            </p>
          ) : (
            <div className="a02-split-workspace">
              {/* LEFT COLUMN: Clean Compact Roster */}
              <div className="a02-roster-column">
                <div className="a02-column-header">
                  <span className="a02-column-title">Observee Roster</span>
                  <span className="a02-column-count">
                    {filteredObservees.length} of {activeObservees.length}
                  </span>
                </div>

                <div
                  className="a02-roster-list"
                  role="listbox"
                  aria-label="Observee roster"
                >
                  {filteredObservees.map((person) => {
                    const signupId = person.signup_id!;
                    const selectedIds = selectedObservers[signupId] ?? [];
                    const released = releasedAt[signupId];
                    const hasPendingChange = Boolean(
                      findRequestForObservee(person)
                    );
                    const isSelected =
                      selectedPerson?.signup_id === signupId;

                    return (
                      <button
                        key={signupId}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`a02-roster-row ${
                          isSelected ? "is-active" : ""
                        } ${hasPendingChange ? "has-change" : ""}`}
                        onClick={() => setActiveSignupId(signupId)}
                      >
                        <div className="a02-roster-row-top">
                          <span className="a02-roster-name">{person.name}</span>
                          <span
                            className={`status-chip a02-chip-xs ${
                              released ? "chip-draft" : "chip-locked"
                            }`}
                          >
                            {released
                              ? `Released ${formatDay(released)}`
                              : "Awaiting"}
                          </span>
                        </div>

                        <div className="a02-roster-row-bottom">
                          <span className="a02-roster-meta">
                            {person.course
                              ? `${person.course.department_code} ${person.course.course_number}.${person.course.section}`
                              : "No course"}{" "}
                            · {person.academic_rank} · {selectedIds.length}{" "}
                            selected
                          </span>
                          {hasPendingChange && (
                            <span className="status-chip a02-chip-warning a02-chip-xs">
                              Change Req
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT COLUMN: Streamlined Inspector & Assignment Panel */}
              <div className="a02-inspector-column">
                <div className="a02-column-header">
                  <span className="a02-column-title">
                    Observer Assignment Details
                  </span>
                  {selectedPerson && (
                    <span className="a02-column-count">
                      {selectedPerson.name}
                    </span>
                  )}
                </div>

                {selectedPerson &&
                  (() => {
                    const signupId = selectedPerson.signup_id!;
                    const candidates = candidateOptions[signupId] ?? [];
                    const selectedIds = selectedObservers[signupId] ?? [];
                    const released = releasedAt[signupId];
                    const isUnlocked = Boolean(unlockedSignupIds[signupId]);
                    const isCanEdit = !released || isUnlocked;
                    const transferInfo =
                      transferredObservees[selectedPerson.name.toLowerCase()];
                    const matchingRequest =
                      findRequestForObservee(selectedPerson);

                    const assignedObserverNames = candidates
                      .filter((c) => selectedIds.includes(c.id))
                      .map((c) => c.name);

                    return (
                      <article className="a02-inspector-pane">
                        <div className="a02-inspector-header">
                          <div className="a02-inspector-heading-group">
                            <h4 className="a02-inspector-title">
                              {selectedPerson.name}
                            </h4>
                            <p className="a02-inspector-subtitle">
                              {selectedPerson.academic_rank}
                              {selectedPerson.course
                                ? ` · ${selectedPerson.course.department_code} ${selectedPerson.course.course_number}.${selectedPerson.course.section}: ${selectedPerson.course.title}`
                                : ""}
                            </p>
                            {selectedPerson.course?.schedule && (
                              <p className="a02-inspector-schedule">
                                Schedule: {selectedPerson.course.schedule}
                              </p>
                            )}
                          </div>

                          <span
                            className={`status-chip a02-status-nowrap ${
                              released ? "chip-draft" : "chip-locked"
                            }`}
                          >
                            {released
                              ? `Released ${formatDay(released)}`
                              : "Awaiting Release"}
                          </span>
                        </div>

                        {(matchingRequest || transferInfo) && (
                          <div className="a02-inspector-alerts">
                            {matchingRequest && (
                              <p className="a02-alert-warning-text">
                                Pending Change Request:{" "}
                                {matchingRequest.requested_course_label} (Sec.{" "}
                                {matchingRequest.requested_section})
                              </p>
                            )}
                            {transferInfo && (
                              <p className="a02-alert-info-text">
                                Transferred to{" "}
                                <strong>{transferInfo.target_cycle}</strong>
                                {transferInfo.note
                                  ? `: ${transferInfo.note}`
                                  : ""}
                              </p>
                            )}
                          </div>
                        )}

                        {!isCanEdit ? (
                          <div className="a02-inspector-body">
                            <span className="a02-card-section-label">
                              Released Observers ({assignedObserverNames.length}
                              )
                            </span>
                            {assignedObserverNames.length > 0 ? (
                              <div className="a02-observer-tags">
                                {assignedObserverNames.map((name) => (
                                  <span key={name} className="a02-observer-tag">
                                    <span className="a02-observer-tag-dot" />
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="font-slate font-sm">
                                No observers selected.
                              </p>
                            )}

                            <div className="a02-inspector-footer">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  setUnlockedSignupIds((prev) => ({
                                    ...prev,
                                    [signupId]: true,
                                  }))
                                }
                              >
                                Edit / Reassign Observers
                              </button>
                            </div>
                          </div>
                        ) : candidates.length === 0 ? (
                          <div className="a02-inspector-body">
                            <p className="font-sm font-slate a02-zero-margin">
                              No eligible observer candidates were returned for
                              this course.
                            </p>
                          </div>
                        ) : (
                          <div className="a02-inspector-body">
                            <div className="a02-inspector-list-header">
                              <span className="a02-card-section-label">
                                Eligible Observer Candidates (
                                {selectedIds.length} / 5 selected)
                              </span>
                            </div>

                            <div className="observer-checkbox-list a02-inspector-checklist">
                              {candidates.map((candidate) => (
                                <label
                                  key={candidate.id}
                                  className="checkbox-row-label"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(candidate.id)}
                                    onChange={(event) => {
                                      const updated = event.target.checked
                                        ? [...selectedIds, candidate.id]
                                        : selectedIds.filter(
                                            (id) => id !== candidate.id
                                          );

                                      setSelectedObservers((previous) => ({
                                        ...previous,
                                        [signupId]: updated,
                                      }));
                                    }}
                                    disabled={
                                      savingSignupId === signupId ||
                                      (!selectedIds.includes(candidate.id) &&
                                        selectedIds.length >= 5)
                                    }
                                  />
                                  <span>
                                    {candidate.name}{" "}
                                    {candidate.academic_level && (
                                      <span className="font-slate">
                                        ({candidate.academic_level})
                                      </span>
                                    )}
                                    {candidate.eligible === false && (
                                      <span className="font-slate font-sm" style={{ display: "block" }}>
                                        Not eligible: {candidate.problems?.join(", ")}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              ))}
                            </div>

                            <div className="a02-inspector-footer">
                              {released && isUnlocked && (
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() =>
                                    setUnlockedSignupIds((prev) => ({
                                      ...prev,
                                      [signupId]: false,
                                    }))
                                  }
                                >
                                  Cancel
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() =>
                                  void handleConfirmMatches(
                                    signupId,
                                    selectedPerson.name
                                  )
                                }
                                disabled={
                                  savingSignupId === signupId ||
                                  selectedIds.length === 0
                                }
                              >
                                {savingSignupId === signupId
                                  ? "Releasing..."
                                  : released
                                  ? `Update & Re-release (${selectedIds.length})`
                                  : `Release ${selectedIds.length} Observer(s)`}
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Confirmed Observer Matches (Locked Read-Only Section) */}
      {shownConfirmed.length > 0 && (
        <section className="dashboard-phase section-margin-top">
          <div className="a02-section-header-bar">
            <div className="a02-section-title-group">
              <h3 className="a02-section-heading">
                Confirmed Observer Matches
              </h3>
              <span className="status-chip chip-draft">
                {shownConfirmed.length} CONFIRMED
              </span>
            </div>
          </div>

          <div className="table-container theme-blue summary-card-padding">
            <div className="a02-confirmed-list">
              {shownConfirmed.map((person) => {
                const sid = person.signup_id!;
                const confirmedInfo = confirmedBySignupId[sid];
                const candidates = candidateOptions[sid] ?? [];
                const selectedIds = selectedObservers[sid] ?? [];
                const displayObservers =
                  confirmedInfo?.confirmedObserverNames &&
                  confirmedInfo.confirmedObserverNames.length > 0
                    ? confirmedInfo.confirmedObserverNames
                    : candidates
                        .filter((c) => selectedIds.includes(c.id))
                        .map((c) => c.name);

                return (
                  <div key={sid} className="a02-confirmed-row">
                    <div className="a02-confirmed-main">
                      <div className="a02-confirmed-title-line">
                        <span className="a02-confirmed-name">
                          {person.name}
                        </span>
                        <span className="a02-confirmed-course">
                          {person.course
                            ? `${person.course.department_code} ${person.course.course_number}.${person.course.section}: ${person.course.title}`
                            : person.academic_rank}
                        </span>
                      </div>

                      <div className="a02-confirmed-observers">
                        <span className="a02-confirmed-label">
                          Confirmed Observer
                          {displayObservers.length === 1 ? "" : "s"}:
                        </span>
                        {displayObservers.length > 0 ? (
                          displayObservers.map((obsName) => (
                            <span key={obsName} className="a02-observer-tag">
                              <span className="a02-observer-tag-dot" />
                              {obsName}
                            </span>
                          ))
                        ) : (
                          <span className="font-slate font-sm">Accepted</span>
                        )}
                      </div>
                    </div>

                    <div className="a02-confirmed-meta">
                      <span className="status-chip chip-draft a02-status-nowrap">
                        Match Confirmed
                        {confirmedInfo?.confirmedAt
                          ? ` · ${formatDay(confirmedInfo.confirmedAt)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bottom Centered Return Button */}
      <div className="dashboard-center-action">
        <Link to="/committee/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>

      {/* Date Control Modal Popup */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Evaluation Cycle Dates</h3>
            <p>
              Configure the registration, observation, and process survey
              deadlines for the active evaluation cycle.
            </p>
            <div className="modal-field">
              <label htmlFor="reg-opens">
                Registration opens{" "}
                <span className="modal-fixed-note">(12:00 AM fixed)</span>
              </label>
              <input
                id="reg-opens"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="reg-closes">
                Registration closes{" "}
                <span className="modal-fixed-note">(11:59 PM fixed)</span>
              </label>
              <input
                id="reg-closes"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="observation-deadline">
                Observation Records End
              </label>
              <input
                id="observation-deadline"
                type="date"
                value={observationDeadline}
                onChange={(e) => setObservationDeadline(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="survey-deadline">Process Surveys End</label>
              <input
                id="survey-deadline"
                type="date"
                value={surveyDeadline}
                onChange={(e) => setSurveyDeadline(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={handleCloseModal}
              >
                Close
              </button>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => void handleSaveDates()}
                disabled={savingDates}
              >
                {savingDates ? "Saving..." : "Save Dates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}