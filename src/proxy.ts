import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:8443";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/subscription",
  "/profile",
  "/org",
  "/admin",
];

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Consider expired 30s early to avoid race conditions
    return payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localePrefix = [...routing.locales]
    .sort((a: string, b: string) => b.length - a.length)
    .find((l: string) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  const pathnameWithoutLocale = localePrefix
    ? pathname.slice(localePrefix.length + 1)
    : pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathnameWithoutLocale.startsWith(p),
  );

  if (isProtected) {
    let accessToken = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // Attempt token refresh if access token is missing or expired
    if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            access_token: string;
            refresh_token: string;
          };
          accessToken = data.access_token;

          // Forward refreshed tokens to downstream server code (pages,
          // server components) so they read the new token, not the stale one.
          request.cookies.set("access_token", data.access_token);
          request.cookies.set("refresh_token", data.refresh_token);

          const intlResponse = intlMiddleware(request);
          intlResponse.cookies.set("access_token", data.access_token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 15 * 60, // 15 minutes
            path: "/",
          });
          intlResponse.cookies.set("refresh_token", data.refresh_token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
            path: "/",
          });
          return intlResponse;
        }
      } catch {
        // Refresh failed — fall through to redirect
      }
    }

    if (!accessToken || isTokenExpired(accessToken)) {
      const locale = pathname.split("/")[1] ?? routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|icon.svg|api).*)"],
};
