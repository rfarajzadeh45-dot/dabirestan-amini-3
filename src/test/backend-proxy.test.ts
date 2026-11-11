// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleBackendRequest } from "@/lib/backend-proxy.server";
import { loginErrorMessage } from "@/lib/login-error";

const config = { url: "https://backend.example", key: "sb_publishable_test" };
const token = "header.payload.signature";
const req = (path: string, method = "GET", body?: string, extra: Record<string, string> = {}) => new Request(`https://school.example/api/backend${path}`, {
  method, headers: { "X-School-BFF": "1", "Origin": "https://school.example", "Content-Type": "application/json", ...extra }, ...(body ? { body } : {}),
});
describe("Restricted school BFF", () => {
  it("requires a verified session for school data", async () => {
    const upstream = vi.fn();
    expect((await handleBackendRequest(req("/rest/v1/students"), upstream, config)).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("rejects forged sessions before data reaches RLS", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    expect((await handleBackendRequest(req("/rest/v1/students", "GET", undefined, { Authorization: `Bearer ${token}` }), upstream, config)).status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it("preserves the user bearer and RLS response, never cookies or privileged headers", async () => {
    const upstream = vi.fn().mockResolvedValueOnce(Response.json({ id: "user" })).mockResolvedValueOnce(Response.json([{ id: "visible-student" }], { headers: { "content-range": "0-0/1", "set-cookie": "unwanted=1" } }));
    const response = await handleBackendRequest(req("/rest/v1/students?select=id", "GET", undefined, { Authorization: `Bearer ${token}`, Cookie: "private=1", apikey: "attacker", "Accept-Profile": "auth" }), upstream, config);
    const [url, options] = upstream.mock.calls[1] ?? [];
    expect(String(url)).toBe("https://backend.example/rest/v1/students?select=id");
    expect(options.headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(options.headers.get("apikey")).toBe("sb_publishable_test");
    expect(options.headers.has("cookie")).toBe(false);
    expect(options.headers.has("accept-profile")).toBe(false);
    expect(options.redirect).toBe("error");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.json()).toEqual([{ id: "visible-student" }]);
  });
  it("never opens RPC, admin, storage or arbitrary target endpoints", async () => {
    for (const path of ["/rest/v1/rpc/has_role", "/auth/v1/admin/users", "/storage/v1/object", "/rest/v1/secrets", "/https://evil.example"]) {
      expect((await handleBackendRequest(req(path), vi.fn(), config)).status).toBe(404);
    }
  });
  it("rejects cross-site and simple browser requests", async () => {
    expect((await handleBackendRequest(req("/auth/v1/user", "GET", undefined, { Origin: "https://evil.example" }), vi.fn(), config)).status).toBe(403);
    expect((await handleBackendRequest(new Request("https://school.example/api/backend/auth/v1/user"), vi.fn(), config)).status).toBe(403);
  });
  it("supports password and refresh grants with bounded validated inputs", async () => {
    for (const [grant, body] of [["password", { email: "test@example.com", password: "test-only" }], ["refresh_token", { refresh_token: "test-only-refresh" }]] as const) {
      const upstream = vi.fn().mockResolvedValue(Response.json({ success: true }));
      expect((await handleBackendRequest(req(`/auth/v1/token?grant_type=${grant}`, "POST", JSON.stringify(body)), upstream, config)).status).toBe(200);
      expect(upstream.mock.calls[0]?.[1].headers.has("authorization")).toBe(false);
    }
    expect((await handleBackendRequest(req("/auth/v1/token?grant_type=client_credentials", "POST", "{}"), vi.fn(), config)).status).toBe(400);
  });
  it("supports authenticated logout without changing its scope", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect((await handleBackendRequest(req("/auth/v1/logout?scope=global", "POST", undefined, { Authorization: `Bearer ${token}` }), upstream, config)).status).toBe(204);
    expect(String(upstream.mock.calls[0]?.[0])).toContain("scope=global");
  });
  it("rejects oversized writes and off-origin signup callbacks", async () => {
    expect((await handleBackendRequest(req("/rest/v1/notes", "POST", JSON.stringify({ content: "x".repeat(262144) }), { Authorization: `Bearer ${token}` }), vi.fn(), config)).status).toBe(413);
    expect((await handleBackendRequest(req("/auth/v1/signup?redirect_to=https://evil.example", "POST", JSON.stringify({ email: "test@example.com", password: "test-only", data: { full_name: "test" } })), vi.fn(), config)).status).toBe(400);
  });
  it("reports backend failure without returning internal errors", async () => {
    const response = await handleBackendRequest(req("/auth/v1/user", "GET", undefined, { Authorization: `Bearer ${token}` }), vi.fn().mockRejectedValue(new Error("private upstream details")), config);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private upstream details");
  });
  it("does not classify network failures as wrong passwords", () => {
    expect(loginErrorMessage({ name: "AuthRetryableFetchError", status: 503 })).not.toBe(loginErrorMessage({ status: 400, code: "invalid_credentials" }));
  });
});