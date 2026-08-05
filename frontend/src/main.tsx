import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { apiUrl } from "./lib/api.ts";

const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  // If the request is going to our API, ensure credentials are included
  if (urlStr.startsWith(apiUrl(""))) {
    const newInit = init || {};
    newInit.credentials = "include";
    return originalFetch(input, newInit);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
