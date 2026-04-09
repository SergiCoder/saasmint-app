"use server";

import { redirect } from "next/navigation";
import { publicApiFetch } from "@/infrastructure/api/apiClient";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";
import { setAuthCookies } from "@/infrastructure/auth/cookies";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function extractCredentials(
  formData: FormData,
): { email: string; password: string } | { error: string } {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  return { email, password };
}

export async function signIn(_prevState: unknown, formData: FormData) {
  const result = extractCredentials(formData);
  if ("error" in result) return result;

  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify(result),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return { error: message };
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);

  const plan = formData.get("plan");
  if (typeof plan === "string" && plan) {
    redirect(`/subscription/checkout?plan=${encodeURIComponent(plan)}`);
  }

  redirect("/dashboard");
}

export async function signUp(_prevState: unknown, formData: FormData) {
  const result = extractCredentials(formData);
  if ("error" in result) return result;

  const fullName = formData.get("fullName");
  if (
    typeof fullName !== "string" ||
    fullName.length < 3 ||
    fullName.length > 255
  ) {
    return { error: "Full name must be between 3 and 255 characters" };
  }

  try {
    await publicApiFetch("/auth/register/", {
      method: "POST",
      body: JSON.stringify({
        email: result.email,
        password: result.password,
        full_name: fullName,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return { error: message };
  }

  redirect("/login?registered=true");
}

export async function resetPassword(_prevState: unknown, formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return { error: "Email is required" };
  }

  // Fire-and-forget: always return success to avoid leaking whether the email exists.
  try {
    await publicApiFetch("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch {
    // Swallow errors — never reveal whether the email exists
  }

  return { success: true };
}

export async function updatePassword(_prevState: unknown, formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const token = formData.get("token");

  if (typeof password !== "string" || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    await publicApiFetch("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({
        token: typeof token === "string" ? token : "",
        password,
      }),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update password";
    return { error: message };
  }

  return { success: true };
}

export async function verifyEmail(token: string): Promise<{ error?: string }> {
  let data: TokenResponse;
  try {
    data = await publicApiFetch<TokenResponse>("/auth/verify-email/", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return { error: message };
  }

  await setAuthCookies(data.access_token, data.refresh_token, data.expires_in);
  return {};
}

export async function signOut() {
  await new SignOut(authGateway).execute();
  redirect("/login");
}
