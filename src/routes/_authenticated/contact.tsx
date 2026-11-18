import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Building2 } from "lucide-react";
import { DepthSurface } from "@/components/DepthSurface";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/AppShell";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_authenticated/contact")({
  head: () => ({ meta: [{ title: "Contact Us — OST Chits" }, { name: "description", content: "OST Chits branch addresses and phone numbers." }, { property: "og:title", content: "Contact Us — OST Chits" }, { property: "og:description", content: "OST Chits branch addresses and phone numbers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = usePrefs();
  const { data = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => (await supabase.from("branches").select("*").order("sort")).data ?? [],
  });
  return (
    <>
      <PageTitle title={t("contact")} sub="Visit or call any of our branches" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((b) => (
          <DepthSurface key={b.id} className="rounded-xl border bg-card p-5">
            <span className="depth-icon mb-4"><Building2 aria-hidden="true" /></span>
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">{b.name}</p>
              <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">{b.code}</span>
            </div>
            <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b.address}</p>
            {b.phone && (
              <a href={`tel:${b.phone}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Phone className="h-4 w-4" />{b.phone}</a>
            )}
          </DepthSurface>
        ))}
      </div>
    </>
  );
}
