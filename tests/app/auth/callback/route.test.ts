import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: (...args: unknown[]) => mockCookieSet(...args),
  }),
}));

import { GET } from "@/app/[locale]/auth/callback/route";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/en/auth/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets auth cookies and redirects to /dashboard on success", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
      }),
    );

    expect(mockCookieSet).toHaveBeenCalledWith(
      "access_token",
      "tok_abc",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(mockCookieSet).toHaveBeenCalledWith(
      "refresh_token",
      "ref_abc",
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("redirects to custom next path on success", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "/reset-password",
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/reset-password",
    );
  });

  it("redirects to /login with oauth_error when error param is present", async () => {
    const response = await GET(makeRequest({ error: "access_denied" }));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it("redirects to /login with oauth_error when no tokens provided", async () => {
    const response = await GET(makeRequest({}));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
  });

  it("blocks protocol-relative open redirect (//evil.com)", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "//evil.com",
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("blocks absolute URL open redirect", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "https://evil.com",
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });
});
