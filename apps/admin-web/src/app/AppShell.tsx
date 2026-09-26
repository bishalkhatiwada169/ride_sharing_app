import { useEffect, useId, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MapPinned,
  Tags,
  Wallet,
  ShieldAlert,
  LifeBuoy,
  ScrollText,
  Download,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/drivers", label: "Drivers", icon: Users },
  { to: "/rides", label: "Live rides", icon: MapPinned },
  { to: "/pricing", label: "Pricing", icon: Tags },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/safety", label: "Safety", icon: ShieldAlert },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/audit", label: "Audit logs", icon: ScrollText },
  { to: "/downloads", label: "App downloads", icon: Download },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-mist)] hover:bg-[var(--color-ink-soft)]",
              )
            }
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </>
  );
}

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-ink-soft)] bg-[var(--color-ink)] px-4 py-3 lg:hidden">
        <p className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight text-white">
          Ride
        </p>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg text-white hover:bg-[var(--color-ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Menu className="size-5" aria-hidden />
          )}
        </button>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--color-ink)]/50 lg:hidden"
          aria-label="Dismiss menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer — not in a11y tree when closed (display:none) */}
      <div
        id={menuId}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--color-ink-soft)] bg-[var(--color-ink)] text-[var(--color-mist)] lg:hidden",
          menuOpen ? "translate-x-0" : "hidden",
        )}
      >
        <div className="px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-2xl text-white">
            Menu
          </p>
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4"
          aria-label="Operations"
        >
          <NavItems onNavigate={() => setMenuOpen(false)} />
        </nav>
      </div>

      {/* Desktop rail */}
      <aside className="hidden border-r border-[var(--color-ink-soft)] bg-[var(--color-ink)] text-[var(--color-mist)] lg:flex lg:flex-col">
        <div className="px-6 py-7">
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-white">
            Ride
          </p>
          <p className="mt-1 text-sm text-[var(--color-line)]">
            Operations console
          </p>
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4"
          aria-label="Operations"
        >
          <NavItems />
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-white/70 px-4 py-2.5 backdrop-blur sm:px-6 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              <span className="sr-only">Signed in as </span>
              {user?.displayName ?? user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-mist)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            <span>Sign out</span>
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
