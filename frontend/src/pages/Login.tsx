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

type LoginFormData = {
  email: string;
  password: string;
};

const DEFAULT_GOOGLE_CLIENT_ID =
  "249537386676-1b3dkci1si4h0p79lt3v1470jug2a2j3.apps.googleusercontent.com";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleLoadAttempt, setGoogleLoadAttempt] = useState(0);
  const [isGoogleScriptLoading, setIsGoogleScriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  ).trim();

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Login failed"));
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("userName", data.fullName || "");
      await claimGuestLinks(data.token);
      navigate("/user/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || googleLoadAttempt === 0)
      return;

    const handleGoogleCredential = async (
      response: GoogleCredentialResponse,
    ) => {
      const idToken = response.credential;
      if (!idToken) {
        setError("Google login failed");
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
          throw new Error(await getApiErrorMessage(res, "Google login failed"));
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("userName", data.fullName || "");
        await claimGuestLinks(data.token);
        navigate("/user/dashboard");
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Google login failed"));
      } finally {
        setIsGoogleLoading(false);
      }
    };

    let isMounted = true;

    const renderGoogleButton = () => {
      const container = googleButtonRef.current;
      if (!container || !window.google?.accounts?.id) return;
      container.innerHTML = "";
      const buttonWidth = Math.min(
        360,
        Math.max(240, Math.floor(container.clientWidth || 320)),
      );
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
          setError(
            "Failed to load Google login. Use email and password instead.",
          );
        });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("resize", renderGoogleButton);
      setIsGoogleScriptLoading(false);
    };
  }, [googleClientId, googleLoadAttempt, navigate]);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage links, analytics, and billing in one dashboard."
      footer={
        <>
          New here?{" "}
          <Link
            to="/auth/signup"
            className="font-medium text-teal-700 hover:text-teal-800"
          >
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Email
          </span>
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
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Password</span>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-teal-600"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 transition hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                >
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.4 18.4 0 0 1-4.1 4.8" />
                  <path d="M6.6 6.7C3.7 8.6 2 12 2 12s4 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 fill-none stroke-current stroke-[1.8]"
                >
                  <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <div className="my-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs uppercase tracking-[0.08em] text-slate-500">
            or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="flex min-h-11 w-full flex-col items-center justify-center gap-2">
          {isGoogleLoading && (
            <span className="text-xs text-slate-500">
              Signing in with Google...
            </span>
          )}
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
              {isGoogleScriptLoading && (
                <span className="text-xs text-slate-500">
                  Loading Google sign-in...
                </span>
              )}
              <div
                ref={googleButtonRef}
                className={`google-auth-button w-full max-w-[360px] ${isGoogleLoading ? "hidden" : ""}`}
              />
            </>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
