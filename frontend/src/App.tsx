import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SplashScreen from "./pages/SplashScreen";
import LandingPage from "./pages/LandingPage";
import AboutPage from "./pages/AboutPage";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFoundPage from "./pages/NotFoundPage";
import { useStore } from "./store/useStore";
import ErrorBoundary from "./components/ErrorBoundary";
import { initAnalytics } from "./lib/analytics";
import { auth } from "./lib/firebase";

// Route guards to protect the workspace dashboard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user, initializeAuth, isLoadingUser } = useStore();

  React.useEffect(() => {
    initAnalytics();
    console.log("[App] Initializing auth state listener...");
    const unsubscribe = initializeAuth();
    
    // Set up a token refresh interval to preemptively refresh tokens
    // before they expire (e.g., every 50 minutes)
    const refreshInterval = setInterval(async () => {
      if (user) {
        console.log("[App] Preemptively refreshing token...");
        try {
          // Firebase automatically handles token caching/refreshing
          // when getIdToken(true) is called.
          await auth.currentUser?.getIdToken(true);
        } catch (error) {
          console.error("[App] Token refresh failed:", error);
        }
      }
    }, 50 * 60 * 1000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [initializeAuth, user]);

  if (isLoadingUser) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Redirect root based on auth state after splash initialization */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/landing" replace />} />

        {/* Auth Layout Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />

        {/* Dashboard workspace layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* System Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Landing/Marketing Layout Pages (Wrapped in Navbar + Footer) */}
        <Route
          path="/landing"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="grow">
                <LandingPage />
              </div>
              <Footer />
            </div>
          }
        />
        <Route
          path="/about"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="grow">
                <AboutPage />
              </div>
              <Footer />
            </div>
          }
        />
        <Route
          path="/pricing"
          element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <div className="grow">
                <PricingPage />
              </div>
              <Footer />
            </div>
          }
        />

        {/* Fallbacks */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
