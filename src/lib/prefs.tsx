import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ta" | "hi" | "te" | "kn";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

const dict = {
  tagline: { en: "Chit is better than any kind of savings", ta: "எந்த சேமிப்பையும் விட சீட்டு சிறந்தது", hi: "चिट किसी भी बचत से बेहतर है", te: "ఏ పొదుపు కంటే చిట్ మేలు", kn: "ಯಾವುದೇ ಉಳಿತಾಯಕ್ಕಿಂತ ಚೀಟಿ ಉತ್ತಮ" },
  login: { en: "Login to your account", ta: "உங்கள் கணக்கில் உள்நுழையவும்", hi: "अपने खाते में लॉगिन करें", te: "మీ ఖాతాలో లాగిన్ అవ్వండి", kn: "ನಿಮ್ಮ ಖಾತೆಗೆ ಲಾಗಿನ್ ಮಾಡಿ" },
  mobile: { en: "Mobile Number", ta: "கைபேசி எண்", hi: "मोबाइल नंबर", te: "మొబైల్ నంబర్", kn: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ" },
  otp: { en: "Enter OTP", ta: "OTP உள்ளிடவும்", hi: "OTP दर्ज करें", te: "OTP నమోదు చేయండి", kn: "OTP ನಮೂದಿಸಿ" },
  sendOtp: { en: "Send OTP", ta: "OTP அனுப்பு", hi: "OTP भेजें", te: "OTP పంపండి", kn: "OTP ಕಳುಹಿಸಿ" },
  verify: { en: "Verify & Login", ta: "சரிபார்த்து உள்நுழை", hi: "सत्यापित करें और लॉगिन करें", te: "ధృవీకరించి లాగిన్", kn: "ಪರಿಶೀಲಿಸಿ ಲಾಗಿನ್" },
  dashboard: { en: "Dashboard", ta: "முகப்பு", hi: "डैशबोर्ड", te: "డాష్‌బోర్డ్", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  outstanding: { en: "My Outstanding", ta: "நிலுவைத் தொகை", hi: "मेरा बकाया", te: "నా బకాయి", kn: "ನನ್ನ ಬಾಕಿ" },
  grandTotal: { en: "Grand Total", ta: "மொத்தம்", hi: "कुल योग", te: "మొత్తం", kn: "ಒಟ್ಟು" },
  payNow: { en: "Pay Now", ta: "இப்போது செலுத்து", hi: "अभी भुगतान करें", te: "ఇప్పుడే చెల్లించండి", kn: "ಈಗ ಪಾವತಿಸಿ" },
  account: { en: "Account Copy", ta: "கணக்கு நகல்", hi: "खाता प्रति", te: "ఖాతా కాపీ", kn: "ಖಾತೆ ಪ್ರತಿ" },
  payments: { en: "Payments", ta: "பணம் செலுத்தியவை", hi: "भुगतान", te: "చెల్లింపులు", kn: "ಪಾವತಿಗಳು" },
  profile: { en: "My Profile", ta: "என் சுயவிவரம்", hi: "मेरी प्रोफ़ाइल", te: "నా ప్రొఫైల్", kn: "ನನ್ನ ಪ್ರೊಫೈಲ್" },
  contact: { en: "Contact Us", ta: "தொடர்பு கொள்ள", hi: "संपर्क करें", te: "మమ్మల్ని సంప్రదించండి", kn: "ಸಂಪರ್ಕಿಸಿ" },
  admin: { en: "Admin", ta: "நிர்வாகம்", hi: "प्रशासन", te: "అడ్మిన్", kn: "ನಿರ್ವಾಹಕ" },
  settings: { en: "Settings", ta: "அமைப்புகள்", hi: "सेटिंग्स", te: "సెట్టింగ్‌లు", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು" },
  darkMode: { en: "Dark Mode", ta: "இருண்ட பயன்முறை", hi: "डार्क मोड", te: "డార్క్ మోడ్", kn: "ಡಾರ್ಕ್ ಮೋಡ್" },
  language: { en: "Language", ta: "மொழி", hi: "भाषा", te: "భాష", kn: "ಭಾಷೆ" },
  logout: { en: "Logout", ta: "வெளியேறு", hi: "लॉगआउट", te: "లాగౌట్", kn: "ಲಾಗೌಟ್" },
  myGroups: { en: "My Chit Groups", ta: "என் சீட்டு குழுக்கள்", hi: "मेरे चिट समूह", te: "నా చిట్ గ్రూపులు", kn: "ನನ್ನ ಚೀಟಿ ಗುಂಪುಗಳು" },
  upcoming: { en: "Upcoming Groups", ta: "வரவிருக்கும் குழுக்கள்", hi: "आगामी समूह", te: "రాబోయే గ్రూపులు", kn: "ಮುಂಬರುವ ಗುಂಪುಗಳು" },
  recent: { en: "Recent Transactions", ta: "சமீபத்திய பரிவர்த்தனைகள்", hi: "हाल के लेनदेन", te: "ఇటీవలి లావాదేవీలు", kn: "ಇತ್ತೀಚಿನ ವಹಿವಾಟುಗಳು" },
  nextAuction: { en: "Next Auction", ta: "அடுத்த ஏலம்", hi: "अगली नीलामी", te: "తదుపరి వేలం", kn: "ಮುಂದಿನ ಹರಾಜು" },
  chitValue: { en: "Chit Value", ta: "சீட்டு மதிப்பு", hi: "चिट मूल्य", te: "చిట్ విలువ", kn: "ಚೀಟಿ ಮೌಲ್ಯ" },
  paidUpto: { en: "Paid Upto", ta: "செலுத்தியது", hi: "भुगतान तक", te: "చెల్లించినది", kn: "ಪಾವತಿಸಿದ್ದು" },
  noDue: { en: "No dues. You're all caught up!", ta: "நிலுவை இல்லை!", hi: "कोई बकाया नहीं!", te: "బకాయిలు లేవు!", kn: "ಬಾಕಿ ಇಲ್ಲ!" },
  welcome: { en: "Welcome back", ta: "மீண்டும் வருக", hi: "फिर से स्वागत है", te: "తిరిగి స్వాగతం", kn: "ಮರಳಿ ಸ್ವಾಗತ" },
  customerPortal: { en: "Customer Portal", ta: "வாடிக்கையாளர் தளம்", hi: "ग्राहक पोर्टल", te: "కస్టమర్ పోర్టల్", kn: "ಗ್ರಾಹಕ ಪೋರ್ಟಲ್" },

} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; dark: boolean; setDark: (d: boolean) => void; t: (k: TKey) => string };
const PrefsContext = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    const l = localStorage.getItem("ost-lang") as Lang | null;
    if (l) setLangState(l);
    // Reset the previous blue-theme preference once; subsequent choices persist.
    const lightDefaultApplied = localStorage.getItem("ost-light-default") === "1";
    if (!lightDefaultApplied) {
      localStorage.setItem("ost-dark", "0");
      localStorage.setItem("ost-light-default", "1");
    }
    setDarkState(lightDefaultApplied && localStorage.getItem("ost-dark") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("ost-lang", l); };
  const setDark = (d: boolean) => { setDarkState(d); localStorage.setItem("ost-dark", d ? "1" : "0"); };
  const t = (k: TKey) => dict[k][lang] ?? dict[k].en;

  return <PrefsContext.Provider value={{ lang, setLang, dark, setDark, t }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const c = useContext(PrefsContext);
  if (!c) throw new Error("usePrefs outside provider");
  return c;
}

export const inr = (n: number | string | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
