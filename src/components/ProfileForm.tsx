import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { placeholderName, profileSchema, updateMyProfile } from "@/lib/profile.functions";

type Member = { phone: string; full_name: string; email: string | null; address: string | null };

export function ProfileForm({ member, onSaved }: { member: Member; onSaved?: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyProfile);
  const [form, setForm] = useState({
    full_name: member.full_name === placeholderName(member.phone) ? "" : member.full_name,
    email: member.email ?? "",
    address: member.address ?? "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details"); return; }
    setBusy(true);
    try {
      await save({ data: parsed.data });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile saved");
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" autoComplete="name" value={form.full_name} onChange={set("full_name")} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-email">Email <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="pf-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-address">Address</Label>
        <Textarea id="pf-address" autoComplete="street-address" rows={3} value={form.address} onChange={set("address")} required />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save details"}</Button>
    </form>
  );
}

// Shown on every portal page until a member has filled in their name and address.
export function ProfileSetupDialog({ member }: { member: Member }) {
  return (
    <Dialog open>
      <DialogContent className="[&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete your profile</DialogTitle>
          <DialogDescription>Welcome to OST Chits. Please enter your details to continue.</DialogDescription>
        </DialogHeader>
        <ProfileForm member={member} />
      </DialogContent>
    </Dialog>
  );
}
