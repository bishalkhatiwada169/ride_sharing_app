import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/drivers", label: "Drivers" },
  { to: "/rides", label: "Live rides" },
  { to: "/pricing", label: "Pricing" },
  { to: "/payments", label: "Payments" },
  { to: "/safety", label: "Safety" },
  { to: "/support", label: "Support" },
  { to: "/audit", label: "Audit logs" },
];

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--color-line)] bg-[var(--color-ink)] text-[var(--color-mist)] lg:border-b-0 lg:border-r lg:border-[var(--color-ink-soft)]">
        <div className="px-6 py-7">
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white">
            Ride
          </p>
          <p className="mt-1 text-sm text-[var(--color-line)]">Operations console</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-mist)] hover:bg-[var(--color-ink-soft)]",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-white/70 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm text-[var(--color-ink-soft)]/70">Signed in</p>
            <p className="font-medium">{user?.displayName ?? user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-mist)]"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
