import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Self-registered members start with this placeholder name (see verifyOtp).
export const placeholderName = (phone: string) => `Member ${phone.slice(-4)}`;

export function needsProfile(m: { phone: string; full_name: string; address: string | null } | null | undefined) {
  return !!m && (!m.full_name.trim() || m.full_name === placeholderName(m.phone) || !m.address?.trim());
}

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  address: z.string().trim().min(5, "Enter your address").max(300),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Members have no RLS write access to their own row, so update it here, scoped to the caller.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await supabaseAdmin.from("members").select("phone").eq("user_id", context.userId).maybeSingle();
    if (!member) throw new Error("Member not found");
    // Keep the login email in step so email OTP follows the profile, not an old address.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: data.email.toLowerCase() || `${member.phone}@ostchits.app`,
      email_confirm: true,
    });
    if (authError) throw new Error("This email could not be used. It may belong to another account.");
    const { error } = await supabaseAdmin
      .from("members")
      .update({ full_name: data.full_name, email: data.email || null, address: data.address })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
