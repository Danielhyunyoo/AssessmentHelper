// src/App.tsx
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import Layout from "./components/Layout";
import { authApi, facultyApi } from "./api/endpoints";
import { isUserTransferredToNextCycle } from "./pages/committee/A02FacultyMatching";

// PAGES FOR DEMO
import L01Home from "./pages/login/L01Home";
import L02SignIn from "./pages/login/L02SignIn";
import L03SignIn2 from "./pages/login/L03SignIn2";
import S01FacultyDashboard from "./pages/shared/S01FacultyDashboard";
import S02Profile from "./pages/shared/S02Profile";
import S03FacultyNotifications from "./pages/shared/S03FacultyNotifications";
import S04CurrentAndPastObservations from "./pages/shared/S04CurrentAndPastObservations";
import S05ObservationRecord from "./pages/shared/S05ObservationRecord";
import S06PostEvaluationSurvey from "./pages/shared/S06PostEvaluationSurvey";
import S07ContactCommittee from "./pages/shared/S07ContactCommittee";
import E01CourseSelection from "./pages/observee/E01CourseSelection";
import E02ObserverSelection from "./pages/observee/E02ObserverSelection";
import O01ObservationRequest from "./pages/observer/O01ObservationRequest";
import A01CommitteeDashboard from "./pages/committee/A01CommitteeDashboard";
import A02FacultyMatching from "./pages/committee/A02FacultyMatching";
import A03UnmatchedObservees from "./pages/committee/A03UnmatchedObservees";
import A04FacultyRoster from "./pages/committee/A04FacultyRoster";
import A05PendingRecords from "./pages/committee/A05PendingRecords";
import A06SurveyTracking from "./pages/committee/A06SurveyTracking";
import A07KPIOverview from "./pages/committee/A07KPIOverview";
import A08FormEditor from "./pages/committee/A08FormEditor";

const UNREGISTERED_ALLOWED_PATHS = [
  "/login/signin2",
  "/shared/profile",
  "/shared/current-past-observations",
  "/shared/contact-committee",
  "/shared/notifications",
  "/observer/observation-request",
];

function RegistrationGate() {
  const location = useLocation();
  const [status, setStatus] = useState<
    "checking" | "allowed" | "redirect_l03" | "redirect_signin"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const { professor } = await authApi.session();
        if (cancelled) return;

        if (!professor) {
          setStatus("redirect_signin");
          return;
        }

        // Committee members have full portal access
        if (professor.role === "admin") {
          setStatus("allowed");
          return;
        }

        const reg = await facultyApi.registrationStatus();
        if (cancelled) return;

        const isTransferred = isUserTransferredToNextCycle(professor, reg);

        if (reg.is_registered && !isTransferred) {
          setStatus("allowed");
          return;
        }

        const isRecordDetail = location.pathname.startsWith(
          "/shared/observation-record/"
        );
        const isSurveyDetail = location.pathname.startsWith(
          "/shared/post-evaluation-survey"
        );
        const isAllowedPath =
          UNREGISTERED_ALLOWED_PATHS.includes(location.pathname) ||
          isRecordDetail ||
          isSurveyDetail;

        setStatus(isAllowedPath ? "allowed" : "redirect_l03");
      } catch {
        if (!cancelled) {
          setStatus("redirect_signin");
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <div className="dashboard-container">
        <div className="a07-state-box">Verifying cycle access...</div>
      </div>
    );
  }

  if (status === "redirect_signin") {
    return (
      <Navigate
        to="/login/signin"
        replace
        state={{ redirectTo: location.pathname }}
      />
    );
  }

  if (status === "redirect_l03") {
    return <Navigate to="/login/signin2" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Parent Route with Layout (Header -> Main/Outlet -> Footer -> Navigation Helper) */}
        <Route element={<Layout />}>
          {/* Public / Sign-In Routes (Home is accessible at all times) */}
          <Route path="/" element={<L01Home />} />
          <Route path="/login/signin" element={<L02SignIn />} />

          {/* Protected Routes (Enforces L03 Gate for Unregistered / Transferred Faculty) */}
          <Route element={<RegistrationGate />}>
            <Route path="/login/signin2" element={<L03SignIn2 />} />

            {/* Shared Section */}
            <Route
              path="/shared/faculty-dashboard"
              element={<S01FacultyDashboard />}
            />
            <Route path="/shared/profile" element={<S02Profile />} />
            <Route
              path="/shared/notifications"
              element={<S03FacultyNotifications />}
            />
            <Route
              path="/shared/current-past-observations"
              element={<S04CurrentAndPastObservations />}
            />
            <Route
              path="/shared/observation-record/:observationId"
              element={<S05ObservationRecord />}
            />
            <Route
              path="/shared/post-evaluation-survey/:surveyId?"
              element={<S06PostEvaluationSurvey />}
            />
            <Route
              path="/shared/contact-committee"
              element={<S07ContactCommittee />}
            />

            {/* Observee Section */}
            <Route
              path="/observee/course-selection"
              element={<E01CourseSelection />}
            />
            <Route
              path="/observee/observer-selection"
              element={<E02ObserverSelection />}
            />

            {/* Observer Section */}
            <Route
              path="/observer/observation-request"
              element={<O01ObservationRequest />}
            />

            {/* Assessment Committee Section */}
            <Route
              path="/committee/dashboard"
              element={<A01CommitteeDashboard />}
            />
            <Route
              path="/committee/faculty-matching"
              element={<A02FacultyMatching />}
            />
            <Route
              path="/committee/unmatched-observees"
              element={<A03UnmatchedObservees />}
            />
            <Route
              path="/committee/faculty-roster"
              element={<A04FacultyRoster />}
            />
            <Route
              path="/committee/pending-records"
              element={<A05PendingRecords />}
            />
            <Route
              path="/committee/survey-tracking"
              element={<A06SurveyTracking />}
            />
            <Route
              path="/committee/kpi-overview"
              element={<A07KPIOverview />}
            />
            <Route path="/committee/form-editor" element={<A08FormEditor />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}