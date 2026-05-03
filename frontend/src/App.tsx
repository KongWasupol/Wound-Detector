import { useEffect } from "react";
import type { ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { AuthPanel } from "./components/AuthPanel.tsx";
import { DetailPage } from "./pages/DetailPage.tsx";
import { PatientDashboard } from "./pages/PatientDashboard.tsx";
import { DoctorDashboard } from "./pages/DoctorDashboard.tsx";
import { RoleSelectionPage } from "./pages/RoleSelectionPage.tsx";
import { NotificationToast } from "./components/NotificationToast.tsx";

// Role-based dashboard redirect
const RoleBasedDashboard = () => {
  const { user } = useAuth();
  // const preferredMode = localStorage.getItem("wound-preferred-mode");

  const isDual = user?.roles?.includes("patient") && user?.roles?.includes("doctor");

  if (isDual) {
    // For dual users, ALWAYS show selection at index path (as requested)
    // regardless of preference, because "switch button will in index path"
    return <RoleSelectionPage />;
  }

  // Fallback for single role users
  if (user?.roles?.includes("doctor") || user?.role === "doctor") {
    return <Navigate to="/doctor-dashboard" replace />;
  }
  
  return <PatientDashboard />;
};

const Shell = () => {
  const { token } = useAuth();
  return (
    <div className="shell">
      <div className="glow one" />
      <div className="glow two" />
      <NotificationToast />
      {token ? <RoleBasedDashboard /> : <AuthPanel />}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <Router basename="/wound-detector">
      <Routes>
        <Route path="/" element={<Shell />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/analysis/:id" element={<ProtectedRoute><DetailPage /></ProtectedRoute>} />
        <Route path="/patient-dashboard" element={<ProtectedRoute requiredRole="patient"><PatientDashboard /></ProtectedRoute>} />
        <Route path="/doctor-dashboard" element={<ProtectedRoute requiredRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </AuthProvider>
);

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'patient' | 'doctor';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { token, user } = useAuth();
  
  if (!token) {
    return <Shell />;
  }

  // If role required, check if user has correct role
  if (requiredRole) {
    const hasRole = 
      (user?.roles && user.roles.includes(requiredRole)) || 
      user?.role === requiredRole;
      
    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

const AuthCallback = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  return <div className="loading">Verifying authentication...</div>;
};

export default App;
