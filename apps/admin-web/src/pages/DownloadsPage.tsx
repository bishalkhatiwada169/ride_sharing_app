import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { StatusMessage } from "@/components/StatusMessage";
import { Check, Copy } from "lucide-react";

type AndroidManifest = {
  versionName: string;
  versionCode: number;
  apkUrl: string;
  apkSha256?: string;
  label?: string;
  uploadedAt?: string;
  gitSha?: string;
};

const MANIFEST_URL = import.meta.env.VITE_ANDROID_MANIFEST_URL?.trim() ?? "";

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

async function fetchManifest(): Promise<AndroidManifest> {
  if (!MANIFEST_URL) {
    throw new Error(
      "VITE_ANDROID_MANIFEST_URL is not set. Point it at the S3 version.json from CI publish."
    );
  }
  const res = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Manifest HTTP ${res.status} from ${MANIFEST_URL}`);
  }
  return (await res.json()) as AndroidManifest;
}

export function DownloadsPage() {
  const manifest = useQuery({
    queryKey: ["android-manifest", MANIFEST_URL],
    queryFn: fetchManifest,
    enabled: Boolean(MANIFEST_URL),
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)] sm:text-4xl">
        Install Ride
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--color-ink-soft)]">
        One Android app for both passenger and driver. Download the latest CI
        build, install it, then choose your role in the app. You may need to
        allow “Install unknown apps” for this browser.
      </p>

      {!MANIFEST_URL && (
        <StatusMessage tone="danger">
          Set <code>VITE_ANDROID_MANIFEST_URL</code> to the public{" "}
          <code>version.json</code> URL from{" "}
          <code>deploy/android/README.md</code>, then rebuild admin-web.
        </StatusMessage>
      )}

      {MANIFEST_URL && manifest.isLoading && (
        <StatusMessage>Loading available builds…</StatusMessage>
      )}
      {MANIFEST_URL && manifest.isError && (
        <StatusMessage tone="danger">
          {(manifest.error as Error).message}. Publish an APK via GitHub Actions,
          then refresh.
        </StatusMessage>
      )}

      {manifest.data && (
        <div className="mt-8 grid gap-6 lg:max-w-xl lg:grid-cols-1">
          <article className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-4 sm:p-5">
            <h2 className="text-xl font-semibold tracking-tight">
              {manifest.data.label ?? "Ride app (passenger + driver)"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {manifest.data.versionName}+{manifest.data.versionCode}
              {manifest.data.uploadedAt
                ? ` · ${new Date(manifest.data.uploadedAt).toLocaleString()}`
                : ""}
              {manifest.data.gitSha ? ` · ${manifest.data.gitSha}` : ""}
            </p>

            {!manifest.data.apkUrl ? (
              <p role="status" className="mt-4 text-[var(--color-danger)]">
                Manifest has no apkUrl yet.
              </p>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row">
                <QrImage url={manifest.data.apkUrl} />
                <div className="min-w-0 flex-1 space-y-3">
                  <a
                    href={manifest.data.apkUrl}
                    className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                  >
                    Download APK
                  </a>
                  <p className="break-all text-xs text-[var(--color-ink-soft)]">
                    {manifest.data.apkUrl}
                  </p>
                  <CopyLinkButton text={manifest.data.apkUrl} />
                  {manifest.data.apkSha256 && (
                    <p className="break-all text-xs text-[var(--color-ink-soft)]">
                      SHA-256: {manifest.data.apkSha256}
                    </p>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
