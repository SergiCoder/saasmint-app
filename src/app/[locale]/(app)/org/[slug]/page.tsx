import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import { ListInvitations } from "@/application/use-cases/invitation/ListInvitations";
import {
  orgGateway,
  orgMemberGateway,
  invitationGateway,
} from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { OrgMemberList } from "@/presentation/components/organisms/OrgMemberList";
import { Button } from "@/presentation/components/atoms/Button";
import { removeMember } from "@/app/actions/org";
import { InviteByEmailForm } from "./_components/InviteByEmailForm";
import { InvitationList } from "./_components/InvitationList";
import { LeaveOrgButton } from "./_components/LeaveOrgButton";
import { TransferOwnershipForm } from "./_components/TransferOwnershipForm";
import { DeleteOrgButton } from "./_components/DeleteOrgButton";

interface OrgDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function OrgDetailPage({ params }: OrgDetailPageProps) {
  const { slug } = await params;

  const [t, tCommon, locale, user] = await Promise.all([
    getTranslations("org"),
    getTranslations("common"),
    getLocale(),
    getCurrentUser(),
  ]);
  const orgs = await new ListUserOrgs(orgGateway).execute(user.id);
  const org = orgs.find((o) => o.slug === slug);

  if (!org) notFound();

  const [members, invitations] = await Promise.all([
    new ListOrgMembers(orgMemberGateway).execute(org.id),
    new ListInvitations(invitationGateway).execute(org.id).catch(() => []),
  ]);

  const me = members.find((m) => m.user.id === user.id);
  const isOwner = me?.role === "owner";
  const isAdmin = me?.role === "admin";
  const canManage = isOwner || isAdmin;

  const memberRows = members.map((m) => {
    const isSelf = m.user.id === user.id;
    const isMemberOwner = m.role === "owner";

    let actions: React.ReactNode = null;
    if (isSelf && !isMemberOwner) {
      actions = (
        <LeaveOrgButton
          orgId={org.id}
          label={t("leaveOrg")}
          confirmTitle={t("leaveOrgConfirmTitle")}
          confirmBody={t("leaveOrgConfirmBody")}
          confirmAction={t("leaveOrg")}
          confirmDismiss={tCommon("cancel")}
        />
      );
    } else if (canManage && !isMemberOwner && !isSelf) {
      actions = (
        <form action={removeMember}>
          <input type="hidden" name="orgId" value={org.id} />
          <input type="hidden" name="userId" value={m.user.id} />
          <Button type="submit" variant="danger" size="sm">
            {t("remove")}
          </Button>
        </form>
      );
    }

    return {
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      roleLabel: t(
        `role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}` as
          | "roleMember"
          | "roleAdmin"
          | "roleOwner",
      ),
      actions,
    };
  });

  const transferCandidates = members
    .filter((m) => m.role === "admin")
    .map((m) => ({ id: m.user.id, fullName: m.user.fullName }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <p className="text-sm text-gray-500">{org.slug}</p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("members")}
        </h2>
        <OrgMemberList
          members={memberRows}
          columns={{
            name: t("name"),
            role: t("role"),
            actions: "",
          }}
        />
      </section>

      {canManage && invitations.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("pendingInvitations")}
          </h2>
          <InvitationList
            invitations={invitations}
            orgId={org.id}
            locale={locale}
            columns={{
              email: t("email"),
              role: t("role"),
              invitedBy: t("invitedBy"),
              expiresAt: t("expiresAt"),
              actions: "",
            }}
            roleLabels={{
              admin: t("roleAdmin"),
              member: t("roleMember"),
            }}
            cancelLabel={t("cancelInvitation")}
          />
        </section>
      )}

      {canManage && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("inviteByEmail")}
          </h2>
          <InviteByEmailForm orgId={org.id} />
        </section>
      )}

      {isOwner && transferCandidates.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("transferOwnership")}
          </h2>
          <TransferOwnershipForm
            orgId={org.id}
            candidates={transferCandidates}
            label={t("transferOwnership")}
            selectLabel={t("selectNewOwner")}
            confirmTitle={t("transferOwnershipConfirmTitle")}
            confirmBody={t("transferOwnershipConfirmBody")}
            confirmAction={tCommon("confirm")}
            confirmDismiss={tCommon("cancel")}
          />
        </section>
      )}

      {isOwner && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-red-900">
            {t("dangerZone")}
          </h2>
          <p className="mb-4 text-sm text-red-700">
            {t("deleteOrgConfirmBody")}
          </p>
          <DeleteOrgButton
            orgId={org.id}
            label={t("deleteOrg")}
            confirmTitle={t("deleteOrgConfirmTitle")}
            confirmBody={t("deleteOrgConfirmBody")}
            confirmAction={tCommon("delete")}
            confirmDismiss={tCommon("cancel")}
          />
        </section>
      )}
    </div>
  );
}
