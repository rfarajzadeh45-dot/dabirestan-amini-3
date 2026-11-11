import { createFileRoute } from "@tanstack/react-router";

async function handle({ request }: { request: Request }) {
  const { handleBackendRequest } = await import("@/lib/backend-proxy.server");
  return handleBackendRequest(request);
}

export const Route = createFileRoute("/api/backend/$")({
  server: { handlers: { GET: handle, HEAD: handle, POST: handle, PATCH: handle, DELETE: handle, OPTIONS: () => new Response(null, { status: 403 }) } },
});