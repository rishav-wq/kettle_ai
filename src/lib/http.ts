/**
 * Small fetch wrapper for the client.
 *
 * Sends same-origin credentials and a JSON content type, which is what the
 * origin check on the server expects. Never throws on a non-2xx; the caller
 * decides what a 429 or a 403 means for the screen it is on.
 */
export async function post<T = unknown>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { ok: res.ok, status: res.status, body: parsed as T };
}

export async function send<T = unknown>(method: "PATCH" | "DELETE", url: string, body?: unknown): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { ok: res.ok, status: res.status, body: parsed as T };
}
