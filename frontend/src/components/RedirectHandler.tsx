import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../lib/api";

export default function RedirectHandler() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const codePattern = /^[a-zA-Z0-9_-]{3,20}$/;
    const c = code?.trim() ?? "";
    if (!c || !codePattern.test(c)) {
      navigate("/", { replace: true });
      return;
    }

    // Navigate to backend redirect endpoint which will issue a 302 to the long URL.
    // Using replace so the short URL isn't kept in history.
    const target = apiUrl(`/${encodeURIComponent(c)}`);
    window.location.replace(target);
  }, [code, navigate]);

  return (
    <div className="app-shell min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-slate-600">Redirecting…</p>
      </div>
    </div>
  );
}
