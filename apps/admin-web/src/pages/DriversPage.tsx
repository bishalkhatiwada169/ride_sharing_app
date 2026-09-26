import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import { StatusMessage } from "@/components/StatusMessage";

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

  const rows = drivers.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Drivers
      </h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        Verification queue and driver status (Phase 2).
      </p>

      {drivers.isLoading && <StatusMessage>Loading drivers…</StatusMessage>}
      {drivers.isError && (
        <StatusMessage tone="danger">
          {(drivers.error as Error).message}
        </StatusMessage>
      )}

      {drivers.data && rows.length === 0 && (
        <StatusMessage>No drivers yet.</StatusMessage>
      )}

      {/* Mobile: stacked cards — avoid forced sideways scroll */}
      {rows.length > 0 && (
        <ul className="mt-6 space-y-3 md:hidden">
          {rows.map((d) => (
            <li
              key={d.userId}
              className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-4"
            >
              <p className="font-mono text-xs text-[var(--color-ink-soft)]">
                {d.userId.slice(0, 8)}…
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[var(--color-ink-soft)]">Verification</dt>
                  <dd className="font-medium">{d.verificationStatus}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-ink-soft)]">Availability</dt>
                  <dd className="font-medium">{d.availabilityStatus}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-ink-soft)]">Online</dt>
                  <dd className="font-medium">{d.online ? "Yes" : "No"}</dd>
                </div>
              </dl>
              {d.verificationStatus === "PENDING" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white"
                    onClick={() => approve.mutate(d.userId)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    onClick={() => reject.mutate(d.userId)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] text-[var(--color-ink-soft)]">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 font-medium">Availability</th>
                <th className="px-4 py-3 font-medium">Online</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr
                  key={d.userId}
                  className="border-b border-[var(--color-line)]/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {d.userId.slice(0, 8)}…
                  </td>
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
