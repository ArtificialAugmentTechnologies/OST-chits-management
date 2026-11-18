import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { placeholderName } from "@/lib/profile.functions";

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: phoneSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Unregistered numbers are allowed: verifyOtp creates their member row on first login.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await supabaseAdmin.from("otp_codes").insert({
      phone: data.phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
    // DEMO MODE: no SMS provider yet, so the code is returned for on-screen display.
    return { ok: true as const, demoCode: code };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: otp } = await supabaseAdmin
      .from("otp_codes")
      .select("id, expires_at")
      .eq("phone", data.phone)
      .eq("code", data.code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!otp || new Date(otp.expires_at) < new Date()) {
      return { ok: false as const, error: "Invalid or expired OTP." };
    }
    await supabaseAdmin.from("otp_codes").update({ used: true }).eq("id", otp.id);

    const email = `${data.phone}@ostchits.app`;
    const password = crypto.randomUUID() + crypto.randomUUID();

    const { data: member } = await supabaseAdmin.from("members").select("id, user_id").eq("phone", data.phone).maybeSingle();
    let userId = member?.user_id ?? null;

    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { phone: data.phone } });
      if (created.data.user) userId = created.data.user.id;
      else {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        userId = list.users.find((u) => u.email === email)?.id ?? null;
      }
    }
    if (!userId) return { ok: false as const, error: "Could not sign in. Please try again." };

    // The login may carry the member's real email once email OTP has been used.
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (member && !member.user_id) await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", member.id);

    const { data: adminPhone } = await supabaseAdmin.from("admin_phones").select("phone").eq("phone", data.phone).maybeSingle();
    // Self-registration: first login of a new number creates its member record (name editable by admin).
    if (!member && !adminPhone) {
      const { error } = await supabaseAdmin
        .from("members")
        .insert({ phone: data.phone, full_name: placeholderName(data.phone), user_id: userId });
      if (error) return { ok: false as const, error: "Could not register this number. Please try again." };
    }
    if (adminPhone) await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true as const, email: authUser.user?.email ?? email, password };
  });

// Phone logins start with a synthetic email, so a member's saved email is copied onto their
// login before the browser calls signInWithOtp. Always ok: the caller learns nothing from this step.
export const prepareEmailLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pattern = data.email.replace(/[\\%_]/g, "\\$&");
    const { data: rows } = await supabaseAdmin.from("members").select("id, user_id, phone").ilike("email", pattern).limit(2);
    // members.email is not unique, and a shared email cannot identify one login.
    const member = rows?.length === 1 ? rows[0] : undefined;
    if (!member) return { ok: true as const };

    let userId = member.user_id;
    if (!userId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      userId = list.users.find((u) => u.email === `${member.phone}@ostchits.app`)?.id ?? null;
    }
    if (userId) {
      await supabaseAdmin.auth.admin.updateUserById(userId, { email: data.email, email_confirm: true });
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({ email: data.email, email_confirm: true, user_metadata: { phone: member.phone } });
      userId = created.data.user?.id ?? null;
    }
    if (userId && !member.user_id) await supabaseAdmin.from("members").update({ user_id: userId }).eq("id", member.id);
    return { ok: true as const };
  });
