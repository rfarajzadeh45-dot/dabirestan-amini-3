import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/lib/backend-client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
