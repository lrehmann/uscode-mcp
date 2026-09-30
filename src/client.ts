import type { StatuteApi } from "./server.js";
export function createApiClient(origin = "https://uscode.ecfr.io", fetcher: typeof fetch = fetch): StatuteApi {
  const base = new URL(origin);
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") throw new Error("USCODE_ORIGIN must use HTTPS.");
  async function get(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`/api/v1/${endpoint}`, base);
    url.search = new URLSearchParams(params).toString();
    const response = await fetcher(url, { headers: { accept: "application/json", "user-agent": "uscode-mcp/1.0.0 (+https://github.com/lrehmann/uscode-mcp)" }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`US Code API returned ${response.status}. Retry if temporarily unavailable.`);
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("US Code did not return JSON.");
    return await response.json() as Record<string, unknown>;
  }
  return { titles: () => get("titles"), search: (query, limit = 10) => get("search", { q: query, limit: String(limit) }), section: (path, offset = 0, length = 20000) => get("section", { path, offset: String(offset), length: String(length) }) };
}
