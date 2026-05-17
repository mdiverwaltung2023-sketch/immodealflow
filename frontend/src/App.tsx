import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import MainLayout    from "@/layouts/MainLayout";
import LoginPage     from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import InvoicesPage  from "@/pages/InvoicesPage";
import SuppliersPage from "@/pages/SuppliersPage";
import UploadPage    from "@/pages/UploadPage";
import SettingsPage  from "@/pages/SettingsPage";

// ── Guard: redirect to /login when no token is present ────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected – wrapped in MainLayout */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/"          element={<DashboardPage  />} />
            <Route path="/invoices"  element={<InvoicesPage   />} />
            <Route path="/suppliers" element={<SuppliersPage  />} />
            <Route path="/upload"    element={<UploadPage     />} />
            <Route path="/settings"  element={<SettingsPage   />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
