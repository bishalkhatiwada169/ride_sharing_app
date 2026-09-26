import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api-client";
import { StatusMessage } from "@/components/StatusMessage";

type Audit = {
  id: number;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export function AuditPage() {
  const logs = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => apiRequest<Audit[]>("/admin/audit-logs"),
    refetchInterval: 10000,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
        Audit logs
      </h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        Recent admin/driver verification actions.
      </p>
      {logs.isLoading && <StatusMessage>Loading audit logs…</StatusMessage>}
      {logs.isError && (
        <StatusMessage tone="danger">
          {(logs.error as Error).message}
        </StatusMessage>
      )}
      <ul className="mt-6 space-y-2">
        {(logs.data ?? []).map((l) => (
          <li
            key={l.id}
            className="rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-3 text-sm"
          >
            <span className="font-semibold">{l.action}</span>
            {l.entityType ? ` · ${l.entityType}` : ""}
            {l.entityId ? ` · ${l.entityId.slice(0, 8)}…` : ""}
            <span className="ml-2 text-[var(--color-ink-soft)]">
              {new Date(l.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
        {logs.data?.length === 0 && (
          <li role="status" className="text-[var(--color-ink-soft)]">
            No audit entries yet.
          </li>
        )}
      </ul>
    </div>
  );
}
