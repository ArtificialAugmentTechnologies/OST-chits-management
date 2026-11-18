import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { prepareEmailLogin } from "@/lib/auth.functions";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_SECONDS = 60;
const emailSchema = z.string().email();
const linkClass = "text-sm font-semibold text-primary underline-offset-2 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline";

function sendError(error: { code?: string | undefined; status?: number | undefined; message: string }) {
  if (error.status === 429 || error.code === "over_email_send_rate_limit") return "Too many requests. Please wait a while and try again.";
  if (error.code === "otp_disabled" || error.message.includes("Signups not allowed")) return "This email is not registered with OST Chits.";
  return "Could not send OTP. Please try again.";
}

export function EmailLogin({ onBack }: { onBack: () => void }) {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const prepare = useServerFn(prepareEmailLogin);
  const [stage, setStage] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const request = async () => {
    const address = email.trim().toLowerCase();
    if (!emailSchema.safeParse(address).success) { toast.error("Enter a valid email address"); return false; }
    setBusy(true);
    try {
      await prepare({ data: { email: address } });
      const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
      if (error) { toast.error(sendError(error)); return false; }
      setEmail(address);
      setSeconds(RESEND_SECONDS);
      toast.success("OTP sent to your email");
      return true;
    } catch {
      toast.error("Could not send OTP. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (await request()) { setCode(""); setStage("verify"); }
  };

  const onVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit OTP"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) {
        toast.error(error.status === 429 ? "Too many attempts. Please wait and try again." : "Invalid or expired OTP.");
        return;
      }
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) { toast.error("Could not sign in. Please try again."); return; }
      // Read through RLS: access comes from these rows, never from the email that was typed.
      const [{ data: member }, { data: roles }] = await Promise.all([
        supabase.from("members").select("id").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      if (!member && !isAdmin) {
        await supabase.auth.signOut();
        toast.error("This email is not registered with OST Chits.");
        return;
      }
      navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
    } catch {
      toast.error("Could not verify OTP. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (stage === "email") {
    return (
      <>
        <h2 className="animate-rise text-2xl font-extrabold tracking-tight">Login with Email</h2>
        <p className="animate-rise mt-1.5 text-xs text-muted-foreground">Enter your registered email address. We'll send a one-time verification code to your inbox.</p>
        <form onSubmit={onSend} noValidate className="login-dimensional-fields mt-5 space-y-4">
          <div className="animate-rise space-y-2">
            <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
            <div className="login-phone-field group relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="login-email" type="email" autoComplete="email" maxLength={255} placeholder="Enter your registered email address"
                className="h-11 rounded-xl bg-background/60 pl-9 text-sm transition-all focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-primary/20"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="login-submit animate-rise h-11 w-full rounded-xl bg-hero text-sm font-semibold shadow-glow transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]" disabled={busy}>
            <span className="relative flex items-center justify-center gap-2">
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
              {t("sendOtp")}
            </span>
          </Button>
        </form>
        <div className="animate-rise mt-4 text-center">
          <button type="button" className={`${linkClass} inline-flex items-center gap-1.5`} onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to mobile login
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="animate-rise text-2xl font-extrabold tracking-tight">Verify Your Email</h2>
      <p className="animate-rise mt-1.5 break-words text-xs text-muted-foreground">We've sent a verification code to <b>{email}</b>.</p>
      <form onSubmit={onVerify} className="login-dimensional-fields mt-5 space-y-4">
        <div className="animate-rise space-y-2">
          <Label htmlFor="email-otp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("otp")}</Label>
          <Input
            id="email-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
            className="h-11 rounded-xl bg-background/60 text-center text-base tracking-[0.4em] transition-all focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-primary/20"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button type="submit" className="login-submit animate-rise h-11 w-full rounded-xl bg-hero text-sm font-semibold shadow-glow transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]" disabled={busy} aria-busy={busy}>
          <span className="relative flex items-center justify-center gap-2">
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {t("verify")}
            {!busy && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </span>
        </Button>
      </form>
      <div className="animate-rise mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={linkClass} disabled={busy || seconds > 0} onClick={request}>
          {seconds > 0 ? `Resend OTP in ${seconds}s` : "Resend OTP"}
        </button>
        <button type="button" className={linkClass} disabled={busy} onClick={() => { setCode(""); setStage("email"); }}>Change Email</button>
      </div>
    </>
  );
}
