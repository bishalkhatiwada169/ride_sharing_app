import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { apiRequest } from "@/services/api-client";
import { StatusMessage } from "@/components/StatusMessage";
import { Check, Copy } from "lucide-react";

type ApkItem = {
  id: string;
  label: string;
  filename: string;
  available: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
  downloadUrls: string[];
};

type DownloadsCatalog = {
  preferredBaseUrl: string;
  lanHosts: string[];
  apps: ApkItem[];
};

function formatBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function QrImage({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setDataUrl(null);
    void QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: { dark: "#12202e", light: "#ffffff" },
    })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <div
        role="status"
        className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-mist)] p-3 text-center text-xs text-[var(--color-ink-soft)]"
      >
        QR unavailable — use the link
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-mist)] text-xs text-[var(--color-ink-soft)]"
      >
        Generating QR…
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code linking to ${url}`}
      width={200}
      height={200}
      className="rounded-xl border border-[var(--color-line)] bg-white"
    />
  );
}

function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!copied && !error) return;
    const t = window.setTimeout(() => {
      setCopied(false);
      setError(false);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [copied, error]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setError(false);
      setCopied(true);
      return;
    } catch {
      // fall through to legacy copy
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("copy failed");
      setError(false);
      setCopied(true);
    } catch {
      setCopied(false);
      setError(true);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-mist)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : error ? "Copy failed" : "Copy link"}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link copied to clipboard" : error ? "Could not copy link" : ""}
      </span>
    </div>
  );
}

export function DownloadsPage() {
  const catalog = useQuery({
    queryKey: ["public-downloads"],
    queryFn: () =>
      apiRequest<DownloadsCatalog>("/downloads", { auth: false }),
    refetchInterval: 15_000,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] sm:text-4xl">
        Install Ride
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]">
        One Android app for both passenger and driver. On the same Wi‑Fi as
        this server, scan the QR code or open the link, install, then choose
        your role in the app. You may need to allow “Install unknown apps”
        for this browser.
      </p>

      {catalog.isLoading && (
        <StatusMessage>Loading available builds…</StatusMessage>
      )}
      {catalog.isError && (
        <StatusMessage tone="danger">
          {(catalog.error as Error).message}. Check that the API is reachable,
          then refresh.
        </StatusMessage>
      )}

      {catalog.data && (
        <>
          <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 text-sm text-[var(--color-ink-soft)] sm:p-5">
            Server:{" "}
            <code className="rounded bg-[var(--color-mist)] px-1.5 py-0.5 text-[var(--color-ink)]">
              {catalog.data.preferredBaseUrl}
            </code>
            {catalog.data.lanHosts.length > 1 && (
              <span className="mt-1 block text-xs">
                Also: {catalog.data.lanHosts.slice(1).join(", ")}
              </span>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-1 lg:max-w-xl">
            {catalog.data.apps.map((app) => {
              const primary = app.downloadUrls[0];
              return (
                <article
                  key={app.id}
                  className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 sm:p-5"
                >
                  <h2 className="text-xl font-semibold tracking-tight">
                    {app.label}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    Choose Passenger or Driver after install · {app.filename} ·{" "}
                    {formatBytes(app.sizeBytes)}
                    {app.modifiedAt
                      ? ` · ${new Date(app.modifiedAt).toLocaleString()}`
                      : ""}
                  </p>

                  {!app.available || !primary ? (
                    <p role="status" className="mt-4 text-[var(--color-danger)]">
                      Not available yet. Ask an admin to publish builds.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                      <QrImage url={primary} />
                      <div className="min-w-0 flex-1 space-y-3">
                        <a
                          href={primary}
                          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        >
                          Download APK
                        </a>
                        <p className="break-all text-xs text-[var(--color-ink-soft)]">
                          {primary}
                        </p>
                        <CopyLinkButton text={primary} />
                        {app.downloadUrls.length > 1 && (
                          <details className="text-xs text-[var(--color-ink-soft)]">
                            <summary className="cursor-pointer py-1">
                              Other URLs
                            </summary>
                            <ul className="mt-2 space-y-1 break-all">
                              {app.downloadUrls.slice(1).map((u) => (
                                <li key={u}>
                                  <a className="underline" href={u}>
                                    {u}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
