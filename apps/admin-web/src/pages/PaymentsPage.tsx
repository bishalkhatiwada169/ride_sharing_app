import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";

type Payment = {
  id: string;
  rideId: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: string;
  providerPaymentId: string | null;
  createdAt: string;
};

export function PaymentsPage() {
  const qc = useQueryClient();
  const payments = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => apiRequest<Payment[]>("/payments/admin"),
    refetchInterval: 8000,
  });

  const refund = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/payments/admin/${id}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason: "Admin refund" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payments"] }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Payments</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]/80">
        Ride settlements, mock provider, and refunds (Phase 4).
      </p>

      {payments.isLoading && <p className="mt-6">Loading…</p>}
      {payments.isError && (
        <p className="mt-6 text-[var(--color-danger)]">
          {(payments.error as Error).message}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {(payments.data ?? []).map((p) => (
          <li
            key={p.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {p.status} · {p.provider}
              </p>
              <p className="text-sm">
                {(p.amountMinor / 100).toFixed(2)} {p.currency}
              </p>
            </div>
            <p className="mt-2 text-xs font-mono text-[var(--color-ink-soft)]/70">
              ride {p.rideId.slice(0, 8)}… · {p.providerPaymentId ?? "—"}
            </p>
            {p.status === "SUCCEEDED" && (
              <button
                type="button"
                className="mt-3 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm hover:bg-[var(--color-mist)]"
                disabled={refund.isPending}
                onClick={() => refund.mutate(p.id)}
              >
                Refund
              </button>
            )}
          </li>
        ))}
        {payments.data?.length === 0 && (
          <li className="text-[var(--color-ink-soft)]/70">No payments yet.</li>
        )}
      </ul>
    </div>
  );
}
