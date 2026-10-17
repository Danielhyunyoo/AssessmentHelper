import { useEffect, useState } from "react";
import { facultyApi } from "./api/endpoints";
import { ApiError, getDemoUsername, isMockMode, setDemoUsername } from "./api/http";
import type { FacultyDashboard, NotificationsResponse } from "./api/types";
import { mockDashboard, mockNotifications } from "./mock/data";

export default function App() {
 const [who,setWho] = useState(getDemoUsername());
 const [dashboard,setDashboard] = useState<FacultyDashboard|null>(null);
 const [notifications,setNotifications] = useState<NotificationsResponse|null>(null);
 const [error,setError] = useState("");
 const [loading,setLoading] = useState(false);
 async function load() {
   setLoading(true);setError("");
   try {
    const [d,n] = isMockMode() ? [mockDashboard,mockNotifications] : await Promise.all([facultyApi.dashboard(),facultyApi.notifications()]);
    setDashboard(d);setNotifications(n);
   } catch(e) {setError(e instanceof ApiError ? `HTTP ${e.status}: ${e.message}` : String(e));}
   finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 return <main className="container">
 <h1>Assessment Helper — Integration Starter</h1>
 <p>This is a working integration example, <strong>not</strong> the final page designs. It verifies that React can display backend data.</p>
 <div className="toolbar"><label>Local demo user <select value={who} onChange={e=>{setWho(e.target.value);setDemoUsername(e.target.value);}} disabled={isMockMode()}>
 <option value="faculty_alice">faculty_alice</option><option value="faculty_bob">faculty_bob</option><option value="faculty_carol">faculty_carol</option><option value="committee_demo">committee_demo</option>
 </select></label><button onClick={()=>void load()} disabled={loading}>{loading?"Loading…":"Reload data"}</button><span>{isMockMode()?"MOCK mode":"DJANGO mode"}</span></div>
 {error && <p role="alert" className="error">{error}</p>}
 {dashboard && <section><h2>Faculty Dashboard (S01)</h2><p>Cycle: <strong>{dashboard.cycle.name}</strong> · Evaluation: <strong>{dashboard.evaluation_status}</strong></p>
 <p>Course: {dashboard.selected_course ? `${dashboard.selected_course.department_code} ${dashboard.selected_course.course_number}.${dashboard.selected_course.section}` : "Not selected"}</p>
 <p>Unread notifications: {dashboard.unread_notifications} · Incoming requests: {dashboard.incoming_requests}</p>
 <h3>Modules</h3><ul>{Object.entries(dashboard.modules).map(([key,value])=><li key={key}>{key}: {value.available?"Available":value.reason||"Unavailable"}</li>)}</ul></section>}
 {notifications && <section><h2>Notifications (S03)</h2><p>Unread: {notifications.unread_count}</p><ul>{notifications.notifications.map(n=><li key={n.notification_id}><strong>{n.title}</strong>: {n.message} {n.is_read?"(read)":"(unread)"}</li>)}</ul></section>}
 <p className="footer">Use src/api/endpoints.ts for the rest of the 23 pages. See docs/PAGE_MAPPING.md for each page's functions.</p>
 </main>;
}
