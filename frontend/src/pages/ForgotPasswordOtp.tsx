import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import ConfirmDialog from "../components/ConfirmDialog";

const RESET_OTP_KEY_PREFIX = "resetOtp:";
const RESET_EMAIL_KEY = "resetEmail";
const RESEND_WAIT_SECONDS = 45;
type ResendFeedback = { title: string; message: string } | null;

export default function ForgotPasswordOtp() {
  const location = useLocation();
  const navigate = useNavigate();

  const challengeId = useMemo(
    () => new URLSearchParams(location.search).get("challengeId") || "",
    [location.search],
  );
  const email = useMemo(() => {
    const fromQuery = (
      new URLSearchParams(location.search).get("email") || ""
    ).trim();
    if (fromQuery) {
      sessionStorage.setItem(RESET_EMAIL_KEY, fromQuery);
      return fromQuery;
    }
    return (sessionStorage.getItem(RESET_EMAIL_KEY) || "").trim();
  }, [location.search]);

  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_WAIT_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [resendFeedback, setResendFeedback] = useState<ResendFeedback>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timerId = window.setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [resendIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!challengeId) {
      setError("Missing reset challenge. Request OTP again.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password-verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp }),
      });

      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(res, "OTP verification failed"),
        );
      }

      sessionStorage.setItem(`${RESET_OTP_KEY_PREFIX}${challengeId}`, otp);
      navigate(
        `/reset-password?challengeId=${encodeURIComponent(challengeId)}`,
      );
    } catch (err: any) {
      setError(err?.message || "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setResendFeedback(null);
    if (!email) {
      setError("Missing email. Request OTP again.");
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error(
          await getApiErrorMessage(res, "Unable to resend OTP", {
            409: "Please wait a few seconds and try again.",
          }),
        );
      }

      const data = (await res.json()) as {
        challengeId?: string | null;
        message?: string;
      };
      if (!data.challengeId) {
        throw new Error(
          "Unable to resend OTP. Request again from forgot password.",
        );
      }

      sessionStorage.removeItem(`${RESET_OTP_KEY_PREFIX}${challengeId}`);
      setOtp("");
      setResendIn(RESEND_WAIT_SECONDS);
      setResendFeedback({
        title: "OTP resent",
        message: data.message || "OTP sent again",
      });
      navigate(
        `/forgot-password-otp?challengeId=${encodeURIComponent(data.challengeId)}&email=${encodeURIComponent(email)}`,
        { replace: true },
      );
    } catch (err: any) {
      const message = err?.message || "Unable to resend OTP";
      setResendFeedback({ title: "Resend failed", message });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="app-shell grid min-h-svh place-items-center px-3 py-6 text-slate-800 sm:px-4 sm:py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.7)] backdrop-blur sm:rounded-3xl sm:p-8">
        <div className="text-center">
          <Link
            to="/"
            className="font-mono text-sm font-semibold text-teal-800"
          >
            shur.click
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
            Step 2: Enter OTP
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter the 6-digit OTP we sent to your email.
          </p>
          {email && (
            <p className="mt-1 break-all text-xs text-slate-500">
              Email: {email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit OTP"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm tracking-[0.12em] outline-none transition focus:border-teal-600 sm:tracking-[0.35em]"
            required
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Checking OTP..." : "Verify and continue"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Didn&apos;t get OTP? Wait for timer, then tap resend.
          </p>
          <button
            type="button"
            onClick={() => void handleResendOtp()}
            disabled={isResending || resendIn > 0 || !email}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending
              ? "Sending again..."
              : resendIn > 0
                ? `Resend in ${resendIn}s`
                : "Resend OTP"}
          </button>
          {!email && (
            <p className="text-center text-xs text-rose-700">
              Missing email context. Go back and request OTP again.
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Need a new OTP?{" "}
          <Link
            to="/forgot-password"
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Request again
          </Link>
        </p>
      </main>
      <ConfirmDialog
        isOpen={Boolean(resendFeedback)}
        title={resendFeedback?.title || "OTP"}
        description={resendFeedback?.message || ""}
        confirmLabel="OK"
        cancelLabel="Close"
        onConfirm={() => setResendFeedback(null)}
        onCancel={() => setResendFeedback(null)}
      />
    </div>
  );
}
