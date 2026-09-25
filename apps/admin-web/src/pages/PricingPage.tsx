import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";

type Rule = {
  id: string;
  name: string;
  vehicleType: string;
  cityCode: string | null;
  currency: string;
  baseFareMinor: number;
  perKmMinor: number;
  perMinuteMinor: number;
  bookingFeeMinor: number;
  minFareMinor: number;
  taxBps: number;
  surgeMultiplier: number;
  active: boolean;
  priority: number;
};

export function PricingPage() {
  const qc = useQueryClient();
  const rules = useQuery({
    queryKey: ["admin-fare-rules"],
    queryFn: () => apiRequest<Rule[]>("/pricing/admin/rules"),
  });

  const toggle = useMutation({
    mutationFn: (rule: Rule) =>
      apiRequest(`/pricing/admin/rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: rule.name,
          vehicleType: rule.vehicleType,
          cityCode: rule.cityCode,
          currency: rule.currency,
          baseFareMinor: rule.baseFareMinor,
          perKmMinor: rule.perKmMinor,
          perMinuteMinor: rule.perMinuteMinor,
          bookingFeeMinor: rule.bookingFeeMinor,
          minFareMinor: rule.minFareMinor,
          taxBps: rule.taxBps,
          surgeMultiplier: rule.surgeMultiplier,
          active: !rule.active,
          priority: rule.priority,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-fare-rules"] }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Pricing</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]/80">
        Fare rules (server-side; apps never invent prices).
      </p>

      {rules.isLoading && <p className="mt-6">Loading…</p>}
      <ul className="mt-6 space-y-3">
        {(rules.data ?? []).map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {r.name} · {r.vehicleType}
              </p>
              <p className="text-sm">{r.active ? "Active" : "Inactive"}</p>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]/80">
              base {(r.baseFareMinor / 100).toFixed(0)} · /km {(r.perKmMinor / 100).toFixed(0)} ·
              /min {(r.perMinuteMinor / 100).toFixed(0)} · surge {r.surgeMultiplier} ·{" "}
              {r.currency}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-sm"
              onClick={() => toggle.mutate(r)}
            >
              Toggle active
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
