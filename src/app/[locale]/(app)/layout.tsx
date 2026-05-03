import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { redirect } from "@/lib/i18n/navigation";
import { getPathnameWithoutLocale } from "@/lib/pathname";
import { isLocale } from "@/lib/i18n/routing";
import { findTeamSubscription } from "@/domain/models/Subscription";
import { SignOutButton } from "../_components/SignOutButton";
import { getCurrentUser } from "./_data/getCurrentUser";
import { getSubscriptions } from "./_data/getSubscriptions";
import { getUserOrgs } from "./_data/getUserOrgs";

// next-intl persists the active locale on a `NEXT_LOCALE` cookie. Mirror the
// authenticated user's preferred locale onto that cookie so post-logout
// anonymous navigation lands on their language without re-detection.
const NEXT_LOCALE_COOKIE = "NEXT_LOCALE";
const NEXT_LOCALE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface AppLayoutRouteProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayoutRoute({
  children,
  params,
}: AppLayoutRouteProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Independent calls run fully in parallel; only `getSubscriptions` chains
  // off the user fetch so it can pass `user.preferredCurrency` and share the
  // (app) page's React.cache key for the subscription roundtrip. Awaiting
  // the user before kicking off the rest would force `t`, `tCommon`, and
  // `getUserOrgs` to wait an extra RTT for no benefit.
  const userPromise = getCurrentUser();
  const [t, tCommon, user, subscriptions, userOrgs] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    userPromise,
    userPromise.then((u) => getSubscriptions(u.preferredCurrency)),
    getUserOrgs(),
  ]);

  // If the user has a preferred locale that differs from the current URL,
  // redirect server-side before we render. Saves a client-side flash.
  if (
    user.preferredLocale &&
    user.preferredLocale !== locale &&
    isLocale(user.preferredLocale)
  ) {
    const pathname = await getPathnameWithoutLocale();
    redirect({ href: pathname, locale: user.preferredLocale });
  }

  // Sync NEXT_LOCALE so future anonymous visits (after logout) start on the
  // user's preferred locale. Only writes when the cookie is missing or
  // stale, to avoid an unnecessary Set-Cookie on every render.
  if (user.preferredLocale && isLocale(user.preferredLocale)) {
    const cookieStore = await cookies();
    if (cookieStore.get(NEXT_LOCALE_COOKIE)?.value !== user.preferredLocale) {
      cookieStore.set(NEXT_LOCALE_COOKIE, user.preferredLocale, {
        path: "/",
        sameSite: "lax",
        maxAge: NEXT_LOCALE_MAX_AGE,
      });
    }
  }

  const hasOrg =
    findTeamSubscription(subscriptions) !== null || userOrgs.length > 0;

  const navLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/feature1", label: t("feature1") },
    { href: "/feature2", label: t("feature2") },
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
