import { apiUrl } from "./api";

export const GUEST_COUNT_KEY = "guest_shorten_count";
export const GUEST_LIMIT = 2;

const GUEST_TOKEN_KEY = "guest_link_token";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getGuestCount(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementGuestCount(): number {
  try {
    const next = getGuestCount() + 1;
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function getOrCreateGuestToken(): string {
  try {
    const existing = localStorage.getItem(GUEST_TOKEN_KEY);
    if (existing && /^[a-zA-Z0-9_-]{16,80}$/.test(existing)) return existing;

    const next = randomToken();
    localStorage.setItem(GUEST_TOKEN_KEY, next);
    return next;
  } catch {
    return randomToken();
  }
}

export function clearGuestLinkState() {
  try {
    localStorage.removeItem(GUEST_COUNT_KEY);
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // ignore storage failures
  }
}

export async function claimGuestLinks(token: string): Promise<number> {
  try {
    const guestToken = localStorage.getItem(GUEST_TOKEN_KEY);
    if (!guestToken) return 0;

    const response = await fetch(apiUrl("/api/urls/claim-guest"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ guestToken }),
    });

    if (!response.ok) return 0;

    const data = (await response.json()) as { claimed?: number };
    clearGuestLinkState();
    return data.claimed ?? 0;
  } catch {
    return 0;
  }
}
