import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Pencil } from "lucide-react";
import { PageTitle, Panel, useMe } from "@/components/AppShell";
import { ProfileForm } from "@/components/ProfileForm";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — OST Chits" }, { name: "description", content: "Your OST Chits member profile." }, { property: "og:title", content: "My Profile — OST Chits" }, { property: "og:description", content: "Your OST Chits member profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = usePrefs();
  const { data: me } = useMe();
  const m = me?.member;
  const [editing, setEditing] = useState(false);
  const name = m?.full_name ?? "Administrator";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <>
      <PageTitle title={t("profile")} />
      <Panel className="max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="logo-depth grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-hero font-display text-xl font-extrabold text-primary-foreground">{initials}</div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold">{name}</p>
            <p className="text-sm text-muted-foreground">{me?.isAdmin ? "Administrator" : "Member Profile"}</p>
          </div>
          {m && !editing && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
        {m && editing ? (
          <div className="mt-6">
            <ProfileForm member={m} onSaved={() => setEditing(false)} />
            <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : (
        <div className="mt-6 space-y-3">
          {[
            { i: Phone, l: "Phone Number", v: m?.phone ?? me?.phone },
            { i: Mail, l: "Email Address", v: m?.email || "Not provided" },
            { i: MapPin, l: "Address", v: m?.address || "Not provided" },
          ].map(({ i: I, l, v }) => (
            <div key={l} className="flex gap-4 rounded-xl border p-4">
              <div className="depth-icon"><I aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="break-words font-medium">{v}</p>
              </div>
            </div>
          ))}
        </div>
        )}
      </Panel>
    </>
  );
}
