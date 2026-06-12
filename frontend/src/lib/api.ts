// Always use relative calls in dev/local so Vite proxy + backend CORS work correctly.
// Only allow absolute API URLs when explicitly enabled.
const apiBaseUrl =
  import.meta.env?.VITE_FORCE_ABSOLUTE_API_URL === "true"
    ? (import.meta as any).env?.VITE_API_BASE_URL?.toString().replace(/\/+$/, "")
    : "";

export function apiUrl(path: string): string {
  // If caller passes an absolute URL, respect it.
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!apiBaseUrl) return normalizedPath; // -> /api/... (goes through Vite proxy)
  return `${apiBaseUrl}${normalizedPath}`;
}


