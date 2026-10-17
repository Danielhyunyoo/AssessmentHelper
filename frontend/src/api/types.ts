export type Id = number;
export type IsoDate = string;
export type EvaluationStatus = "due" | "overdue" | "not_due" | "undetermined" | string;
export interface ApiErrorPayload { detail?: string; [field: string]: unknown }
export interface Professor { id: Id; username: string; first_name: string; last_name: string; role: string; academic_level: string }
export interface Course { course_id: Id; department_id: Id; department_name: string; department_code: string; instructor_id: Id; course_number: string; course_level: number; section: string; schedule: string; title?: string; classroom?: string }
export interface Signup { signup_id: Id; cycle_id: Id; course_id: Id | null; status: string; availability: string }
export interface RegistrationStatus { cycle_id: Id; cycle_name: string; signup_deadline: IsoDate; observation_deadline: IsoDate; survey_deadline: IsoDate; is_registered: boolean; has_selected_course: boolean; selected_course_id: Id|null }
export interface Availability { available: boolean; reason: string|null }
export interface FacultyDashboard { cycle: { id: Id; name: string; signup_deadline: IsoDate; observation_deadline: IsoDate; survey_deadline: IsoDate }; evaluation_status: EvaluationStatus; evaluation_status_reason: string; evaluation_status_details?: Record<string,unknown>; is_registered: boolean; has_selected_course: boolean; selected_course: Course|null; unread_notifications: number; incoming_requests: number; modules: Record<string, Availability> }
export interface ProfileResponse { professor: Professor; evaluation_cycle: string; evaluation_status: EvaluationStatus; evaluation_status_details?: Record<string, unknown>; registration_status: string; selected_course: Course|null }
export interface Notification { notification_id: Id; title: string; message: string; type: string; is_urgent: boolean; is_read: boolean; created_at: IsoDate; destination: string }
export interface NotificationsResponse { unread_count: number; notifications: Notification[] }
export interface Candidate { id: Id; name: string; department: string|null; academic_level: string }
export interface MatchesResponse { released: boolean; fewer_than_five?: boolean; candidates: Candidate[]; warning?: string }
export interface ProposedDate { proposed_date_id: Id; datetime: IsoDate; status: string }
export interface Invitation { invitation_id: Id; cycle_id: Id; sender_id: Id; recipient_id: Id; course_id: Id; status: string; created_at: IsoDate; expires_at: IsoDate|null; responded_at: IsoDate|null; proposed_dates: ProposedDate[] }
export interface FormQuestion { id: string; text: string; type: "rating"|"text"; required: boolean; min?: number; max?: number; section?: string; order?: number }
export interface Template { template_id: Id; name: string; type: "observation"|"survey"; version: number; status: string; instructions: string; questions: FormQuestion[]; used_by_records?: boolean; can_edit?: boolean; can_publish?: boolean }
export interface ObservationRecord { observation_id: Id; pairing_id: Id; cycle_id: Id; observer: {id: Id; name: string}; observee: {id: Id; name: string}; course: Course; confirmed_datetime: IsoDate|null; template: {id: Id; name: string; version: number; instructions: string; questions: FormQuestion[]}; responses: Record<string, string|number>; status: string; cancellation_reason: string; observer_signed: boolean; observer_signed_at: IsoDate|null; observee_signed: boolean; observee_signed_at: IsoDate|null; locked: boolean; can_edit: boolean; can_sign: boolean; can_cancel: boolean }
export interface Survey { survey_id: Id; pairing_id: Id; cycle_id: Id; respondent_id: Id; respondent_type: "observer"|"observee"; observer: {id: Id; name: string}; observee: {id: Id; name: string}; course: Course; observation_datetime: IsoDate|null; template: {id:Id; name:string; version:number; instructions:string; questions:FormQuestion[]}|null; score: number|null; pain_points: string; improvements: string; survey_file: string; submitted_at: IsoDate|null; status: string }
export interface FacultyRow { user_id: Id; username: string; name: string; department: string|null; department_id: Id|null; academic_rank: string; email: string; evaluation_status: EvaluationStatus; registered: boolean; progress_status: string; signup_id: Id|null; course: Course|null }
export interface FacultyRoster { cycle_id: Id; cycle_name: string; count: number; registered_count: number; course_selected_count: number; faculty: FacultyRow[] }
export type JsonObject = Record<string, unknown>;
