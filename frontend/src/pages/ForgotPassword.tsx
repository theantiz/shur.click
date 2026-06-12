import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import ConfirmDialog from "../components/ConfirmDialog";

const RESET_EMAIL_KEY = "resetEmail";

type ForgotPasswordResponse = {
  message: string;
  challengeId?: string | null;
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ForgotPasswordResponse | null>(null);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error(await getApiErrorMessage(
          res,
          "Request failed",
          {
            409: "Please wait a few seconds and try again.",
          },
        ));
      }

      const data = (await res.json()) as ForgotPasswordResponse;
      setSuccess(data);
      if (data.challengeId) {
        sessionStorage.setItem(RESET_EMAIL_KEY, email.trim());
        setIsOtpDialogOpen(true);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to process request");
    } finally {
      setIsLoading(false);
    }
  };

  const resetUrl = success?.challengeId
    ? `/forgot-password-otp?challengeId=${encodeURIComponent(success.challengeId)}&email=${encodeURIComponent(email.trim())}`
    : null;

  return (
    <div className="app-shell grid min-h-svh place-items-center px-3 py-6 text-slate-800 sm:px-4 sm:py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.7)] backdrop-blur sm:rounded-3xl sm:p-8">
        <div className="text-center">
          <Link to="/" className="font-mono text-sm font-semibold text-teal-800">shur.click</Link>
          <h1 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">Step 1: Get OTP</h1>
          <p className="mt-1 text-sm text-slate-600">Type your account email. We will send you a 6-digit OTP.</p>
          <p className="mt-2 text-xs text-slate-500">No password needed in this step.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
            required
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p>{error}</p>
              {/email does not exist/i.test(error) && (
                <p className="mt-1">
                  <Link to="/auth/signup" className="font-medium underline underline-offset-2">
                    Register now
                  </Link>
                </p>
              )}
            </div>
          )}

          {success && !success.challengeId && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Sending OTP..." : "Send me OTP"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Back to{" "}
          <Link to="/auth/login" className="font-medium text-teal-700 hover:text-teal-800">
            Login
          </Link>
        </p>
      </main>
      <ConfirmDialog
        isOpen={isOtpDialogOpen && Boolean(resetUrl)}
        title="OTP sent"
        description="Great. OTP is sent to your email. Click Continue to enter OTP."
        confirmLabel="Continue"
        cancelLabel="Stay"
        onConfirm={() => {
          if (resetUrl) {
            navigate(resetUrl);
          }
          setIsOtpDialogOpen(false);
        }}
        onCancel={() => setIsOtpDialogOpen(false)}
      />
    </div>
  );
}
