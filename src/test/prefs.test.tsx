import { cleanup, render, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrefsProvider, usePrefs } from "@/lib/prefs";

let prefs: ReturnType<typeof usePrefs> | undefined;
function Probe() {
  prefs = usePrefs();
  return null;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  prefs = undefined;
});
afterEach(cleanup);

describe("Light blue and white default", () => {
  it("resets an old dark preference to light", async () => {
    localStorage.setItem("ost-dark", "1");
    render(<PrefsProvider><Probe /></PrefsProvider>);
    await waitFor(() => expect(prefs?.dark).toBe(false));
    expect(localStorage.getItem("ost-dark")).toBe("0");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("keeps dark mode available after choosing it in settings", async () => {
    const first = render(<PrefsProvider><Probe /></PrefsProvider>);
    act(() => prefs?.setDark(true));
    expect(prefs?.dark).toBe(true);
    first.unmount();
    render(<PrefsProvider><Probe /></PrefsProvider>);
    await waitFor(() => expect(prefs?.dark).toBe(true));
  });
});