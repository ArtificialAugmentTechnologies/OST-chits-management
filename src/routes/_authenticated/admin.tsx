import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, Empty, useMe } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayments, useAuctions, fmtDate } from "@/lib/data";
import { inr } from "@/lib/prefs";
import { useServerFn } from "@tanstack/react-start";
import { Download, Users, Layers, UserPlus, Receipt, CheckCircle2, X, HandCoins, Trophy, LayoutGrid, ArrowLeft, ArrowRight } from "lucide-react";
import { InstallmentGrid } from "@/components/InstallmentGrid";
import { reviewCashPayment } from "@/lib/pay.functions";
import { downloadReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — OST Chits" }, { name: "description", content: "Manage members, chit groups and subscriptions." }, { property: "og:title", content: "Admin — OST Chits" }, { property: "og:description", content: "Manage members, chit groups and subscriptions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    tab: TABS.includes(String(search["tab"])) ? String(search["tab"]) : undefined,
    group: typeof search["group"] === "string" && search["group"] ? search["group"] : undefined,
  }),
  component: AdminPage,
});

type AdminSearch = { tab?: string | undefined; group?: string | undefined };
const TABS = ["members", "groups", "subs", "pays", "tracker"];

function useTable<T extends "members" | "chit_groups" | "subscriptions">(table: T) {
  return useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      const sel = table === "subscriptions" ? "*, members(full_name, phone), chit_groups(name)" : "*";
      const { data, error } = await supabase.from(table).select(sel).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

function AdminPage() {
  const { data: me, isLoading } = useMe();
  const { tab: tabParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tab = tabParam ?? "members";
  if (isLoading) return null;
  if (!me?.isAdmin) return <Empty text="You don't have access to this page." />;
  return (
    <>
      <PageTitle title="Admin Panel" sub="Every record you add here is saved to the database instantly." />
      <Interests />
      <Tabs value={tab} onValueChange={(t) => navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, tab: t }) })}>
        <TabsList className="mb-4 flex h-auto flex-wrap">
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" />Members</TabsTrigger>
          <TabsTrigger value="groups" className="gap-2"><Layers className="h-4 w-4" />Chit Groups</TabsTrigger>
          <TabsTrigger value="subs" className="gap-2"><UserPlus className="h-4 w-4" />Enrolments</TabsTrigger>
          <TabsTrigger value="pays" className="gap-2"><Receipt className="h-4 w-4" />Payments</TabsTrigger>
          <TabsTrigger value="tracker" className="gap-2"><LayoutGrid className="h-4 w-4" />Chit Tracker</TabsTrigger>
        </TabsList>
        <TabsContent value="members"><Members /></TabsContent>
        <TabsContent value="groups"><Groups /></TabsContent>
        <TabsContent value="subs"><Subs /></TabsContent>
        <TabsContent value="pays"><Pays /></TabsContent>
        <TabsContent value="tracker"><Tracker /></TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function useSave(table: string) {
  const qc = useQueryClient();
  return async (e: FormEvent<HTMLFormElement>, row: Record<string, unknown>) => {
    e.preventDefault();
    const { error } = await supabase.from(table as "members").insert(row as never);
    if (error) return toast.error(error.message), false;
    toast.success("Saved");
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries();
    return true;
  };
}

function Members() {
  const { data = [] } = useTable("members");
  const save = useSave("members");
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel>
        <h3 className="mb-4 font-bold">Add member</h3>
        <form className="space-y-3" onSubmit={(e) => {
          const f = new FormData(e.currentTarget);
          const phone = String(f.get("phone"));
          if (!/^[6-9]\d{9}$/.test(phone)) { e.preventDefault(); toast.error("Invalid mobile"); return; }
          save(e, { full_name: f.get("full_name"), phone, email: f.get("email") || null, address: f.get("address") || null });
        }}>
          <Field label="Full name"><Input name="full_name" required maxLength={100} /></Field>
          <Field label="Mobile"><Input name="phone" required maxLength={10} inputMode="numeric" /></Field>
          <Field label="Email"><Input name="email" type="email" maxLength={255} /></Field>
          <Field label="Address"><Input name="address" maxLength={300} /></Field>
          <Button className="w-full"><UserPlus />Save member</Button>
        </form>
      </Panel>
      <DataTable heads={["Name", "Mobile", "Email", "Signed in"]} rows={data.map((m) => [m.full_name, m.phone, m.email ?? "—", m.user_id ? "Yes" : "No"])} />
    </div>
  );
}

