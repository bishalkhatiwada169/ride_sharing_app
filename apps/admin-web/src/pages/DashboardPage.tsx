import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";

type Dashboard = {
  liveRides: number;
  onlineDrivers: number;
  openIncidents: number;
};

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiRequest<Dashboard>("/admin/dashboard"),
    refetchInterval: 8000,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--color-ink)]">
        Dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]/80">
        Live operations snapshot for Ride Platform.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Live rides", value: stats.data?.liveRides ?? "—" },
          { label: "Online drivers", value: stats.data?.onlineDrivers ?? "—" },
          { label: "Open incidents", value: stats.data?.openIncidents ?? "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5"
          >
            <p className="text-sm text-[var(--color-ink-soft)]/70">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>
      {stats.isError && (
        <p className="mt-4 text-[var(--color-danger)]">
          {(stats.error as Error).message}
        </p>
      )}
    </div>
  );
}
