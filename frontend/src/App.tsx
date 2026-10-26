// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

//PAGES FOR THIS WEEK'S DEMO
import L01Home from "./pages/login/L01Home";
import L02SignIn from "./pages/login/L02SignIn";
import L03SignIn2 from "./pages/login/L03SignIn2";
import S01FacultyDashboard from "./pages/shared/S01FacultyDashboard";
import S02Profile from "./pages/shared/S02Profile";
import S03FacultyNotifications from "./pages/shared/S03FacultyNotifications";
import S04CurrentAndPastObservations from "./pages/shared/S04CurrentAndPastObservations";
import E01CourseSelection from "./pages/observee/E01CourseSelection";
import E02ObserverSelection from "./pages/observee/E02ObserverSelection";
import A01CommitteeDashboard from "./pages/committee/A01CommitteeDashboard";
import A02FacultyMatching from "./pages/committee/A02FacultyMatching";
import A03UnmatchedObservees from "./pages/committee/A03UnmatchedObservees";

// Temporary fallback component for pages not yet coded
function PlaceholderPage() {
  return (
    <div>
      <h2>Page Under Construction</h2>
      <p>This page wireframe is connected and ready to be coded!</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Parent Route with Layout (Header -> Main/Outlet -> Footer -> Navigation Helper) */}
        <Route element={<Layout />}>
          
          {/* Login Section */}
          <Route path="/" element={<L01Home />} />
          <Route path="/login/signin" element={<L02SignIn />} />
          <Route path="/login/signin2" element={<L03SignIn2 />} />

          {/* Shared Section */}
          <Route path="/shared/faculty-dashboard" element={<S01FacultyDashboard />} />
          <Route path="/shared/profile" element={<S02Profile />} />
          <Route path="/shared/notifications" element={<S03FacultyNotifications />} />
          <Route path="/shared/current-past-observations" element={<S04CurrentAndPastObservations />} />

          {/* Observee Section */}
          <Route path="/observee/course-selection" element={<E01CourseSelection />} />
          <Route path="/observee/observer-selection" element={<E02ObserverSelection />} />
          <Route path="/observee/observation-record" element={<PlaceholderPage />} />
          <Route path="/observee/post-evaluation-survey" element={<PlaceholderPage />} />
          <Route path="/observee/current-past-observations" element={<PlaceholderPage />} />

          {/* Observer Section */}
          <Route path="/observer/active-observations" element={<PlaceholderPage />} />
          <Route path="/observer/observation-request" element={<PlaceholderPage />} />
          <Route path="/observer/observation-record-observer" element={<PlaceholderPage />} />
          <Route path="/observer/post-evaluation-survey" element={<PlaceholderPage />} />

          {/* Assessment Committee Section */}
          <Route path="/committee/dashboard" element={<A01CommitteeDashboard />} />
          <Route path="/committee/faculty-matching" element={<A02FacultyMatching />} />
          <Route path="/committee/unmatched-observees" element={<A03UnmatchedObservees />} />
          <Route path="/committee/faculty-roster" element={<PlaceholderPage />} />
          <Route path="/committee/pending-records" element={<PlaceholderPage />} />
          <Route path="/committee/survey-tracking" element={<PlaceholderPage />} />
          <Route path="/committee/kpi-overview" element={<PlaceholderPage />} />
          <Route path="/committee/form-editor" element={<PlaceholderPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}