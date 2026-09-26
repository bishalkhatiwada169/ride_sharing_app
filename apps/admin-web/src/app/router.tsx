import { Navigate, Outlet, Route, Routes, Link } from "react-router-dom";
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
import { DownloadsPage } from "@/pages/DownloadsPage";
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

function PublicDownloadsLayout() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-white/80 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <Link
          to="/login"
          className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--color-ink)]"
        >
          Ride
        </Link>
        <Link
          to="/login"
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-mist)]"
        >
          Admin sign in
        </Link>
      </header>
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

/** Guests get a public install chrome; signed-in admins stay in the ops shell. */
function DownloadsLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) {
    return <AppShell />;
  }
  return <PublicDownloadsLayout />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<DownloadsLayout />}>
        <Route path="/downloads" element={<DownloadsPage />} />
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
