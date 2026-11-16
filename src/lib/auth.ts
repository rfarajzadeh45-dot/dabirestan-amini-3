import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { primaryRole, type AppRole } from "@/lib/username";

export type Me = {
  id: string;
  username: string | null;
  fullName: string;
  role: AppRole | null;
  isAdmin: boolean;
  isStaff: boolean;
};

export async function fetchMyRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return primaryRole((data ?? []).map((r) => r.role as string));
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const [role, { data: profile }] = await Promise.all([
        fetchMyRole(user.id),
        supabase.from("profiles").select("full_name,username").eq("id", user.id).maybeSingle(),
      ]);
      return {
        id: user.id,
        username: profile?.username ?? null,
        fullName: profile?.full_name || (user.user_metadata?.["full_name"] as string) || profile?.username || "",
        role,
        isAdmin: role === "admin",
        isStaff: role === "admin" || role === "teacher",
      };
    },
    staleTime: 60_000,
  });
}
