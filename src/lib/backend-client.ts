import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";

let client: ReturnType<typeof createClient<Database>> | undefined;

// Keep the original storage key: existing accounts and browser sessions remain valid.
function getClient() {
  if (client) return client;
  const url = import.meta.env['VITE_SUPABASE_URL'];
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  client = createClient<Database>(url, key, {
    auth: {
      storageKey: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`,
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (input, init) => {
        if (typeof window === "undefined") throw new Error("School client is browser-only");
        const source = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        if (source.origin !== new URL(url).origin) throw new Error("Unsupported backend destination");
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
        headers.delete("apikey");
        if (headers.get("authorization") === `Bearer ${key}`) headers.delete("authorization");
        headers.set("X-School-BFF", "1");
        const target = `/api/backend${source.pathname}${source.search}`;
        return fetch(target, { ...init, headers, credentials: "same-origin", redirect: "error" });
      },
    },
  });
  return client;
}

export const supabase = new Proxy({} as ReturnType<typeof getClient>, {
  get(_target, prop) { return Reflect.get(getClient(), prop); },
});