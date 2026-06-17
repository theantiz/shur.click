import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { apiUrl } from "../lib/api";
import { getApiErrorMessage } from "../lib/apiError";
import {
  initializeGoogleIdentity,
  loadGoogleIdentityScript,
  type GoogleCredentialResponse,
} from "../lib/googleIdentity";
import { claimGuestLinks } from "../lib/guestLinks";

type SignupFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type OtpInitResponse = {
  message: string;
  challengeId: string;
};

const DEFAULT_GOOGLE_CLIENT_ID = "249537386676-1b3dkci1si4h0p79lt3v1470jug2a2j3.apps.googleusercontent.com";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleLoadAttempt, setGoogleLoadAttempt] = useState(0);
  const [isGoogleScriptLoading, setIsGoogleScriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();

  const isOtpStep = Boolean(challengeId);

  const handleInitSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl("/api/auth/register-init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Registration failed"));
      }

      const data = (await response.json()) as OtpInitResponse;
      setChallengeId(data.challengeId);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Signup failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/auth/register-verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp: otpCode.trim() }),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "OTP verification failed"));
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email || formData.email);
      localStorage.setItem("userName", data.fullName || formData.name);
      await claimGuestLinks(data.token);
      navigate("/user/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "OTP verification failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (isOtpStep || !googleClientId || !googleButtonRef.current || googleLoadAttempt === 0) return;

    const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
      const idToken = response.credential;
      if (!idToken) {
        setError("Google signup failed");
        return;
      }

      setError(null);
      setIsGoogleLoading(true);
      try {
        const res = await fetch(apiUrl("/api/auth/google"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "Google signup failed"));
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("userName", data.fullName || "");
        await claimGuestLinks(data.token);
        navigate("/user/dashboard");
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Google signup failed"));
      } finally {
        setIsGoogleLoading(false);
      }
    };

    let isMounted = true;

    const renderGoogleButton = () => {
      const container = googleButtonRef.current;
      if (!container || !window.google?.accounts?.id) return;
      container.innerHTML = "";
      const buttonWidth = Math.min(360, Math.max(240, Math.floor(container.clientWidth || 320)));
      initializeGoogleIdentity(googleClientId, handleGoogleCredential);
      window.google.accounts.id.renderButton(container, {
        type: "standard",
        shape: "pill",
        text: "continue_with",
        size: "large",
        width: buttonWidth,
      });
      setIsGoogleScriptLoading(false);
    };

    window.addEventListener("resize", renderGoogleButton);

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      setIsGoogleScriptLoading(true);
      loadGoogleIdentityScript()
        .then(() => {
          if (isMounted) renderGoogleButton();
        })
        .catch(() => {
          if (!isMounted) return;
          setIsGoogleScriptLoading(false);
          setError("Failed to load Google signup. Use email and password instead.");
        });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("resize", renderGoogleButton);
      setIsGoogleScriptLoading(false);
    };
  }, [googleClientId, googleLoadAttempt, isOtpStep, navigate]);

  return (
    <AuthShell
      title={isOtpStep ? "Verify your email" : "Create your account"}
      subtitle={
        isOtpStep
          ? "Enter the 6-digit OTP sent to your inbox to complete signup."
          : "Start free and create branded short links in seconds."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-teal-700 hover:text-teal-800">
            Sign in
          </Link>
        </>
      }
    >
      {!isOtpStep ? (
        <form onSubmit={handleInitSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Full name</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-teal-600"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                    <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Confirm password</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Retype your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-teal-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                    <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                    <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.name ||
              !formData.email ||
              !formData.password ||
              !formData.confirmPassword
            }
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Sending OTP..." : "Continue"}
          </button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.08em] text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex min-h-11 w-full flex-col items-center justify-center gap-2">
            {isGoogleLoading && <span className="text-xs text-slate-500">Signing up with Google...</span>}
            {googleLoadAttempt === 0 ? (
              <button
                type="button"
                onClick={() => setGoogleLoadAttempt(1)}
                className="w-full max-w-[360px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Continue with Google
              </button>
            ) : (
              <>
                {isGoogleScriptLoading && <span className="text-xs text-slate-500">Loading Google sign-in...</span>}
                <div ref={googleButtonRef} className={`google-auth-button w-full max-w-[360px] ${isGoogleLoading ? "hidden" : ""}`} />
              </>
            )}
          </div>

          <p className="text-center text-xs text-slate-500">
            Need to recover account?{" "}
            <Link to="/forgot-password" className="font-medium text-teal-700 hover:text-teal-800">
              Reset password
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">OTP code</span>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit OTP"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm tracking-[0.12em] outline-none transition focus:border-teal-600 sm:tracking-[0.35em]"
              required
            />
          </label>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <button
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
            className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify and continue"}
          </button>

          <button
            type="button"
            onClick={() => {
              setChallengeId(null);
              setOtpCode("");
              setError(null);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-500"
          >
            Edit details
          </button>
        </form>
      )}
    </AuthShell>
  );
}
