import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DriversPage } from "@/pages/DriversPage";
import { LiveRidesPage } from "@/pages/LiveRidesPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { SafetyPage } from "@/pages/SafetyPage";
import { PricingPage } from "@/pages/PricingPage";
import { AuditPage } from "@/pages/AuditPage";
import { SupportPage } from "@/pages/SupportPage";
import { useAuthStore } from "@/stores/auth-store";

function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function PublicOnlyRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="rides" element={<LiveRidesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
