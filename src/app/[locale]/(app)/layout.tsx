import { getTranslations } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { subscriptionGateway, orgGateway } from "@/infrastructure/registry";
import { SignOutButton } from "../_components/SignOutButton";
import { getCurrentUser } from "./_data/getCurrentUser";

interface AppLayoutRouteProps {
  children: React.ReactNode;
}

export default async function AppLayoutRoute({
  children,
}: AppLayoutRouteProps) {
  const [t, tCommon, user, subscription] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getCurrentUser(),
    new GetSubscription(subscriptionGateway).execute().catch(() => null),
  ]);

  const isTeamSubscription = subscription?.plan.context === "team";
  const userOrgs = await new ListUserOrgs(orgGateway)
    .execute(user.id)
    .catch(() => []);
  const hasOrg = isTeamSubscription || userOrgs.length > 0;

  const navLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/feature1", label: t("feature1") },
    { href: "/feature2", label: t("feature2") },
    ...(hasOrg ? [{ href: "/org", label: t("org") }] : []),
  ];

  const userMenuItems = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/profile", label: t("profile") },
    { href: "/subscription", label: t("subscription") },
    ...(hasOrg ? [{ href: "/org", label: t("org") }] : []),
  ];

  return (
    <AppLayout
      appName="SaaSmint"
      navLinks={navLinks}
      user={{
        fullName: user.fullName ?? user.email,
        pronouns: user.pronouns,
        avatarUrl: user.avatarUrl,
      }}
      userMenuItems={userMenuItems}
      userMenuSignOut={<SignOutButton label={t("signOut")} />}
      toggleNavLabel={tCommon("toggleNav")}
    >
      {children}
    </AppLayout>
  );
}
