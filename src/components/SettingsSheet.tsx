import type { ReactNode } from "react";
import { Moon, Sun, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { LANGS, usePrefs } from "@/lib/prefs";

export function SettingsSheet({ children }: { children: ReactNode }) {
  const { t, dark, setDark, lang, setLang } = usePrefs();
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-[320px]">
        <SheetHeader>
          <SheetTitle className="font-display">{t("settings")}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-8 px-4">
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              <span className="font-medium">{t("darkMode")}</span>
            </div>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-muted-foreground">{t("language")}</p>
            <div className="space-y-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    lang === l.code ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  {l.label}
                  {lang === l.code && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
