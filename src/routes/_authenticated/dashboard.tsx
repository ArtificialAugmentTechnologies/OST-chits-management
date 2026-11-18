import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarClock, IndianRupee, Layers, CheckCircle2, Wallet, Receipt, CalendarDays, Trophy } from "lucide-react";
import { PageTitle, Panel } from "@/components/AppShell";
import { DepthSurface } from "@/components/DepthSurface";
import { PayDialog } from "@/components/PayDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstallmentGrid } from "@/components/InstallmentGrid";
import { useAuctions, useSubscriptions, usePayments, useUpcomingGroups, fmtDate } from "@/lib/data";
import { inr, usePrefs } from "@/lib/prefs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — OST Chits" }, { name: "description", content: "Your chit dues, groups and payments." }, { property: "og:title", content: "Dashboard — OST Chits" }, { property: "og:description", content: "Your chit dues, groups and payments." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = usePrefs();
  const { data: subs = [] } = useSubscriptions();
  const { data: pays = [] } = usePayments(5);
  const { data: upcoming = [] } = useUpcomingGroups();
  const qc = useQueryClient();
  const { data: interests = [] } = useQuery({
    queryKey: ["my-interests"],
    queryFn: async () => { const { data, error } = await supabase.from("chit_interests").select("group_id"); if (error) throw error; return data; },
  });
  const [pick, setPick] = useState<(typeof upcoming)[number] | null>(null);
  const [saving, setSaving] = useState(false);
  const register = async () => {
    if (!pick) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: m } = await supabase.from("members").select("id").eq("user_id", u.user?.id ?? "").maybeSingle();
    if (!m) { setSaving(false); toast.error("Only members can register"); return; }
    const { error } = await supabase.from("chit_interests").insert({ group_id: pick.id, member_id: m.id });
    setSaving(false);
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    toast.success("Registered! Admin has been notified.");
    qc.invalidateQueries({ queryKey: ["my-interests"] });
  };
  const { data: auctions = [] } = useAuctions();
  const myWins = auctions.filter((a) => subs.some((s) => s.id === a.subscription_id));
  const [paying, setPaying] = useState<{ id: string; amount: number } | null>(null);
  const due = subs.filter((s) => Number(s.net_due) > 0);
  const firstDue = due[0];
  const total = due.reduce((a, s) => a + Number(s.net_due), 0);

  return (
    <>
      <PageTitle title={t("dashboard")} />
      {myWins.map((a) => {
        const s = subs.find((x) => x.id === a.subscription_id);
        return (
          <div key={a.id} className="mb-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <Trophy className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-sm"><span className="font-bold">You have taken the chit</span> for {s?.chit_ref} in month {a.month_no}{a.prize_amount ? ` (${inr(a.prize_amount)})` : ""}. Please continue paying the remaining installments.</p>
          </div>
        );
      })}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="dashboard-total relative overflow-hidden rounded-xl bg-hero p-6 text-primary-foreground shadow-glow md:col-span-2">
          <Wallet aria-hidden="true" className="absolute right-6 top-6 h-14 w-14 text-primary-foreground/20" />
          <p className="text-sm opacity-85">{t("outstanding")} · {t("grandTotal")}</p>
          <p className="mt-1 font-display text-4xl font-extrabold sm:text-5xl">{inr(total)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {firstDue ? (
              <Button variant="secondary" size="lg" onClick={() => setPaying({ id: firstDue.id, amount: Number(firstDue.net_due) })}>
                {t("payNow")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4" /> {t("noDue")}</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <Stat icon={Layers} label={t("myGroups")} value={String(subs.length)} />
          <Stat icon={CalendarClock} label={t("nextAuction")} value={fmtDate(subs[0]?.chit_groups?.next_auction)} />
        </div>
      </div>

      <Panel className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Wallet className="h-5 w-5 text-primary" />{t("outstanding")}</h2>
        {due.length === 0 ? <Empty text={t("noDue")} /> : (
          <div className="divide-y">
            {due.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{s.chit_ref}</p>
                  <p className="text-xs text-muted-foreground">Net due</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold">{inr(s.net_due)}</span>
                  <Button onClick={() => setPaying({ id: s.id, amount: Number(s.net_due) })}>{t("payNow")}</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Layers className="h-5 w-5 text-primary" />{t("myGroups")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subs.map((s) => {
            const g = s.chit_groups;
            const pct = g ? Math.round((s.paid_upto / g.installments) * 100) : 0;
            return (
              <DepthSurface key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold">{s.chit_ref}</p>
                  <Badge variant="secondary">{s.enrol_position}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">{t("chitValue")}</dt><dd className="text-right font-semibold">{inr(g?.chit_value)}</dd>
                  <dt className="text-muted-foreground">{t("paidUpto")}</dt><dd className="text-right font-semibold">{s.paid_upto} / {g?.installments}</dd>
                  <dt className="text-muted-foreground">{t("nextAuction")}</dt><dd className="text-right font-semibold">{fmtDate(g?.next_auction, true)}</dd>
                </dl>
                {g && <div className="mt-3"><InstallmentGrid installments={g.installments} paidUpto={s.paid_upto} auctions={auctions.filter((a) => a.group_id === s.group_id)} mySubId={s.id} /></div>}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="progress-fill h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => setPaying({ id: s.id, amount: Number(s.net_due) > 0 ? Number(s.net_due) : Number(g?.sub_amount ?? 0) })}
                >
                  <Wallet aria-hidden="true" /> {t("payNow")} · {inr(Number(s.net_due) > 0 ? Number(s.net_due) : Number(g?.sub_amount ?? 0))}
                </Button>
              </DepthSurface>
            );
          })}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Receipt className="h-5 w-5 text-primary" />{t("recent")}</h2>
            <Link to="/payments" className="text-sm font-medium text-primary">View all</Link>
          </div>
          {pays.length === 0 ? <Empty text="No transactions yet" /> : (
            <div className="divide-y">
              {pays.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs">{p.txn_id}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.created_at, true)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{inr(p.amount)}</p>
                    <span className="text-[10px] font-bold text-success">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5 text-primary" />{t("upcoming")}</h2>
          {upcoming.length === 0 ? <Empty text="No upcoming groups" /> : (
            <div className="divide-y">
              {upcoming.map((g) => {
                const done = interests.some((i) => i.group_id === g.id);
                return (
                <div key={g.id} className="flex items-center justify-between gap-3 py-3">
                  <button type="button" className="text-left" onClick={() => setPick(g)}>
                    <p className="font-semibold text-primary underline-offset-2 hover:underline">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.installments} installments · {inr(g.sub_amount)}/month</p>
                  </button>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{inr(g.chit_value)}</p>
                    {done ? <Badge variant="secondary" className="mt-1 gap-1"><CheckCircle2 className="h-3 w-3" />Registered</Badge>
                      : <Button size="sm" variant="outline" className="mt-1 h-7" onClick={() => setPick(g)}>Register</Button>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <PayDialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)} subscriptionId={paying?.id ?? null} amount={paying?.amount ?? 0} />
      <Dialog open={!!pick} onOpenChange={(o) => !o && setPick(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{pick?.name}</DialogTitle></DialogHeader>
          {pick && (
            <div className="space-y-2 text-sm">
              <p>Chit value: <b>{inr(pick.chit_value)}</b></p>
              <p>Installments: <b>{pick.installments}</b> · <b>{inr(pick.sub_amount)}</b>/month</p>
              <p>Starts / first auction: <b>{fmtDate(pick.next_auction)}</b></p>
              {interests.some((i) => i.group_id === pick.id)
                ? <p className="rounded-lg bg-primary/10 p-3 text-primary">You have registered your interest. Our office will contact you soon.</p>
                : <Button className="w-full" disabled={saving} onClick={register}>Register my interest</Button>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ icon: I, label, value }: { icon: typeof IndianRupee; label: string; value: string }) {
  return (
    <DepthSurface className="rounded-xl border bg-card p-4">
      <span className="depth-icon"><I aria-hidden="true" /></span>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </DepthSurface>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty-tint rounded-xl bg-muted py-8 text-center text-sm text-muted-foreground">{text}</p>;
}
