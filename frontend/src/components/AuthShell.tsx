import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="app-shell grid min-h-svh place-items-center px-3 py-6 text-slate-800 sm:px-4 sm:py-10">
      <main className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.7)] backdrop-blur sm:rounded-3xl sm:p-8">
        <div className="min-w-0 text-center">
          <Link
            to="/"
            className="font-mono text-sm font-semibold text-teal-800"
          >
            shur.click
          </Link>
          <p className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-500 sm:tracking-[0.12em]">
            Smart Link Platform
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>

        <div className="mt-6 min-w-0">{children}</div>
        <div className="mt-5 min-w-0 text-center text-sm text-slate-600">
          {footer}
        </div>
      </main>
    </div>
  );
}
