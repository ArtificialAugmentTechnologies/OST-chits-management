import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const newTxn = (prefix: string) => prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

async function loadSub(supabase: any, id: string) {
  // RLS ensures the caller can only see their own subscription.
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("id, member_id, paid_upto, net_due, chit_groups(sub_amount, installments)")
    .eq("id", id).maybeSingle();
  if (error || !sub) throw new Error("Subscription not found");
  const g = sub.chit_groups as { sub_amount: number; installments: number } | null;
  const due = Number(sub.net_due);
  // When nothing is overdue, the member pays the next installment in advance.
  const amount = due > 0 ? due : Number(g?.sub_amount ?? 0);
  if (g && due <= 0 && sub.paid_upto >= g.installments) throw new Error("All installments are already paid");
  if (amount <= 0) throw new Error("Nothing to pay");
  return { id: sub.id, member_id: sub.member_id, paid_upto: sub.paid_upto, net_due: amount } as
    { id: string; member_id: string; paid_upto: number; net_due: number };
}

async function settle(admin: any, sub: { id: string; paid_upto: number }, amount: number) {
  const nextInst = sub.paid_upto + 1;
  await admin.from("ledger_entries").insert({ subscription_id: sub.id, sub_amount: amount, adj_inst: nextInst, charges: 0 });
  await admin.from("subscriptions").update({ paid_upto: nextInst, net_due: 0 }).eq("id", sub.id);
}

export const payNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sub = await loadSub(context.supabase, data.subscriptionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const txn = newTxn("FEUPI");
    const amount = Number(sub.net_due);
    const { error } = await supabaseAdmin.from("payments").insert({
      txn_id: txn, subscription_id: sub.id, member_id: sub.member_id, amount, method: "UPI", status: "SUCCESS",
    });
    if (error) throw new Error(error.message);
    await settle(supabaseAdmin, sub, amount);
    return { txn, amount };
  });

export const requestCashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subscriptionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sub = await loadSub(context.supabase, data.subscriptionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("payments")
      .select("txn_id").eq("subscription_id", sub.id).eq("status", "PENDING").maybeSingle();
    if (existing) return { txn: existing.txn_id, amount: Number(sub.net_due) };
    const txn = newTxn("CASH");
    const amount = Number(sub.net_due);
    const { error } = await supabaseAdmin.from("payments").insert({
      txn_id: txn, subscription_id: sub.id, member_id: sub.member_id, amount, method: "CASH", status: "PENDING",
    });
    if (error) throw new Error(error.message);
    return { txn, amount };
  });

export const reviewCashPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("payments")
      .select("id, amount, status, subscription_id").eq("id", data.paymentId).maybeSingle();
    if (!p || p.status !== "PENDING") throw new Error("Request not pending");
    if (!data.approve) {
      await supabaseAdmin.from("payments").update({ status: "REJECTED" }).eq("id", p.id);
      return { ok: true };
    }
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("id, paid_upto").eq("id", p.subscription_id).single();
    await supabaseAdmin.from("payments").update({ status: "SUCCESS", created_at: new Date().toISOString() }).eq("id", p.id);
    if (sub) await settle(supabaseAdmin, sub, Number(p.amount));
    return { ok: true };
  });
