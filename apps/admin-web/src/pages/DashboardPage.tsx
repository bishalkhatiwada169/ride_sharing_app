import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import { StatusMessage } from "@/components/StatusMessage";

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
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] sm:text-4xl">
        Dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]">
        Live operations snapshot for Ride Platform.
      </p>

      {stats.isLoading && (
        <StatusMessage>Loading live snapshot…</StatusMessage>
      )}
      {stats.isError && (
        <StatusMessage tone="danger">
          {(stats.error as Error).message}. Sign in again if your session
          expired, or check API connectivity.
        </StatusMessage>
      )}

      {stats.data && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Live rides", value: stats.data.liveRides },
            { label: "Online drivers", value: stats.data.onlineDrivers },
            { label: "Open incidents", value: stats.data.openIncidents },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-5"
            >
              <p className="text-sm text-[var(--color-ink-soft)]">{card.label}</p>
              <p className="mt-2 font-semibold text-3xl tracking-tight tabular-nums">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
