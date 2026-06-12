import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

import { ErrorAlert } from "./ErrorAlert";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";

type CreateResponse = {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
};

type HistoryItem = {
  longUrl: string;
  shortUrl: string;
  shortCode: string;
  createdAt: number;
};

const STORAGE_KEY = "urlshortener_history";
const GUEST_COUNT_KEY = "guest_shorten_count";
const GUEST_LIMIT = 5;
const IST_TIMEZONE = "Asia/Kolkata";

function getGuestCount(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function incrementGuestCount(): number {
  try {
    const next = getGuestCount() + 1;
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

/** Beautiful gate shown after guest limit is reached */
function GuestLimitGate({ lastShortUrl }: { lastShortUrl: string }) {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(lastShortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-5 animate-fade-in">
      {/* Last result strip */}
      {lastShortUrl && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <code className="break-all font-mono text-sm text-teal-900 sm:text-base">{lastShortUrl}</code>
          <button
            type="button"
            onClick={copyToClipboard}
            className="w-full rounded-full border border-teal-500/30 bg-white px-4 py-2 text-xs font-semibold text-teal-800 transition hover:border-teal-700 sm:w-auto sm:py-1.5"
          >
            {copySuccess ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}

      {/* Gate card */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{
          boxShadow: "0 4px 32px -8px rgba(15, 118, 110, 0.18), 0 0 0 1px rgba(15, 118, 110, 0.07)",
        }}
      >
        {/* Decorative gradient blobs */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #14b8a6 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #0d9488 0%, transparent 70%)" }}
        />

        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          {/* Usage dots */}
          <div className="mb-5 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #0f766e, #14b8a6)" }}
                >
                  ✓
                </span>
              ))}
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed text-xs text-slate-400"
                style={{ borderColor: "#cbd5e1" }}
              >
                +
              </span>
            </div>
            <span className="ml-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
              5 / 5 free used
            </span>
          </div>

          <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            You've used your 5 free shortens
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Create a free account for <strong className="text-slate-700">unlimited links</strong>, click analytics, QR codes, and custom aliases — no credit card needed.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition"
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                boxShadow: "0 2px 16px -4px rgba(15, 118, 110, 0.45)",
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Create free account
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign in
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-60" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Free forever · No credit card · Unlimited shortens
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TerminalShortener() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // ignore storage failures
    }

    // Check if guest limit already reached on mount
    const isLoggedIn = Boolean(localStorage.getItem("token"));
    if (!isLoggedIn && getGuestCount() >= GUEST_LIMIT) {
      setGuestLimitReached(true);
    }
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    const nextHistory = [item, ...history.filter((h) => h.shortCode !== item.shortCode)].slice(0, 10);
    setHistory(nextHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // ignore storage failures
    }
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = urlInput.trim();
    if (!value) return;

    // If guest typed a custom alias, show the dialog instead of submitting
    const token = localStorage.getItem("token");
    if (!token && customCode.trim()) {
      setPendingUrl(value);
      setShowAliasDialog(true);
      return;
    }

    await doShorten(value, customCode.trim() || undefined);
  };

  /** Continue shortening without the custom alias (guest chose to proceed) */
  const handleContinueWithoutAlias = async () => {
    setShowAliasDialog(false);
    const url = pendingUrl || urlInput.trim();
    if (!url) return;
    setCustomCode("");
    await doShorten(url, undefined);
  };

  const doShorten = async (value: string, alias?: string) => {
    setError(null);
    setIsLoading(true);
    setShowResult(false);

    try {
      const payload: { longUrl: string; customAlias?: string } = { longUrl: value };
      if (alias) payload.customAlias = alias;

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(apiUrl("/api/urls"), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(
          res,
          "We couldn't shorten this URL right now.",
          {
            400: "We couldn't shorten this URL. Please use a valid URL (include http:// or https:// if needed).",
            409: "That custom alias is already in use. Try a different alias.",
            429: "Too many requests. Please wait and try again.",
            500: "Server error while shortening URL. Please try again.",
          },
        );

        if (!token && res.status === 409 && /guest limit reached/i.test(message)) {
          navigate("/auth/signup");
          return;
        }

        throw new Error(message);
      }

      const data = (await res.json()) as CreateResponse;
      setShortUrl(data.shortUrl);
      setShowResult(true);
      setShowQR(false);
      setUrlInput("");
      setCustomCode("");

      saveToHistory({
        longUrl: value,
        shortUrl: data.shortUrl,
        shortCode: data.shortCode,
        createdAt: Date.now(),
      });

      // Track guest usage and show gate after limit
      if (!token) {
        const newCount = incrementGuestCount();
        if (newCount >= GUEST_LIMIT) {
          setGuestLimitReached(true);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to shorten");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1800);
    } catch {
      setError("Clipboard blocked by browser.");
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setUrlInput(item.longUrl);
    setShortUrl(item.shortUrl);
    setShowResult(true);
    setShowQR(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-IN", {
      timeZone: IST_TIMEZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });

  return (
    <section className="mx-auto mt-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white/80 p-3 sm:mt-10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="font-mono text-xs text-slate-600 transition hover:text-slate-900"
          >
            {showHistory ? "hide history" : `history (${history.length})`}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs text-slate-500">Recent links</span>
            <button
              type="button"
              onClick={clearHistory}
              className="font-mono text-xs text-rose-600 transition hover:text-rose-700"
            >
              clear
            </button>
          </div>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {history.map((item) => (
              <button
                key={item.shortCode}
                type="button"
                className="flex w-full flex-col gap-1 rounded-lg px-2 py-1 text-left transition hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                onClick={() => loadFromHistory(item)}
              >
                <span className="w-full break-all font-mono text-xs text-teal-700 sm:truncate">{item.shortUrl}</span>
                <span className="shrink-0 font-mono text-[11px] text-slate-500">{formatDate(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show gate overlay after limit reached, otherwise show the form */}
      {guestLimitReached ? (
        <GuestLimitGate lastShortUrl={shortUrl} />
      ) : (
        <>
          <form onSubmit={handleShorten} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste your long URL"
                className="w-full min-w-0 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                required
              />
              <button
                type="submit"
                disabled={isLoading || !urlInput.trim()}
                className="rounded-2xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Shortening..." : "Shorten"}
              </button>
            </div>

            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              placeholder="Custom alias (optional)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none transition focus:border-teal-500"
              maxLength={20}
            />
          </form>

          {error && <ErrorAlert message={error} />}

          {showResult && (
            <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50/70 p-3 animate-fade-in sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <code className="break-all font-mono text-sm text-teal-900 sm:text-base">{shortUrl}</code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full rounded-full border border-teal-500/30 bg-white px-4 py-2 text-xs font-semibold text-teal-800 transition hover:border-teal-700 sm:w-auto sm:py-1.5"
                >
                  {copySuccess ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mt-4 border-t border-teal-700/20 pt-3">
                {/* QR code removed for non-authenticated/free terminal */}
                <div className="hidden" />
              </div>
            </div>
          )}


        </>
      )}
      {/* Custom alias dialog for guests */}
      {showAliasDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAliasDialog(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{ boxShadow: "0 24px 64px -16px rgba(15, 118, 110, 0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative accent */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #14b8a6 0%, transparent 70%)" }}
            />

            <div className="relative px-6 py-6 sm:px-8 sm:py-8">
              {/* Lock icon */}
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)" }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-teal-700" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Custom alias requires an account
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                You entered the alias{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-teal-700">
                  {customCode}
                </code>.
                Sign up or log in to use custom aliases, or continue with a random short code.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition"
                  style={{
                    background: "linear-gradient(135deg, #0f766e 0%, #0d9488 100%)",
                    boxShadow: "0 2px 12px -3px rgba(15, 118, 110, 0.4)",
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                  Sign up to use alias
                </Link>
                <Link
                  to="/auth/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Already have an account? Log in
                </Link>
                <button
                  type="button"
                  onClick={handleContinueWithoutAlias}
                  className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  Continue without alias
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-50" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
