import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Download, TrendingUp, Wallet, CircleAlert, IndianRupee } from "lucide-react";
import { DepthSurface } from "@/components/DepthSurface";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, Empty } from "@/components/AppShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubscriptions, fmtDate } from "@/lib/data";
import { InstallmentGrid } from "@/components/InstallmentGrid";
import { inr, usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account Copy — OST Chits" }, { name: "description", content: "Installment-wise account copy for your chit." }, { property: "og:title", content: "Account Copy — OST Chits" }, { property: "og:description", content: "Installment-wise account copy for your chit." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { t } = usePrefs();
  const { data: subs = [] } = useSubscriptions();
  const [sid, setSid] = useState<string>("");
  useEffect(() => { if (!sid && subs[0]) setSid(subs[0].id); }, [subs, sid]);
  const sub = subs.find((s) => s.id === sid);

  const { data: rows = [] } = useQuery({
    queryKey: ["ledger", sid],
    enabled: !!sid,
    queryFn: async () => {
      const { data, error } = await supabase.from("ledger_entries").select("*").eq("subscription_id", sid).order("adj_inst");
      if (error) throw error;
      return data;
    },
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ["auctions", sub?.group_id],
    enabled: !!sub?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("chit_auctions").select("month_no, winner_name, subscription_id").eq("group_id", sub!.group_id).order("month_no");
      if (error) throw error;
      return data;
    },
  });

  const paid = rows.reduce((a, r) => a + Number(r.sub_amount) + Number(r.charges), 0);
  const dividend = Number(sub?.dividend ?? 0);

  const download = (r: (typeof rows)[number]) => {
    const text = `OST CHITS — RECEIPT\n\nChit Ref: ${sub?.chit_ref}\nSubscriber: ${sub?.members?.full_name}\nDate: ${fmtDate(r.entry_date)}\nInstallment: ${r.adj_inst}\nAmount: ${inr(r.sub_amount)}\nCharges: ${inr(r.charges)}\n\nCreated by Artificial Augment Technologies`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `receipt-${sub?.chit_ref}-${r.adj_inst}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle
        title={t("account")}
        sub={sub ? `${sub.chit_ref} · ${sub.members?.full_name ?? ""}` : undefined}
        right={subs.length > 1 && (
          <Select value={sid} onValueChange={setSid}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.chit_ref}</SelectItem>)}</SelectContent>
          </Select>
        )}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[{ label: "Dividend", value: dividend, icon: TrendingUp }, { label: "Paid", value: paid, icon: Wallet }, { label: "Penalty", value: 0, icon: CircleAlert }, { label: "Total Due", value: Number(sub?.net_due ?? 0), icon: IndianRupee }].map(({ label, value, icon: Icon }) => (
          <DepthSurface key={label} className="rounded-xl border bg-card p-4">
            <span className="depth-icon mb-3"><Icon aria-hidden="true" /></span>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-lg font-bold">{inr(value)}</p>
          </DepthSurface>
        ))}
      </div>
      {sub && (
        <Panel className="mb-6">
          <h2 className="mb-1 font-display text-base font-bold">Installment Tracker</h2>
          <p className="mb-4 text-xs text-muted-foreground">Green tick = paid · Grey = to pay · Trophy = chit taken that month</p>
          <InstallmentGrid
            installments={Number(sub.chit_groups?.installments ?? 0)}
            paidUpto={Number(sub.paid_upto ?? 0)}
            auctions={auctions}
            mySubId={sub.id}
          />
        </Panel>
      )}
      <Panel className="p-0 sm:p-0">
        {rows.length === 0 ? <div className="p-4"><Empty text="No entries yet" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead className="text-right">Sub Amt</TableHead><TableHead className="text-center">Inst</TableHead><TableHead className="text-right">Charges</TableHead><TableHead className="text-center">Download</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.entry_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{inr(r.sub_amount)}</TableCell>
                    <TableCell className="text-center">{r.adj_inst}</TableCell>
                    <TableCell className="text-right">{inr(r.charges)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" aria-label="Download receipt" title="Download receipt" onClick={() => download(r)} className="text-primary"><Download className="h-4 w-4" /></Button>
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
