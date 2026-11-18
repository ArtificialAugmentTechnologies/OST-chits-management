import { inr } from "@/lib/prefs";
import { fmtDate } from "@/lib/data";

export function downloadReceipt(p: { txn_id: string; amount: number | string; method: string; created_at: string; subscriptions?: { chit_ref?: string } | null; members?: { full_name?: string } | null }) {
  const mode = p.method === "CASH" ? "Cash (paid at office, approved by admin)" : "UPI (online)";
  const text = `OST CHITS — PAYMENT RECEIPT\n\nReceipt No: ${p.txn_id}\nChit Ref: ${p.subscriptions?.chit_ref ?? "—"}\nSubscriber: ${p.members?.full_name ?? "—"}\nDate: ${fmtDate(p.created_at, true)}\nAmount: ${inr(p.amount)}\nPayment mode: ${mode}\nStatus: SUCCESS\n\nCreated by Artificial Augment Technologies`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url; a.download = `receipt-${p.txn_id}.txt`; a.click();
  URL.revokeObjectURL(url);
}
