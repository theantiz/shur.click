import { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Skeleton from "./components/Skeleton";
import Seo from "./components/Seo";

const Home = lazy(() => import("./pages/Home.tsx"));
const TrackPage = lazy(() => import("./components/TrackPage"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Signup = lazy(() => import("./pages/Signup.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ForgotPasswordOtp = lazy(() => import("./pages/ForgotPasswordOtp.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const License = lazy(() => import("./pages/License.tsx"));
const Feedback = lazy(() => import("./pages/Feedback.tsx"));
const RedirectHandler = lazy(() => import("./components/RedirectHandler"));

function isLoggedIn() {
  return Boolean(localStorage.getItem("token"));
}

function PublicHome() {
  if (isLoggedIn()) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Home />;
}

function PublicAuthRoute({ children }: { children: React.ReactElement }) {
  if (isLoggedIn()) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
}

function RoutedApp() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  return (
    <div
      key={`${location.pathname}${location.search}${location.hash}`}
      className="route-enter min-w-0"
    >
      <Seo />
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/track" element={<TrackPage />} />
        <Route
          path="/auth/login"
          element={
            <PublicAuthRoute>
              <Login />
            </PublicAuthRoute>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <PublicAuthRoute>
              <Signup />
            </PublicAuthRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route
          path="/signup"
          element={<Navigate to="/auth/signup" replace />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password-otp" element={<ForgotPasswordOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/user/dashboard" element={<Dashboard />} />
        <Route
          path="/dashboard"
          element={<Navigate to="/user/dashboard" replace />}
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/license" element={<License />} />
        <Route path="/feedback" element={<Feedback />} />
        {/* Catch-all for short codes (3-20 chars). Placed last to avoid shadowing other routes. */}
        <Route path="/:code" element={<RedirectHandler />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="app-shell min-h-screen px-4 py-8 sm:px-6">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="mt-3 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-6 h-10 w-36 rounded-full" />
              </div>
            </div>
          </div>
        }
      >
        <RoutedApp />
      </Suspense>
    </BrowserRouter>
  );
}
