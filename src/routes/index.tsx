import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Settings, ShieldCheck, Smartphone, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendOtp, verifyOtp } from "@/lib/auth.functions";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SettingsSheet } from "@/components/SettingsSheet";
import { CreatedBy, Logo } from "@/components/Brand";
import { DepthSurface } from "@/components/DepthSurface";
import { EmailLogin } from "@/components/EmailLogin";
const deityAsset = { url: "/images/login-deity.jpg" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login — OST Chits" },
      { name: "description", content: "Sign in to OST Chits with your mobile number and OTP to view dues and pay installments." },
      { property: "og:title", content: "Login — OST Chits" },
      { property: "og:description", content: "Sign in with mobile OTP to manage your chit savings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const send = useServerFn(sendOtp);
  const verify = useServerFn(verifyOtp);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [demo, setDemo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loginPulse, setLoginPulse] = useState(0);
  const [method, setMethod] = useState<"mobile" | "email">("mobile");
  const [showAlt, setShowAlt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const onSend = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setBusy(true);
    try {
      const r = await send({ data: { phone } });
      setSent(true);
      setDemo(r.demoCode);
      toast.success("OTP sent");
    } catch {
      toast.error("Could not send OTP");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { toast.error("Enter the 6-digit OTP"); return; }
    setBusy(true);
    setVerifying(true);
    try {
      const r = await verify({ data: { phone, code } });
      if (!r.ok) { toast.error(r.error); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: r.password });
      if (error) { toast.error(error.message); return; }
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Verification failed");
    } finally {
      setBusy(false);
      setVerifying(false);
    }
  };

  const d = (ms: number) => ({ animationDelay: `${ms}ms` });

  return (
    <div className="login-reference relative min-h-screen overflow-x-hidden">
      <div className="mx-auto grid min-h-screen w-full md:grid-cols-[0.9fr_1.1fr] lg:grid-cols-2">
        <section className="login-side hidden flex-col justify-between p-8 md:flex lg:p-10 xl:p-14">
          <Logo />

          <div className="login-deity animate-float mx-auto w-full max-w-[19rem] lg:max-w-[22rem] xl:max-w-[25rem]" role="img" aria-label="Lord Venkateswara and Goddess Lakshmi">
            <img src={deityAsset.url} alt="" loading="lazy" />
          </div>

          <CreatedBy className="login-credit" />

          <div className="login-weave" aria-hidden="true"><span /><span /><span /><span /></div>
        </section>

        <section className="login-reference-right flex flex-col px-5 py-8 sm:px-10">
          <div className="flex items-center justify-between">
            <div className="md:hidden">
              <Logo />
            </div>
            <div className="hidden md:block" aria-hidden="true" />
            <SettingsSheet>
              <Button variant="ghost" size="icon" aria-label={t("settings")} className="grid h-10 w-10 place-items-center rounded-xl border border-transparent transition-all hover:border-primary/20 hover:bg-accent active:scale-95">
                <Settings className="h-5 w-5" />
              </Button>
            </SettingsSheet>
          </div>

          <div className="flex flex-1 flex-col justify-center py-6">
            <div className="mx-auto w-full max-w-[27.5rem]">
              <div className="login-deity mx-auto mb-5 max-w-[6rem] md:hidden">
                <img src={deityAsset.url} alt="Lord Venkateswara and Goddess Lakshmi" loading="lazy" />
              </div>

              <p className="animate-rise text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground" style={d(60)}>{t("customerPortal")}</p>
              <h1 className="animate-rise mt-3 font-display text-2xl font-extrabold leading-[1.12] tracking-tight text-primary sm:text-[1.75rem]" style={d(120)}>
                {t("tagline")}
              </h1>
              <p className="animate-rise mt-3 max-w-md text-sm leading-relaxed text-muted-foreground" style={d(200)}>
                Sign in with your mobile number — view dues, pay installments, and download receipts in one place.
              </p>

              <DepthSurface
                className={`login-sculpted-form login-form-depth mt-6 w-full rounded-2xl p-5 sm:p-6 ${verifying ? "login-verifying" : ""}`}
              >
                {method === "email" ? <EmailLogin onBack={() => setMethod("mobile")} /> : (<>
                <h2 className="text-2xl font-extrabold tracking-tight">{t("login")}</h2>
                <p className="mt-1.5 text-xs text-muted-foreground">We'll send a one-time code to your registered mobile.</p>

                <form onSubmit={onVerify} className="login-dimensional-fields mt-5 space-y-4">
                  <div className="animate-rise space-y-2" style={d(80)}>
                    <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mobile")}</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="login-phone-field group relative flex-1">
                        <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 border-r pr-2 text-sm font-medium text-muted-foreground">+91</span>
                        <Input
                          id="phone" inputMode="numeric" maxLength={10} placeholder="10-digit mobile"
                          className="h-11 rounded-xl bg-background/60 pl-[4.75rem] text-sm transition-all focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-primary/20"
                          value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                      <Button type="button" variant="secondary" className="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-card active:translate-y-0 active:scale-[0.98]" disabled={busy} onClick={onSend}>
                        {sent ? "Resend" : t("sendOtp")}
                      </Button>
                    </div>
                  </div>

                  <div className="animate-rise space-y-2" style={d(140)}>
                    <Label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("otp")}</Label>
                    <Input
                      id="otp" inputMode="numeric" maxLength={6} placeholder="6-digit code" disabled={!sent}
                      className="h-11 rounded-xl bg-background/60 text-center text-base tracking-[0.4em] transition-all focus-visible:border-primary focus-visible:shadow-glow focus-visible:ring-primary/20"
                      value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    />
                    {demo && (
                      <p className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-primary/15 bg-accent px-3 py-2 text-xs text-accent-foreground duration-300">
                        Demo mode — your OTP is <b className="tracking-widest">{demo}</b>
                      </p>
                    )}
                  </div>

                  <label className="flex animate-rise cursor-pointer items-center gap-2 text-sm text-muted-foreground" style={d(200)}>
                    <Checkbox defaultChecked /> Remember me
                  </label>

                  <Button
                    type="submit" style={d(260)}
                    className="login-submit h-11 w-full animate-rise rounded-xl bg-hero text-sm font-semibold shadow-glow transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]"
                    disabled={busy || !sent}
                    aria-busy={verifying}
                    data-verifying={verifying}
                    onClick={() => setLoginPulse((value) => value + 1)}
                  >
                    {loginPulse > 0 && <span key={loginPulse} className="login-click-wave" aria-hidden="true" />}
                    <span className="relative flex items-center justify-center gap-2">
                      {verifying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                      {t("verify")}
                      {!verifying && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    </span>
                  </Button>
                </form>

                <div className="mt-4 animate-rise text-center" style={d(320)}>
                  {showAlt ? (
                    <Button type="button" variant="outline" className="animate-in fade-in slide-in-from-top-1 h-11 w-full rounded-xl text-sm font-semibold duration-300" onClick={() => setMethod("email")}>
                      <Mail className="h-4 w-4" aria-hidden="true" /> Login with Email
                    </Button>
                  ) : (
                    <button type="button" className="text-sm font-semibold text-primary underline-offset-2 transition-colors hover:underline" onClick={() => setShowAlt(true)}>
                      Try another way to login
                    </button>
                  )}
                </div>
                </>)}
              </DepthSurface>
            </div>
          </div>

          <CreatedBy className="md:hidden" />
        </section>
      </div>
    </div>
  );
}
