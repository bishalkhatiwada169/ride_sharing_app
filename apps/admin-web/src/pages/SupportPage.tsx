import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import { StatusMessage } from "@/components/StatusMessage";

type Ticket = {
  id: string;
  openerUserId: string;
  rideId: string | null;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string | null;
  createdAt: string;
};

export function SupportPage() {
  const qc = useQueryClient();
  const tickets = useQuery({
    queryKey: ["admin-support"],
    queryFn: () => apiRequest<Ticket[]>("/support/admin/tickets"),
    refetchInterval: 12000,
  });

  const resolve = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/support/admin/tickets/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "RESOLVED" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-support"] }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Support
      </h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        Open tickets from passengers and drivers.
      </p>
      {tickets.isLoading && <StatusMessage>Loading tickets…</StatusMessage>}
      {tickets.isError && (
        <StatusMessage tone="danger">
          {(tickets.error as Error).message}
        </StatusMessage>
      )}
      <ul className="mt-6 space-y-3">
        {(tickets.data ?? []).map((t) => (
          <li
            key={t.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {t.subject} · {t.category}
              </p>
              <p className="text-sm">
                {t.status} · {t.priority}
              </p>
            </div>
            {t.description && (
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                {t.description}
              </p>
            )}
            <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
              {new Date(t.createdAt).toLocaleString()}
            </p>
            {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
              <button
                type="button"
                className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                onClick={() => resolve.mutate(t.id)}
              >
                Mark resolved
              </button>
            )}
          </li>
        ))}
        {tickets.data?.length === 0 && (
          <li role="status" className="text-[var(--color-ink-soft)]">
            No tickets yet.
          </li>
        )}
      </ul>
    </div>
  );
}
