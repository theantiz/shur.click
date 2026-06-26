import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

type InfoPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function InfoPageShell({
  title,
  subtitle,
  children,
}: InfoPageShellProps) {
  return (
    <div className="app-shell min-h-screen text-slate-800">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 pb-0 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="font-mono text-sm font-semibold text-teal-800"
          >
            shur.click
          </Link>
          <Link
            to="/"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
          >
            Home
          </Link>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.7)] backdrop-blur sm:mt-8 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-700">
            {children}
          </div>
        </section>
        <div className="mt-auto pt-12">
          <Footer />
        </div>
      </main>
    </div>
  );
}
