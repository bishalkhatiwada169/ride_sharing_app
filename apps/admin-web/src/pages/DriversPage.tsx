import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";

type Driver = {
  userId: string;
  verificationStatus: string;
  online: boolean;
  availabilityStatus: string;
  ratingAvg: number;
  ratingCount: number;
  rejectedReason: string | null;
};

export function DriversPage() {
  const qc = useQueryClient();
  const drivers = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => apiRequest<Driver[]>("/drivers/admin"),
  });

  const approve = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/drivers/admin/${userId}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-drivers"] }),
  });

  const reject = useMutation({
    mutationFn: (userId: string) =>
      apiRequest(`/drivers/admin/${userId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Documents incomplete" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-drivers"] }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Drivers</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]/80">
        Verification queue and driver status (Phase 2).
      </p>

      {drivers.isLoading && <p className="mt-6">Loading…</p>}
      {drivers.isError && (
        <p className="mt-6 text-[var(--color-danger)]">
          {(drivers.error as Error).message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-line)] text-[var(--color-ink-soft)]/70">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Online</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(drivers.data ?? []).map((d) => (
              <tr key={d.userId} className="border-b border-[var(--color-line)]/60">
                <td className="px-4 py-3 font-mono text-xs">{d.userId.slice(0, 8)}…</td>
                <td className="px-4 py-3">{d.verificationStatus}</td>
                <td className="px-4 py-3">{d.availabilityStatus}</td>
                <td className="px-4 py-3">{d.online ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  {d.verificationStatus === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-white"
                        onClick={() => approve.mutate(d.userId)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--color-line)] px-3 py-1.5"
                        onClick={() => reject.mutate(d.userId)}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {drivers.data?.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--color-ink-soft)]/70" colSpan={5}>
                  No drivers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
