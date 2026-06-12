import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorAlert } from "./ErrorAlert";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import Footer from "./Footer";
import { formatIstDateTime } from "../lib/dateTime";

type StatsResponse = {
  shortCode: string;
  longUrl: string;
  clickCount: number;
  createdAt: string;
  lastAccessedAt: string | null;
};

function extractCode(input: string) {
  const value = input.trim();
  if (!value) return "";
  const codePattern = /^[a-zA-Z0-9_-]{3,20}$/;

  if (codePattern.test(value)) return value;

  const maybeUrl = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  try {
    const parsed = new URL(maybeUrl);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || "";
    return codePattern.test(lastPart) ? lastPart : "";
  } catch {
    return "";
  }
}

function formatDate(dateStr: string | null) {
  return formatIstDateTime(dateStr);
}

export default function TrackPage() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState("");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [trackedCode, setTrackedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (code: string, resetBeforeFetch = false) => {
    if (resetBeforeFetch) {
      setError(null);
      setIsLoading(true);
      setStats(null);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiUrl(`/api/urls/${encodeURIComponent(code)}/stats`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(
          res,
          "Unable to fetch link stats right now.",
          {
            401: "Please login to track links.",
            400: "Please enter a valid short URL or code.",
            404: "We couldn't find this short URL. It may be invalid, deleted, or never created.",
            429: "Too many requests. Please wait and try again.",
            500: "Server error while fetching stats. Please try again.",
          },
        ));
      }
      const data = (await res.json()) as StatsResponse;
      setStats(data);
      return true;
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch stats");
      return false;
    } finally {
      if (resetBeforeFetch) setIsLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = extractCode(urlInput);
    if (!code) {
      setStats(null);
      setError("Please enter a valid short URL or code (example: shur.click/abc123).");
      return;
    }

    const ok = await fetchStats(code, true);
    if (ok) setTrackedCode(code);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!trackedCode) return;
    const intervalId = window.setInterval(() => {
      void fetchStats(trackedCode, false);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [trackedCode]);

  return (
    <div className="app-shell min-h-screen text-slate-800">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 pb-0 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="font-mono text-sm font-semibold text-teal-800">
            shur.click
          </Link>
          <Link to="/" className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700">
            Home
          </Link>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.7)] backdrop-blur sm:mt-8 sm:p-7">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-4xl">Track link performance</h1>
          <p className="mt-2 text-sm text-slate-600">Paste a short link or code to fetch live stats.</p>

          <form onSubmit={handleTrack} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="shur.click/hello or hello"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Tracking..." : "Track"}
            </button>
          </form>

          {error && <ErrorAlert message={error} />}

          {stats && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-mono text-xs text-slate-500">ORIGINAL URL</p>
                <p className="mt-1 break-all text-sm text-slate-800">{stats.longUrl}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-mono text-xs text-slate-500">SHORT CODE</p>
                <p className="mt-1 font-mono text-sm text-teal-700">{stats.shortCode}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-mono text-xs text-slate-500">TOTAL CLICKS</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.clickCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-mono text-xs text-slate-500">LAST CLICKED</p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(stats.lastAccessedAt)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                <p className="font-mono text-xs text-slate-500">CREATED</p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(stats.createdAt)}</p>
              </div>
            </div>
          )}
        </section>
        <div className="mt-auto pt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