function Groups() {
  const { data = [] } = useTable("chit_groups");
  const { data: subs = [] } = useTable("subscriptions");
  const { data: auctions = [] } = useAuctions();
  const save = useSave("chit_groups");
  const [status, setStatus] = useState("running");
  const { group } = Route.useSearch();
  const { closeGroup } = useAdminNav();
  const selected = group ? data.find((g) => g.id === group) : undefined;
  if (selected) return (
    <GroupMembers
      group={selected}
      subs={subs.filter((s) => s.group_id === selected.id)}
      auctions={auctions.filter((a) => a.group_id === selected.id)}
      onBack={closeGroup}
    />
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel>
        <h3 className="mb-4 font-bold">Add chit group</h3>
        <form className="space-y-3" onSubmit={(e) => {
          const f = new FormData(e.currentTarget);
          const na = f.get("next_auction");
          save(e, { name: f.get("name"), chit_value: Number(f.get("chit_value")), installments: Number(f.get("installments")), sub_amount: Number(f.get("sub_amount")), next_auction: na ? new Date(String(na)).toISOString() : null, status });
        }}>
          <Field label="Group name"><Input name="name" required maxLength={40} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chit value"><Input name="chit_value" type="number" min={1} required /></Field>
            <Field label="Installments"><Input name="installments" type="number" min={1} required /></Field>
          </div>
          <Field label="Monthly amount"><Input name="sub_amount" type="number" min={1} required /></Field>
          <Field label="Next auction"><Input name="next_auction" type="datetime-local" /></Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="running">Running</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem></SelectContent>
            </Select>
          </Field>
          <Button className="w-full"><Layers />Save group</Button>
        </form>
      </Panel>
      <DataTable heads={["Group", "Value", "Inst.", "Monthly", "Next auction", "Status", "Members"]} rows={data.map((g) => {
        const n = subs.filter((s) => s.group_id === g.id).length;
        return [
          <GroupLink key="name" id={g.id} name={g.name} />,
          inr(g.chit_value), g.installments, inr(g.sub_amount), fmtDate(g.next_auction, true), g.status,
          <GroupLink key="members" id={g.id} name={`${n} member${n === 1 ? "" : "s"}`} />,
        ];
      })} />
    </div>
  );
}

function Subs() {
  const { data = [] } = useTable("subscriptions");
  const { data: members = [] } = useTable("members");
  const { data: groups = [] } = useTable("chit_groups");
  const save = useSave("subscriptions");
  const [memberId, setMemberId] = useState("");
  const [groupId, setGroupId] = useState("");
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel>
        <h3 className="mb-4 font-bold">Enrol member in group</h3>
        <form className="space-y-3" onSubmit={(e) => {
          if (!memberId || !groupId) { e.preventDefault(); toast.error("Pick member and group"); return; }
          const f = new FormData(e.currentTarget);
          save(e, { member_id: memberId, group_id: groupId, chit_ref: f.get("chit_ref"), enrol_position: f.get("enrol_position") || "NPS", net_due: Number(f.get("net_due") || 0), paid_upto: Number(f.get("paid_upto") || 0) });
        }}>
          <Field label="Member">
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} · {m.phone}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Group">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
              <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Chit reference"><Input name="chit_ref" required maxLength={40} placeholder="OST80519-29" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Position"><Input name="enrol_position" defaultValue="NPS" /></Field>
            <Field label="Paid upto"><Input name="paid_upto" type="number" min={0} defaultValue={0} /></Field>
            <Field label="Net due"><Input name="net_due" type="number" min={0} defaultValue={0} /></Field>
          </div>
          <Button className="w-full"><CheckCircle2 />Save enrolment</Button>
        </form>
      </Panel>
      <DataTable heads={["Chit Ref", "Member", "Group", "Paid upto", "Net due"]} rows={data.map((s) => [s.chit_ref, s.members?.full_name, <GroupLink key="g" id={s.group_id} name={s.chit_groups?.name} />, s.paid_upto, inr(s.net_due)])} />
    </div>
  );
}

