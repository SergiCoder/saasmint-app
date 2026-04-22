"use server";

import { redirect } from "next/navigation";
import { invitationGateway } from "@/infrastructure/registry";
import { setAuthCookies } from "@/infrastructure/auth/cookies";
import {
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

export async function acceptInvitation(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const token = getString(formData, "token");
  const fullName = getString(formData, "fullName");
  const password = getString(formData, "password");

  if (!token || !fullName || !password) {
    return fail("invalid_input");
  }
  if (fullName.length < 3 || fullName.length > 255) {
    return fail("full_name_invalid");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return fail("password_too_short");
  }

  try {
    const { accessToken, refreshToken } =
      await invitationGateway.acceptInvitation(token, { fullName, password });
    await setAuthCookies(accessToken, refreshToken);
  } catch (err) {
    console.error("Failed to accept invitation", err);
    return toActionError(err);
  }
  redirect("/dashboard");
}

// Fire-and-forget: consumed via `<form action={fn}>` which requires
// `Promise<void>`. Errors log server-side; the redirect on success is the
// signal to the user.
export async function declineInvitation(formData: FormData): Promise<void> {
  const token = getString(formData, "token");
  if (!token) return;

  try {
    await invitationGateway.declineInvitation(token);
  } catch (err) {
    console.error("Failed to decline invitation", err);
    return;
  }
  redirect("/dashboard");
}
