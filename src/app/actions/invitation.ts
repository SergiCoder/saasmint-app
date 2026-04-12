"use server";

import { redirect } from "next/navigation";
import { AcceptInvitation } from "@/application/use-cases/invitation/AcceptInvitation";
import { DeclineInvitation } from "@/application/use-cases/invitation/DeclineInvitation";
import { invitationGateway } from "@/infrastructure/registry";

export async function acceptInvitation(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string") {
    return;
  }

  try {
    await new AcceptInvitation(invitationGateway).execute(token);
  } catch (err) {
    console.error("Failed to accept invitation", err);
    return;
  }
  redirect("/org");
}

export async function declineInvitation(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string") {
    return;
  }

  try {
    await new DeclineInvitation(invitationGateway).execute(token);
  } catch (err) {
    console.error("Failed to decline invitation", err);
    return;
  }
  redirect("/dashboard");
}
