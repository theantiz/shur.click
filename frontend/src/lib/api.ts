const DEFAULT_PRODUCTION_API_BASE_URL = "https://api.shur.click";
const DEFAULT_DEV_API_BASE_URL = "http://localhost:2000"; // fixed name

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/+$/, "") ?? "";

function detectDefaultBaseUrl(): string {
  if (typeof window === "undefined") {
    // SSR / build: fall back to production by default
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  const hostname = window.location.hostname;

  // localhost / 127.x / ::1 -> dev API
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (isLocalhost) {
    return DEFAULT_DEV_API_BASE_URL;
  }

  // shur.click (and subdomains) -> production API
  if (hostname === "shur.click" || hostname.endsWith(".shur.click")) {
    return DEFAULT_PRODUCTION_API_BASE_URL;
  }

  // Fallback: production
  return DEFAULT_PRODUCTION_API_BASE_URL;
}

// If VITE_API_BASE_URL is set, use it; otherwise pick based on hostname.
const apiBaseUrl = configuredApiBaseUrl || detectDefaultBaseUrl();

export function apiUrl(path: string): string {
  // If caller passes an absolute URL, respect it.
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${apiBaseUrl}${normalizedPath}`;
}
