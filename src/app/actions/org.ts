"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CreateInvitation } from "@/application/use-cases/invitation/CreateInvitation";
import { CancelInvitation } from "@/application/use-cases/invitation/CancelInvitation";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import { LeaveOrg } from "@/application/use-cases/org-member/LeaveOrg";
import { TransferOwnership } from "@/application/use-cases/org-member/TransferOwnership";
import { DeleteOrg } from "@/application/use-cases/org/DeleteOrg";
import {
  invitationGateway,
  orgGateway,
  orgMemberGateway,
} from "@/infrastructure/registry";

const invitationRoles = ["admin", "member"] as const;
type InvitationRole = (typeof invitationRoles)[number];

export type OrgActionResult = { ok: true } | { ok: false; error: string };

export async function inviteMember(
  _prevState: unknown,
  formData: FormData,
): Promise<OrgActionResult> {
  const orgId = formData.get("orgId");
  const email = formData.get("email");
  const role = formData.get("role");

  if (
    typeof orgId !== "string" ||
    typeof email !== "string" ||
    typeof role !== "string" ||
    !(invitationRoles as readonly string[]).includes(role)
  ) {
    return { ok: false, error: "Invalid input" };
  }

  try {
    await new CreateInvitation(invitationGateway).execute(orgId, {
      email,
      role: role as InvitationRole,
    });
  } catch {
    return { ok: false, error: "Failed to send invitation" };
  }

  revalidatePath("/org");
  return { ok: true };
}

export async function cancelInvitation(formData: FormData) {
  const orgId = formData.get("orgId");
  const invitationId = formData.get("invitationId");

  if (typeof orgId !== "string" || typeof invitationId !== "string") {
    return;
  }

  try {
    await new CancelInvitation(invitationGateway).execute(orgId, invitationId);
  } catch (err) {
    console.error("Failed to cancel invitation", err);
    return;
  }
  revalidatePath("/org");
}

export async function removeMember(formData: FormData) {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");

  if (typeof orgId !== "string" || typeof userId !== "string") {
    return;
  }

  try {
    await new RemoveOrgMember(orgMemberGateway).execute(orgId, userId);
  } catch (err) {
    console.error("Failed to remove member", err);
    return;
  }
  revalidatePath("/org");
}

export async function leaveOrg(formData: FormData) {
  const orgId = formData.get("orgId");

  if (typeof orgId !== "string") {
    return;
  }

  try {
    await new LeaveOrg(orgMemberGateway).execute(orgId);
  } catch (err) {
    console.error("Failed to leave organization", err);
    return;
  }
  redirect("/dashboard");
}

export async function transferOwnership(
  _prevState: unknown,
  formData: FormData,
): Promise<OrgActionResult> {
  const orgId = formData.get("orgId");
  const userId = formData.get("userId");

  if (typeof orgId !== "string" || typeof userId !== "string") {
    return { ok: false, error: "Invalid input" };
  }

  try {
    await new TransferOwnership(orgMemberGateway).execute(orgId, userId);
  } catch {
    return { ok: false, error: "Failed to transfer ownership" };
  }

  revalidatePath("/org");
  return { ok: true };
}

export async function deleteOrg(formData: FormData) {
  const orgId = formData.get("orgId");

  if (typeof orgId !== "string") {
    return;
  }

  try {
    await new DeleteOrg(orgGateway).execute(orgId);
  } catch (err) {
    console.error("Failed to delete organization", err);
    return;
  }
  redirect("/dashboard");
}
