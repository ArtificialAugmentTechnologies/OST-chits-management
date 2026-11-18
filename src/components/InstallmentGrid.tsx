import { Check, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type Auction = { month_no: number; winner_name: string; subscription_id: string };

/** Boxes 1..N — green check when paid, grey when pending; trophy + name when the chit was taken that month. */
export function InstallmentGrid({ installments, paidUpto, auctions = [], mySubId }: { installments: number; paidUpto: number; auctions?: Auction[]; mySubId?: string }) {
  const byMonth = new Map(auctions.map((a) => [a.month_no, a]));
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
      {Array.from({ length: installments }, (_, i) => i + 1).map((n) => {
        const paid = n <= paidUpto;
        const a = byMonth.get(n);
        const mine = a && a.subscription_id === mySubId;
        return (
          <div
            key={n}
            title={`Month ${n}: ${paid ? "Paid" : "Pending"}${a ? ` · Taken by ${a.winner_name}` : ""}`}
            className={cn(
              "relative flex min-h-16 flex-col items-center justify-center rounded-lg border p-1 text-center transition",
              paid ? "border-success/40 bg-success/15 text-success" : "border-border bg-muted text-muted-foreground opacity-70",
              mine && "ring-2 ring-primary",
            )}
          >
            <span className="text-[10px] font-semibold">{n}</span>
            {paid ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="h-5 w-5 rounded-full border-2 border-current opacity-40" />}
            {a && (
              <span className="mt-0.5 flex w-full items-center justify-center gap-0.5 truncate text-[9px] font-bold text-primary">
                <Trophy className="h-3 w-3 shrink-0" /><span className="truncate">{mine ? "You" : a.winner_name}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
