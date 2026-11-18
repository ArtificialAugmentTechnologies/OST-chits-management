import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FileText, Receipt, User, Phone, Shield, Settings, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePrefs, type TKey } from "@/lib/prefs";
import { SettingsSheet } from "@/components/SettingsSheet";
import { Button } from "@/components/ui/button";
import { Logo, CreatedBy } from "@/components/Brand";
import { ProfileSetupDialog } from "@/components/ProfileForm";
import { needsProfile } from "@/lib/profile.functions";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return null;
      const [{ data: member }, { data: roles }] = await Promise.all([
        supabase.from("members").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      return {
        uid,
        phone: (u.user?.user_metadata?.['phone'] as string) ?? "",
        member,
        isAdmin: !!roles?.some((r) => r.role === "admin"),
      };
    },
  });
}

const NAV: { to: string; key: TKey; icon: typeof User; admin?: boolean }[] = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/account", key: "account", icon: FileText },
  { to: "/payments", key: "payments", icon: Receipt },
  { to: "/profile", key: "profile", icon: User },
  { to: "/contact", key: "contact", icon: Phone },
  { to: "/admin", key: "admin", icon: Shield, admin: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = usePrefs();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const items = NAV.filter((n) => !n.admin || me?.isAdmin);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="portal-shell min-h-screen bg-background">
      <aside className="portal-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-sidebar p-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="portal-nav flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground shadow-glow hover:bg-primary hover:text-primary-foreground" }}
            >
              <span className="depth-icon"><n.icon aria-hidden="true" /></span> {t(n.key)}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" onClick={signOut} className="portal-nav flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /> {t("logout")}
        </Button>
        <CreatedBy className="mt-4" />
      </aside>

      <div className="lg:pl-64">
        <header className="portal-header sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden"><Logo compact /></div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{t("welcome")}</p>
                <p className="truncate font-display text-sm font-bold sm:text-base">
                  {me?.member?.full_name ?? (me?.isAdmin ? "Administrator" : "…")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SettingsSheet>
                <Button variant="ghost" size="icon" aria-label={t("settings")} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-muted">
                  <Settings className="h-5 w-5" />
                </Button>
              </SettingsSheet>
              <Button variant="ghost" size="icon" aria-label={t("logout")} onClick={signOut} className="grid h-10 w-10 place-items-center rounded-xl text-destructive hover:bg-destructive/10 lg:hidden">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="portal-main mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12"><div key={pathname} className="portal-page">{children}</div></main>
        <CreatedBy className="pb-24 lg:hidden" />
      </div>

      {me?.member && !me.isAdmin && needsProfile(me.member) && <ProfileSetupDialog member={me.member} />}

      <nav className="portal-tabbar fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl justify-around px-1 py-1.5">
          {items.filter((n) => n.to !== "/contact").map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="portal-nav flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <span className="depth-icon"><n.icon aria-hidden="true" /></span>
              <span className="w-full truncate text-center">{t(n.key)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string | undefined; right?: ReactNode }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const Icon = NAV.find((item) => item.to === pathname)?.icon ?? LayoutDashboard;
  return (
    <div className="page-title mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="depth-icon"><Icon aria-hidden="true" /></span>
        <div className="min-w-0"><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
      </div>
      {right}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`portal-panel border bg-card p-4 sm:p-6 ${className}`}>{children}</section>;
}

export function Empty({ text }: { text: string }) {
  return <p className="empty-tint rounded-xl bg-muted py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
