import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Translator stub: returns the key when called with no params, or the key
 * with `{param}` placeholders substituted (and unused params appended,
 * space-separated) when called with a params object. This lets component
 * tests assert on interpolated values — e.g. `getByText(/Jane Doe/)` —
 * without coupling to any particular key-name format.
 */
function translate(key: string, params?: Record<string, unknown>): string {
  if (!params) return key;
  const entries = Object.entries(params);
  if (entries.length === 0) return key;
  let out = key;
  const leftover: string[] = [];
  for (const [name, value] of entries) {
    const placeholder = `{${name}}`;
    const str = String(value);
    if (out.includes(placeholder)) {
      out = out.replaceAll(placeholder, str);
    } else {
      leftover.push(str);
    }
  }
  return leftover.length > 0 ? `${out} ${leftover.join(" ")}` : out;
}

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => translate,
  useMessages: () => ({}),
}));

vi.mock("@/lib/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    redirect: vi.fn(),
  };
});

/**
 * Silence `console.error` by default. Tests that need to assert on it can
 * still do so via `vi.mocked(console.error)` — they just don't need to
 * re-stub it. Restored after every test so the spy count stays clean.
 */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});
