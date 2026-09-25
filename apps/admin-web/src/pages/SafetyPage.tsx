import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";

type Incident = {
  id: string;
  rideId: string | null;
  reporterUserId: string;
  type: string;
  status: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
};

export function SafetyPage() {
  const qc = useQueryClient();
  const incidents = useQuery({
    queryKey: ["admin-safety"],
    queryFn: () => apiRequest<Incident[]>("/safety/admin/incidents"),
    refetchInterval: 5000,
  });

  const resolve = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/safety/admin/incidents/${id}/resolve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-safety"] }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Safety</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]/80">
        SOS and incident queue (Phase 5).
      </p>

      {incidents.isLoading && <p className="mt-6">Loading…</p>}
      {incidents.isError && (
        <p className="mt-6 text-[var(--color-danger)]">
          {(incidents.error as Error).message}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {(incidents.data ?? []).map((i) => (
          <li
            key={i.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {i.type} · {i.status}
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]/70">
                {new Date(i.createdAt).toLocaleString()}
              </p>
            </div>
            <p className="mt-2 text-sm">
              {i.category ?? "—"}
              {i.rideId ? ` · ride ${i.rideId.slice(0, 8)}…` : ""}
            </p>
            {i.notes && <p className="mt-1 text-sm text-[var(--color-ink-soft)]/80">{i.notes}</p>}
            {i.status !== "RESOLVED" && (
              <button
                type="button"
                className="mt-3 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm hover:bg-[var(--color-mist)]"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate(i.id)}
              >
                Resolve
              </button>
            )}
          </li>
        ))}
        {incidents.data?.length === 0 && (
          <li className="text-[var(--color-ink-soft)]/70">No incidents.</li>
        )}
      </ul>
    </div>
  );
}
