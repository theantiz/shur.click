import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import ConfirmDialog from "../components/ConfirmDialog";

const RESET_OTP_KEY_PREFIX = "resetOtp:";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const challengeId = useMemo(
    () => new URLSearchParams(location.search).get("challengeId") || "",
    [location.search],
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!challengeId) {
      setError("Missing reset challenge. Request OTP again.");
      return;
    }
    const otp = sessionStorage.getItem(`${RESET_OTP_KEY_PREFIX}${challengeId}`) || "";
    if (otp.length !== 6) {
      setError("Please verify OTP first.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp, password, confirmPassword }),
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res, "Reset failed"));
      }

      const data = await res.json();
      sessionStorage.removeItem(`${RESET_OTP_KEY_PREFIX}${challengeId}`);
      setSuccessMessage(data.message || "Password reset successful");
    } catch (err: any) {
      setError(err?.message || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!successMessage) return;
    const timerId = window.setTimeout(() => navigate("/auth/login"), 1200);
    return () => window.clearTimeout(timerId);
  }, [successMessage, navigate]);

  return (
    <div className="app-shell grid min-h-svh place-items-center px-3 py-6 text-slate-800 sm:px-4 sm:py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.7)] backdrop-blur sm:rounded-3xl sm:p-8">
        <div className="text-center">
          <Link to="/" className="font-mono text-sm font-semibold text-teal-800">shur.click</Link>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">Reset password</h1>
          <p className="mt-1 text-sm text-slate-600">Set your new password.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            minLength={8}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Need OTP again?{" "}
          <Link to="/forgot-password" className="font-medium text-teal-700 hover:text-teal-800">
            Request again
          </Link>
        </p>
      </main>
      <ConfirmDialog
        isOpen={Boolean(successMessage)}
        title="Password reset successful"
        description="Redirecting to login."
        confirmLabel="Go to login"
        cancelLabel="Close"
        onConfirm={() => navigate("/auth/login")}
        onCancel={() => navigate("/auth/login")}
      />
    </div>
  );
}
