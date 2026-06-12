import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TerminalShortener from "../components/TerminalShortener";
import Sections from "../components/Sections";
import Footer from "../components/Footer";
import "../styles/animations.css";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(localStorage.getItem("token")));

  useEffect(() => {
    const onStorage = () => setIsLoggedIn(Boolean(localStorage.getItem("token")));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    setIsLoggedIn(false);
  };

  return (
    <div className="app-shell min-h-screen text-slate-800">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 pb-0 pt-6 sm:px-6 sm:pt-10">
        <header className="border-b border-slate-900/10 px-1 pb-3 sm:px-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Link to="/" className="link-underline font-mono text-sm font-semibold text-teal-800 sm:text-base">
              shur.click
            </Link>
            <div className="order-2 flex items-center gap-2 sm:gap-3">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-slate-300 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 sm:px-4"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="rounded-full border border-slate-300 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 sm:px-4"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="rounded-full bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-800 sm:px-4"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2 text-center text-sm text-teal-900">
          <p className="flex flex-wrap items-center justify-center gap-2">
            <span className="beta-pill-glow inline-flex items-center rounded-full bg-teal-700 px-3 py-0.5 text-xs font-bold tracking-wide text-white">
              BETA
            </span>
            <span>
              We're in Beta Launch! Help us improve by sharing your{" "}
              <Link to="/feedback" className="font-semibold underline decoration-teal-500 underline-offset-2 hover:text-teal-800">
                feedback
              </Link>.
            </span>
          </p>
        </section>

        <section className="mt-8 sm:mt-12 animate-enter">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-center sm:p-8">
            <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Ad-free short links,
              <span className="block text-teal-700">clean and reliable</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
              Create custom short URLs, share with QR, and track clicks from one simple dashboard.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={isLoggedIn ? "/user/dashboard" : "/auth/signup"}
                className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                {isLoggedIn ? "Open dashboard" : "Start free, no ads"}
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Shorten links instantly</h2>
          </div>
          <TerminalShortener />
        </section>

        <Sections />

        <section className="mx-auto mt-12 w-full max-w-4xl border-t border-slate-200 pt-8 text-center">
          <h3 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ready to start?</h3>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isLoggedIn ? "/user/dashboard" : "/auth/signup"}
              className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              {isLoggedIn ? "Go to dashboard" : "Create free account"}
            </Link>
            {!isLoggedIn && (
              <Link
                to="/auth/login"
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-500"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>
        <div className="mt-auto pt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
