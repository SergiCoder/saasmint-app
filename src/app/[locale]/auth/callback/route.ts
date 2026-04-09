import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const expiresIn = searchParams.get("expires_in");
  const error = searchParams.get("error");
  const nextParam = searchParams.get("next") ?? "/dashboard";

  // Prevent open redirect: only allow relative paths (reject protocol-relative URLs)
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
  }

  if (accessToken && refreshToken) {
    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: expiresIn ? parseInt(expiresIn, 10) : 900,
      path: "/",
    });

    cookieStore.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=oauth_error", origin));
}
