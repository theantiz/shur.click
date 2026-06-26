export async function getApiErrorMessage(
  response: Response,
  fallback: string,
  statusMessages: Partial<Record<number, string>> = {},
): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload?.error === "string" && payload.error.trim()) {
        if (
          payload.error === "Database constraint violation" &&
          statusMessages[response.status]
        ) {
          return statusMessages[response.status] as string;
        }
        return payload.error;
      }
      if (typeof payload?.message === "string" && payload.message.trim()) {
        if (
          payload.message === "Database constraint violation" &&
          statusMessages[response.status]
        ) {
          return statusMessages[response.status] as string;
        }
        return payload.message;
      }
    } else {
      const text = await response.text();
      if (text.trim()) return text;
    }
  } catch {
    // ignore parse errors and use fallback
  }
  if (statusMessages[response.status]) {
    return statusMessages[response.status] as string;
  }
  return fallback;
}
