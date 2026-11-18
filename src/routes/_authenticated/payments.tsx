import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel, Empty } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayments, fmtDate } from "@/lib/data";
import { inr, usePrefs } from "@/lib/prefs";
import { Download, Smartphone, HandCoins, CheckCircle2, Clock, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadReceipt } from "@/lib/receipt";

function StatusPill({ s }: { s: string }) {
  const cls = s === "SUCCESS" ? "bg-success/15 text-success" : s === "PENDING" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive";
  const label = s === "PENDING" ? "PENDING APPROVAL" : s;
  const Icon = s === "SUCCESS" ? CheckCircle2 : s === "PENDING" ? Clock : CircleX;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</span>;
}

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({ meta: [{ title: "Payments — OST Chits" }, { name: "description", content: "All your chit payment transactions." }, { property: "og:title", content: "Payments — OST Chits" }, { property: "og:description", content: "All your chit payment transactions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { t } = usePrefs();
  const { data = [] } = usePayments();
  const [q, setQ] = useState("");
  const rows = data.filter((p) => p.txn_id.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageTitle title={t("payments")} sub={`${data.length} transactions`} right={<Input placeholder="Search transaction ID" className="w-60" value={q} onChange={(e) => setQ(e.target.value)} />} />
      <Panel className="p-0 sm:p-0">
        {rows.length === 0 ? <div className="p-4"><Empty text="No transactions" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Transaction ID</TableHead><TableHead>Chit Ref</TableHead><TableHead>Mode</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Receipt</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.txn_id}</TableCell>
                    <TableCell>{p.subscriptions?.chit_ref}</TableCell>
                     <TableCell><span className="inline-flex items-center gap-2 whitespace-nowrap">{p.method === "CASH" ? <HandCoins className="h-4 w-4 text-primary" /> : <Smartphone className="h-4 w-4 text-primary" />}{p.method === "CASH" ? "In Hand" : "Online"}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDate(p.created_at, true)}</TableCell>
                    <TableCell className="text-right font-semibold">{inr(p.amount)}</TableCell>
                    <TableCell><StatusPill s={p.status} /></TableCell>
                    <TableCell className="text-center">
                      {p.status === "SUCCESS" ? (
                         <Button variant="ghost" size="icon" aria-label="Download receipt" title="Download receipt" onClick={() => downloadReceipt(p)} className="text-primary"><Download className="h-4 w-4" /></Button>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}
