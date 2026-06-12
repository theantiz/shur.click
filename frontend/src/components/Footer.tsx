import { Link } from "react-router-dom";

type FooterProps = {
  productName?: string;
};

export default function Footer({
  productName = "shur.click",
}: FooterProps) {
  const year = new Date().getFullYear();
  const footerLinks = [
    { label: "Home", to: "/" },
    { label: "Terms of Service", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "License", to: "/license" },
    { label: "Feedback", to: "/feedback" },
  ];

  return (
    <footer className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-slate-200 bg-slate-100 py-9 text-center sm:py-10">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="flex items-center justify-center gap-2 text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-500 bg-slate-100 text-[10px] font-bold leading-none">
            SC
          </span>
          <span className="text-lg font-medium tracking-tight">_{productName}</span>
        </div>

        <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-y-2 text-sm text-slate-600">
          {footerLinks.map((item, idx) => (
            <li key={item.to} className="flex items-center">
              <Link to={item.to} className="link-underline px-2 transition hover:text-slate-900 sm:px-3">
                {item.label}
              </Link>
              {idx < footerLinks.length - 1 && (
                <span aria-hidden="true" className="text-slate-400">
                  |
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-slate-500 sm:mt-5">
          &copy; {year} {productName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