function Pays() {
  const { data = [] } = usePayments();
  const review = useServerFn(reviewCashPayment);
  const qc = useQueryClient();
  const [busy, setBusy] = useState("");
  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      await review({ data: { paymentId: id, approve } });
      toast.success(approve ? "Payment approved — marked Success" : "Request rejected");
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setBusy("");
  };
  const pending = data.filter((p) => p.status === "PENDING");
  return (
    <div className="space-y-6">
      <Panel>
        <h3 className="mb-4 flex items-center gap-2 font-bold"><HandCoins className="h-5 w-5 text-primary" />In-hand payment requests ({pending.length})</h3>
        {pending.length === 0 ? <Empty text="No pending requests" /> : (
          <div className="divide-y">
            {pending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{p.members?.full_name} · {p.members?.phone}</p>
                  <p className="text-xs text-muted-foreground">{p.subscriptions?.chit_ref} · <span className="font-mono">{p.txn_id}</span> · {fmtDate(p.created_at, true)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{inr(p.amount)}</span>
                  <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => act(p.id, false)}><X />Reject</Button>
                  <Button size="sm" disabled={busy === p.id} onClick={() => act(p.id, true)}><CheckCircle2 />Cash received · Approve</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <DataTable heads={["Txn ID", "Member", "Chit Ref", "Mode", "Date", "Amount", "Status", "Receipt"]} rows={data.map((p) => [p.txn_id, p.members?.full_name, p.subscriptions?.chit_ref, p.method === "CASH" ? "In Hand" : "Online", fmtDate(p.created_at, true), inr(p.amount), p.status,
        p.status === "SUCCESS" ? <Button variant="ghost" size="icon" aria-label="Download receipt" title="Download receipt" onClick={() => downloadReceipt(p)} className="text-primary"><Download className="h-4 w-4" /></Button> : "—"])} />
    </div>
  );
}

function DataTable({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return (
    <Panel className="p-0 sm:p-0">
      {rows.length === 0 ? <div className="p-4"><Empty text="No records" /></div> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{heads.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="whitespace-nowrap">{c}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}

function useAdminNav() {
  const navigate = useNavigate({ from: Route.fullPath });
  return {
    openGroup: (id: string) => navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, group: id, tab: "groups" }) }),
    closeGroup: () => navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, group: undefined }) }),
    openTracker: (id: string) => navigate({ to: Route.fullPath, search: (prev) => ({ ...prev, group: id, tab: "tracker" }) }),
  };
}

/** Chit group name that opens that group's member list. */
function GroupLink({ id, name }: { id?: string; name?: string }) {
  const { openGroup } = useAdminNav();
  if (!id) return <>{name ?? "—"}</>;
  return (
    <button
      type="button"
      onClick={() => openGroup(id)}
      title="See the members in this chit"
      className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
    >
      {name ?? "Group"}
      <ArrowRight className="h-3 w-3 opacity-60" />
    </button>
  );
}

function GroupMembers({ group, subs, auctions, onBack }: { group: any; subs: any[]; auctions: any[]; onBack: () => void }) {
  const { openTracker } = useAdminNav();
  const takenMonth = new Map(auctions.map((a) => [a.subscription_id as string, a.month_no as number]));
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-1 text-primary">
              <ArrowLeft className="h-4 w-4" />Back to all chit groups
            </Button>
            <h3 className="font-display text-xl font-bold">{group.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {subs.length} member{subs.length === 1 ? "" : "s"} in this chit · {inr(group.chit_value)} · {group.installments} months · {inr(group.sub_amount)} / month · {group.status}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => openTracker(group.id)}>
            <LayoutGrid className="h-4 w-4" />Open tracker
          </Button>
        </div>
      </Panel>
      <DataTable
        heads={["Member", "Mobile", "Chit Ref", "Position", "Paid", "To pay", "Net due", "Chit taken"]}
        rows={subs.map((s) => [
          s.members?.full_name ?? "—",
          s.members?.phone ?? "—",
          s.chit_ref,
          s.enrol_position,
          `${s.paid_upto} of ${group.installments}`,
          Math.max(0, group.installments - s.paid_upto),
          inr(s.net_due),
          takenMonth.has(s.id) ? `Month ${takenMonth.get(s.id)}` : "—",
        ])}
      />
    </div>
  );
}

