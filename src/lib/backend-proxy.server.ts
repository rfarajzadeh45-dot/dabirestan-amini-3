import { z } from "zod";

const tables = new Set(["profiles", "user_roles", "classes", "teacher_classes", "students", "subjects", "attendance", "grades", "notes"]);
const methods = new Set(["GET", "POST", "PATCH", "DELETE", "HEAD"]);
const maxBody = 256 * 1024;
const password = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(72), gotrue_meta_security: z.object({ captcha_token: z.string().max(8192).optional() }).optional() }).strict();
const refresh = z.object({ refresh_token: z.string().min(1).max(8192) }).strict();
const signup = password.extend({ data: z.object({ full_name: z.string().trim().min(1).max(80) }).strict(), code_challenge: z.string().max(256).optional(), code_challenge_method: z.enum(["s256", "plain"]).optional() });

function fail(status: number, message: string) {
  return Response.json({ message, code: "bff_request_failed" }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > maxBody) { await reader.cancel(); throw new Error("Body too large"); }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

// Fixed upstream, finite endpoints, user bearer only. No admin key, cookies or arbitrary headers.
export async function handleBackendRequest(request: Request, fetcher: typeof fetch = fetch, config?: { url: string; key: string }) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (request.headers.get("X-School-BFF") !== "1" || (origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return fail(403, "Forbidden origin");
  if (!methods.has(request.method)) return fail(405, "Method not allowed");
  if (url.search.length > 16000 || url.pathname.includes("%") || url.pathname.includes("\\")) return fail(400, "Invalid request");
  const path = url.pathname.slice("/api/backend".length);
  const table = /^\/rest\/v1\/([a-z_]+)$/.exec(path)?.[1];
  const isData = !!table && tables.has(table);
  const isToken = path === "/auth/v1/token" && request.method === "POST";
  const isSignup = path === "/auth/v1/signup" && request.method === "POST";
  const isUser = path === "/auth/v1/user" && request.method === "GET";
  const isLogout = path === "/auth/v1/logout" && request.method === "POST";
  if (!isData && !isToken && !isSignup && !isUser && !isLogout) return fail(404, "Unsupported endpoint");
  const bearer = request.headers.get("authorization");
  if ((isData || isUser || isLogout) && (!bearer || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(bearer) || bearer.length > 16384)) return fail(401, "Authentication required");
  if (isData && [...url.searchParams].some(([name, value]) => name.length > 128 || value.length > 12000)) return fail(400, "Invalid query");
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (Number(request.headers.get("content-length")) > maxBody) return fail(413, "Request too large");
    try { body = await readBody(request); } catch { return fail(413, "Request too large"); }
    if (body) {
      if (!request.headers.get("content-type")?.startsWith("application/json")) return fail(415, "JSON required");
      try {
        const parsed: unknown = JSON.parse(body);
        if (isToken) {
          const grant = url.searchParams.get("grant_type");
          if (grant === "password") password.parse(parsed);
          else if (grant === "refresh_token") refresh.parse(parsed);
          else return fail(400, "Unsupported grant");
        } else if (isSignup) signup.parse(parsed);
        else if (isData && (!parsed || typeof parsed !== "object" || (Array.isArray(parsed) && parsed.length > 500))) return fail(400, "Invalid data");
      } catch { return fail(400, "Invalid request body"); }
    } else if (isToken || isSignup) return fail(400, "Missing request body");
  }
  if (!isData) {
    const allowed = isToken ? ["grant_type"] : isSignup ? ["redirect_to"] : isLogout ? ["scope"] : [];
    if ([...url.searchParams.keys()].some((name) => !allowed.includes(name))) return fail(400, "Unsupported parameter");
    const redirect = url.searchParams.get("redirect_to");
    if (redirect) { try { if (new URL(redirect).origin !== url.origin) return fail(400, "Invalid redirect"); } catch { return fail(400, "Invalid redirect"); } }
    if (isLogout && url.searchParams.has("scope") && !["global", "local", "others"].includes(url.searchParams.get("scope") ?? "")) return fail(400, "Invalid scope");
  }
  const upstream = config?.url ?? process.env["SUPABASE_URL"];
  const key = config?.key ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!upstream || !key) return fail(503, "Backend unavailable");
  const base = new URL(upstream);
  const headers = new Headers({ apikey: key });
  if (bearer && (isData || isUser || isLogout)) headers.set("Authorization", bearer);
  if (body) headers.set("Content-Type", "application/json");
  if (isData) for (const name of ["accept", "prefer", "range", "range-unit"]) {
    const value = request.headers.get(name);
    if (value && value.length <= 1024) headers.set(name, value);
  }
  try {
    if (isData) {
      const verified = await fetcher(new URL("/auth/v1/user", base), { headers: new Headers({ apikey: key, Authorization: bearer ?? "" }), redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!verified.ok) { await verified.body?.cancel(); return fail(verified.status >= 500 ? 503 : 401, "Session verification failed"); }
      await verified.body?.cancel();
    }
    const target = new URL(path, base);
    target.search = url.search;
    const response = await fetcher(target, { method: request.method, headers, ...(body ? { body } : {}), redirect: "error", signal: AbortSignal.timeout(20000) });
    const resultHeaders = new Headers({ "Cache-Control": "private, no-store", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "Vary": "Authorization" });
    for (const name of ["content-type", "content-range", "range-unit", "preference-applied", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: resultHeaders });
  } catch { return fail(503, "Backend connection unavailable"); }
}