import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, School, Users, Settings, LogOut, GraduationCap, Search } from "lucide-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { fa } from "@/lib/fa";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name,sort_order").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const main = [
    { title: "داشبورد", url: "/dashboard", icon: LayoutDashboard },
    { title: "کلاس‌ها", url: "/classes", icon: School },
    { title: "دانش‌آموزان", url: "/students", icon: Users },
    ...(me?.isAdmin ? [{ title: "تنظیمات", url: "/settings", icon: Settings }] : []),
  ] as const;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar side="right" collapsible="icon">
          <SidebarHeader className="px-3 py-4">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                <GraduationCap className="size-5" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-bold text-sidebar-accent-foreground">مدیریت مدرسه</p>
                <p className="truncate text-xs text-sidebar-foreground/60">سال تحصیلی ۱۴۰۵-۱۴۰۴</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50">منو</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {main.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={path.startsWith(item.url)} tooltip={item.title}>
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50">کلاس‌ها</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {classes?.map((c) => (
                    <SidebarMenuItem key={c.id}>
                      <SidebarMenuButton asChild isActive={path === `/classes/${c.id}`} tooltip={c.name}>
                        <Link to="/classes/$classId" params={{ classId: c.id }}>
                          <span className="grid size-4 place-items-center text-[10px] font-bold">{fa(c.sort_order)}</span>
                          <span>کلاس {c.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 rounded-lg p-2 group-data-[collapsible=icon]:hidden">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
                {me?.fullName?.[0] ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-sidebar-accent-foreground">{me?.fullName}</p>
                <p className="text-xs text-sidebar-foreground/60">{me?.isAdmin ? "مدیر" : "معلم"}</p>
              </div>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="خروج"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut />
                  <span>خروج</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <form
              className="relative max-w-md flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/students", search: { q: q.trim() || undefined } });
              }}
            >
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجوی دانش‌آموز (نام یا شماره)…"
                className="h-10 rounded-full bg-card pr-9"
              />
            </form>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
