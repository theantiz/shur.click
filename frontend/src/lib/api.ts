const DEFAULT_PRODUCTION_API_BASE_URL = "https://api.shur.click";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/+$/, "") ?? "";

// Keep dev/local calls relative for Vite proxy, but do not rely on production /api rewrites.
const apiBaseUrl =
  configuredApiBaseUrl ||
  (import.meta.env.PROD ? DEFAULT_PRODUCTION_API_BASE_URL : "");

export function apiUrl(path: string): string {
  // If caller passes an absolute URL, respect it.
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!apiBaseUrl) return normalizedPath; // -> /api/... in dev/local
  return `${apiBaseUrl}${normalizedPath}`;
}

