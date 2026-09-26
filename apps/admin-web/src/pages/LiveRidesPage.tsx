import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import { connectAdminLive, type RealtimeEvent } from "@/services/realtime";
import { StatusMessage } from "@/components/StatusMessage";

type Ride = {
  id: string;
  status: string;
  vehicleTypeRequested: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  passengerUserId: string;
  driverUserId: string | null;
};

export function LiveRidesPage() {
  const qc = useQueryClient();
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [wsState, setWsState] = useState<"connecting" | "live" | "polling">(
    "connecting",
  );

  const rides = useQuery({
    queryKey: ["admin-live-rides"],
    queryFn: () => apiRequest<Ride[]>("/rides/admin/live"),
    refetchInterval: wsState === "live" ? 15000 : 5000,
  });

  useEffect(() => {
    let sawEvent = false;
    const disconnect = connectAdminLive((event) => {
      sawEvent = true;
      setWsState("live");
      setLastEvent(event);
      void qc.invalidateQueries({ queryKey: ["admin-live-rides"] });
    });
    const timer = window.setTimeout(() => {
      if (!sawEvent) setWsState("polling");
    }, 8000);
    return () => {
      window.clearTimeout(timer);
      disconnect();
    };
  }, [qc]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Live rides
      </h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        Active ride board · feed: {wsState}
        {lastEvent
          ? ` · last ${lastEvent.type}${lastEvent.rideId ? ` (${lastEvent.rideId.slice(0, 8)}…)` : ""}`
          : ""}
      </p>

      {rides.isLoading && <StatusMessage>Loading live rides…</StatusMessage>}
      {rides.isError && (
        <StatusMessage tone="danger">
          {(rides.error as Error).message}
        </StatusMessage>
      )}

      <ul className="mt-6 space-y-3">
        {(rides.data ?? []).map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{r.status}</p>
              <p className="text-xs font-mono text-[var(--color-ink-soft)]">
                {r.id.slice(0, 8)}…
              </p>
            </div>
            <p className="mt-2 text-sm">
              {r.vehicleTypeRequested} · {r.pickupAddress ?? "Pickup"} →{" "}
              {r.dropoffAddress ?? "Dropoff"}
            </p>
          </li>
        ))}
        {rides.data?.length === 0 && (
          <li role="status" className="text-[var(--color-ink-soft)]">
            No live rides.
          </li>
        )}
      </ul>
    </div>
  );
}
