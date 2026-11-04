import type { FacultyDashboard, NotificationsResponse, Course } from "../api/types";
// Explicitly fake, for UI development only. Never treat these objects as database facts.
export const mockCourses: Course[] = [{course_id:3,department_id:1,department_name:"Computer Science",department_code:"CS",instructor_id:2,course_number:"3345",course_level:3000,section:"001",schedule:"MWF 11:00-11:50",title:"Data Structures",classroom:"Demo room"}];
export const mockDashboard: FacultyDashboard = {
 cycle:{id:1,name:"Fall 2026 (mock)",signup_deadline:"2026-10-30",observation_deadline:"2026-11-30",survey_deadline:"2026-12-10"},
 evaluation_status:"undetermined",evaluation_status_reason:"Mock data has no verified evaluation history.",
 is_registered:true,has_selected_course:true,selected_course:mockCourses[0],unread_notifications:1,incoming_requests:0,
 modules:{course_selection:{available:true,reason:null},observer_selection:{available:false,reason:"Demo: committee approval required"},observation_record:{available:true,reason:null},survey:{available:false,reason:"Demo: signatures required"}}
};
export const mockNotifications: NotificationsResponse = {unread_count:1,notifications:[{notification_id:901,title:"Demo notification",message:"This is mock data.",type:"system",is_urgent:false,is_read:false,created_at:"2026-10-17T12:00:00-05:00",destination:"/dashboard"}]};
