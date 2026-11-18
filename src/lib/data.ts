import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, chit_groups(*), members(full_name)")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function usePayments(limit?: number) {
  return useQuery({
    queryKey: ["payments", limit],
    queryFn: async () => {
      let q = supabase.from("payments").select("*, subscriptions(chit_ref), members(full_name, phone)").order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpcomingGroups() {
  return useQuery({
    queryKey: ["upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chit_groups").select("*").eq("status", "upcoming").order("next_auction");
      if (error) throw error;
      return data;
    },
  });
}

export const fmtDate = (d: string | null | undefined, time = false) =>
  d ? new Date(d).toLocaleString("en-IN", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }) : "—";

export function useAuctions() {
  return useQuery({
    queryKey: ["auctions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chit_auctions").select("*").order("month_no");
      if (error) throw error;
      return data;
    },
  });
}