function Tracker() {
  const { data: groups = [] } = useTable("chit_groups");
  const { data: subs = [] } = useTable("subscriptions");
  const { data: auctions = [] } = useAuctions();
  const qc = useQueryClient();
  const { group: groupParam } = Route.useSearch();
  const [groupId, setGroupId] = useState("");
  const [month, setMonth] = useState("");
  const [winner, setWinner] = useState("");
  const gid = groupId || groupParam || groups[0]?.id;
  const g = groups.find((x) => x.id === gid);
  const gSubs = subs.filter((s) => s.group_id === gid);
  const gAuctions = auctions.filter((a) => a.group_id === gid);
  const takenSubs = new Set(gAuctions.map((a) => a.subscription_id));
  const takenMonths = new Set(gAuctions.map((a) => a.month_no));

  const mark = async () => {
    const s = gSubs.find((x) => x.id === winner);
    if (!s || !month) { toast.error("Choose a month and a member"); return; }
    const { error } = await supabase.from("chit_auctions").insert({ group_id: gid, month_no: Number(month), subscription_id: s.id, winner_name: s.members?.full_name ?? s.chit_ref, prize_amount: g?.chit_value });
    if (error) { toast.error(error.message); return; }
    toast.success(`Month ${month}: chit taken by ${s.members?.full_name}`);
    setMonth(""); setWinner("");
    qc.invalidateQueries({ queryKey: ["auctions"] });
  };
  const undo = async (id: string) => {
    const { error } = await supabase.from("chit_auctions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["auctions"] });
  };

  if (!g) return <Empty text="Create a chit group first" />;
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Chit group">
            <Select value={gid} onValueChange={setGroupId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{groups.map((x) => <SelectItem key={x.id} value={x.id}>{x.name} · {x.installments} months</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/40" />Paid</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted ring-1 ring-border" />To pay</span>
            <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-primary" />Chit taken</span>
          </div>
        </div>
      </Panel>

      <Panel>
        <h3 className="mb-4 flex items-center gap-2 font-bold"><Trophy className="h-5 w-5 text-primary" />Chit taken — month by month</h3>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="Month">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>{Array.from({ length: g.installments }, (_, i) => i + 1).filter((n) => !takenMonths.has(n)).map((n) => <SelectItem key={n} value={String(n)}>Month {n}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Taken by">
            <Select value={winner} onValueChange={setWinner}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Choose member" /></SelectTrigger>
              <SelectContent>{gSubs.filter((s) => !takenSubs.has(s.id)).map((s) => <SelectItem key={s.id} value={s.id}>{s.members?.full_name} · {s.chit_ref}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Button onClick={mark}><Trophy />Mark as taken</Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: g.installments }, (_, i) => i + 1).map((n) => {
            const a = gAuctions.find((x) => x.month_no === n);
            return (
              <div key={n} className={`rounded-lg border p-2 text-sm ${a ? "border-primary/40 bg-primary/10" : "bg-muted/50"}`}>
                <p className="text-xs text-muted-foreground">Month {n}</p>
                {a ? (
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate font-semibold text-primary">{a.winner_name}</p>
                    <button aria-label="Remove" onClick={() => undo(a.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : <p className="text-muted-foreground">—</p>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <h3 className="mb-4 flex items-center gap-2 font-bold"><Users className="h-5 w-5 text-primary" />Installments per member</h3>
        {gSubs.length === 0 ? <Empty text="No members enrolled in this group" /> : (
          <div className="space-y-5">
            {gSubs.map((s) => (
              <div key={s.id}>
                <p className="mb-2 text-sm"><span className="font-semibold">{s.members?.full_name}</span> · {s.chit_ref} · <span className="text-success">{s.paid_upto} paid</span> · <span className="text-muted-foreground">{Math.max(0, g.installments - s.paid_upto)} to pay</span>{takenSubs.has(s.id) && <span className="ml-2 font-semibold text-primary">· Chit taken</span>}</p>
                <InstallmentGrid installments={g.installments} paidUpto={s.paid_upto} auctions={gAuctions} mySubId={s.id} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Interests() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "interests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chit_interests").select("*, members(full_name, phone), chit_groups(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const open = data.filter((i) => i.status === "NEW");
  if (open.length === 0) return null;
  const mark = async (id: string) => {
    const { error } = await supabase.from("chit_interests").update({ status: "CONTACTED" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin", "interests"] });
  };
  return (
    <Panel className="mb-4 border-primary/40">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><UserPlus className="h-5 w-5 text-primary" />New chit interest ({open.length})</h2>
      <div className="divide-y">
        {open.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <p><b>{i.members?.full_name}</b> ({i.members?.phone}) wants to join <b>{i.chit_groups?.name}</b> · {fmtDate(i.created_at, true)}</p>
            <Button size="sm" variant="outline" onClick={() => mark(i.id)}><CheckCircle2 className="h-4 w-4" />Mark contacted</Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
