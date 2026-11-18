import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, HandCoins, Loader2, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { payNow, requestCashPayment } from "@/lib/pay.functions";
import { inr, usePrefs } from "@/lib/prefs";

const APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"];

export function PayDialog({ open, onOpenChange, subscriptionId, amount }: {
  open: boolean; onOpenChange: (o: boolean) => void; subscriptionId: string | null; amount: number;
}) {
  const { t } = usePrefs();
  const pay = useServerFn(payNow);
  const cash = useServerFn(requestCashPayment);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"online" | "cash">("online");
  const [app, setApp] = useState(APPS[0]);
  const [stage, setStage] = useState<"choose" | "processing" | "done" | "pending">("choose");
  const [txn, setTxn] = useState("");

  const run = async () => {
    if (!subscriptionId) return;
    setStage("processing");
    try {
      if (mode === "cash") {
        const r = await cash({ data: { subscriptionId } });
        setTxn(r.txn); setStage("pending");
      } else {
        await new Promise((r) => setTimeout(r, 1600));
        const r = await pay({ data: { subscriptionId } });
        setTxn(r.txn); setStage("done");
      }
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
      setStage("choose");
    }
  };

  const close = (o: boolean) => { onOpenChange(o); if (!o) setTimeout(() => setStage("choose"), 200); };
  const tab = (m: "online" | "cash") =>
    `flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">OST Chits · {t("payNow")}</DialogTitle></DialogHeader>
        {stage === "choose" && (
          <div className="space-y-5">
            <div className="rounded-xl bg-hero p-5 text-primary-foreground">
              <p className="text-xs opacity-80">Total</p>
              <p className="font-display text-3xl font-extrabold">{inr(amount)}</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-muted p-1">
              <Button variant="ghost" className={tab("online")} onClick={() => setMode("online")}><Smartphone className="h-4 w-4" /> Online (UPI)</Button>
              <Button variant="ghost" className={tab("cash")} onClick={() => setMode("cash")}><HandCoins className="h-4 w-4" /> In Hand (Office)</Button>
            </div>
            {mode === "online" ? (
              <div>
                <p className="mb-2 text-sm font-semibold">UPI Apps</p>
                <div className="grid grid-cols-2 gap-2">
                  {APPS.map((a) => (
                    <Button variant="outline" key={a} onClick={() => setApp(a)}
                      className={`h-12 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${app === a ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                      <Smartphone />{a}
                    </Button>
                  ))}
                  <Button variant="outline" onClick={() => setApp("Scan QR")}
                    className={`col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${app === "Scan QR" ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"}`}>
                    <QrCode className="h-4 w-4" /> Scan QR
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-accent/40 p-4 text-sm">
                <p className="font-semibold">Pay cash at any OST Chits office</p>
                <p className="mt-1 text-muted-foreground">We'll send a request to the office. Once you pay in hand, the admin approves it and your payment turns to Success with a receipt.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>Back</Button>
              <Button className="flex-1 shadow-glow" onClick={run}>{mode === "cash" ? "Request In-Hand Payment" : t("payNow")}</Button>
            </div>
            {mode === "online" && <p className="text-center text-[11px] text-muted-foreground">Demo payment — no money is charged.</p>}
          </div>
        )}
        {stage === "processing" && (
          <div className="flex flex-col items-center py-10 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 font-semibold">{mode === "cash" ? "Sending request" : "Processing Payment"}</p>
          </div>
        )}
        {stage === "pending" && (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock className="h-14 w-14 text-primary" />
            <p className="mt-4 font-display text-xl font-bold">Awaiting Admin Approval</p>
            <p className="mt-1 text-sm text-muted-foreground">Pay {inr(amount)} in hand at the office. Show this reference:</p>
            <p className="mt-3 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">{txn}</p>
            <Button className="mt-6 w-full" onClick={() => close(false)}>Done</Button>
          </div>
        )}
        {stage === "done" && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-success" />
            <p className="mt-4 font-display text-xl font-bold">Payment Successful</p>
            <p className="mt-1 text-sm text-muted-foreground">{inr(amount)} via {app}</p>
            <p className="mt-3 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">{txn}</p>
            <Button className="mt-6 w-full" onClick={() => close(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
