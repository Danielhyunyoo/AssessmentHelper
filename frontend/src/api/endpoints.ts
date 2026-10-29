import { get, patch, post, qs } from "./http";
import type { Course, CycleDates, FacultyDashboard, FacultyRoster, Invitation, JsonObject, MatchesResponse, Notification, NotificationsResponse, ObservationRecord, Professor, ProfileResponse, RegistrationStatus, Signup, SignupAvailability, Survey, Template } from "./types";

// L02-L03
export const authApi = {
  csrf: () => get<{detail:string}>("/auth/csrf/"),
  login: (username: string, password: string) => post<{professor:Professor}>("/auth/login/", {username, password}),
  logout: () => post<{detail:string}>("/auth/logout/"),
  session: () => get<{professor:Professor|null}>("/auth/session/"),
};
// L01-L03, S01-S03, E01
export const facultyApi = {
  profile: () => get<ProfileResponse>("/me/"),
  courses: () => get<Course[]>("/me/courses/"),
  dashboard: () => get<FacultyDashboard>("/dashboard/"),
  registrationStatus: () => get<RegistrationStatus>("/registration/status/"),
  register: (course_id?: number) => post<Signup>("/signups/", course_id === undefined ? {} : { course_id }),
  selectCourse: (course_id: number) => patch<Signup>("/signups/course/", { course_id }),
  availability: () => get<SignupAvailability>("/signups/availability/"),
  saveAvailability: (available_datetimes: string[]) => patch<SignupAvailability>("/signups/availability/", { available_datetimes }),
  notifications: () => get<NotificationsResponse>("/notifications/"),
  markRead: (notificationId: number) => patch<Notification>(`/notifications/${notificationId}/read/`, {}),
  markAllRead: () => post<{updated_count:number;unread_count:number}>("/notifications/read-all/"),
};
// E02, O02, observer profiles
export const matchingApi = {
  matches: () => get<MatchesResponse>("/matches/"),
  sentInvitations: () => get<Invitation[]>("/invitations/"),
  incomingInvitations: () => get<Invitation[]>("/invitations/received/"),
  sendInvitation: (observer_id: number, proposed_datetimes: string[]) => post<Invitation>("/invitations/send/", {observer_id, proposed_datetimes}),
  respond: (invitationId: number, action: "accept"|"decline", proposed_date_id?: number) => post<Invitation>(`/invitations/${invitationId}/respond/`, {action, ...(proposed_date_id ? {proposed_date_id} : {})}),
  confirmPairing: (invitation_id: number) => post<{pairing_id:number;observer_id:number;course_id:number;confirmed_datetime:string}>("/pairings/confirm/", {invitation_id}),
};
// E03-E05, O03-O04
export const observationApi = {
  list: () => get<ObservationRecord[]>("/observations/"),
  create: (pairing_id: number, template_id: number) => post<ObservationRecord>("/observations/", {pairing_id,template_id}),
  detail: (id: number) => get<ObservationRecord>(`/observations/${id}/`),
  saveDraft: (id: number, responses: Record<string,number|string>) => patch<ObservationRecord>(`/observations/${id}/`, {responses}),
  sign: (id: number) => post<ObservationRecord>(`/observations/${id}/sign/`),
  cancel: (id: number, reason: string) => post<ObservationRecord>(`/observations/${id}/cancel/`, {reason}),
};
export const surveyApi = {
  list: () => get<Survey[]>("/surveys/"),
  detail: (id: number) => get<Survey>(`/surveys/${id}/`),
  submit: (body: {pairing_id:number;template_id:number;score:number;pain_points?:string;improvements?:string}) => post<Survey>("/surveys/",body),
};
// A01-A08
export const committeeApi = {
  dashboard: () => get<JsonObject>("/committee/dashboard/"),
  faculty: (opts: {search?:string;sort?:"name"|"department"|"rank"|"status"}={}) => get<FacultyRoster>(`/committee/faculty/${qs(opts)}`),
  unregistered: (opts: {search?:string;sort?:"name"|"department"|"rank"|"status"}={}) => get<{cycle_id:number;count:number;faculty:FacultyRoster["faculty"]}>(`/committee/faculty/unregistered/${qs(opts)}`),
  updateRank: (id:number,academic_rank:string) => patch<JsonObject>(`/committee/faculty/${id}/rank/`,{academic_rank}),
  remindRegistration: (user_ids:number[]) => post<JsonObject>("/committee/faculty/remind/",{user_ids}),
  cycleDates: () => get<CycleDates>("/committee/cycle-dates/"),
  updateCycleDates: (dates: Partial<CycleDates>) => patch<CycleDates>("/committee/cycle-dates/", dates),
  candidatePool: (signupId:number) => get<JsonObject>(`/committee/signups/${signupId}/candidate-pool/`),
  releaseCandidates: (signupId:number,observer_ids:number[]) => post<JsonObject>(`/committee/signups/${signupId}/release-candidates/`,{observer_ids}),
  unmatched: () => get<JsonObject>("/committee/unmatched/"),
  carryForwards: () => get<JsonObject>("/committee/carry-forwards/"),
  carryForward: (signup_ids:number[],target_cycle_id:number,reason:string) => post<JsonObject>("/committee/carry-forwards/create/",{signup_ids,target_cycle_id,reason}),
  carriedForwardDue: (cycleId:number) => get<JsonObject>(`/committee/carry-forwards/due/${qs({cycle_id:cycleId})}`),
  pendingRecords: () => get<JsonObject>("/committee/pending-records/"),
  remindRecord: (pairingId:number) => post<JsonObject>(`/committee/pending-records/${pairingId}/remind/`),
  pendingSurveys: () => get<JsonObject>("/committee/pending-surveys/"),
  remindSurvey: (pairingId:number,role:"observer"|"observee") => post<JsonObject>(`/committee/pending-surveys/${pairingId}/${role}/remind/`),
  kpis: (cycleId?:number) => get<JsonObject>(`/committee/kpis/${qs({cycle_id:cycleId})}`),
  templates: (type?:"observation"|"survey") => get<{templates:Template[]}>(`/committee/templates/${qs({type})}`),
  template: (id:number) => get<Template>(`/committee/templates/${id}/`),
  createTemplate: (body:{name:string;type:"observation"|"survey";instructions?:string;questions?:Template["questions"]}) => post<Template>("/committee/templates/",body),
  editTemplate: (id:number,body:{instructions?:string;questions?:Template["questions"]}) => patch<Template>(`/committee/templates/${id}/`,body),
  cloneTemplate: (id:number) => post<Template>(`/committee/templates/${id}/clone/`),
  publishTemplate: (id:number) => post<Template>(`/committee/templates/${id}/publish/`),
};
