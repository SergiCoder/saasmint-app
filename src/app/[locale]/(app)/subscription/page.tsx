import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "../_data/getCurrentUser";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import { BillingPortalButton } from "./_components/BillingPortalButton";
import { CheckoutButton } from "./_components/CheckoutButton";
import { TeamCheckoutButton } from "./_components/TeamCheckoutButton";
import { CurrentSubscriptionCard } from "./_components/CurrentSubscriptionCard";
import { CreditBalanceCard } from "./_components/CreditBalanceCard";
import { FreePlanCard } from "./_components/FreePlanCard";
import { ProductsCheckoutSection } from "./_components/ProductsCheckoutSection";
import { startCheckout } from "@/app/actions/billing";
import { getCreditBalances } from "../_data/getCreditBalances";
import { getSubscriptionPageData } from "./_data/getSubscriptionPageData";
import {
  buildPlanCardGroups,
  buildPlanTranslations,
  buildProductTranslations,
  splitPlanGroupsByContext,
} from "@/app/[locale]/_lib/buildPlanCards";
import {
  parseIntervalParam,
  SUBSCRIPTION_INTERVAL_HREFS,
} from "@/app/[locale]/_lib/pricingInterval";
import { translatePlanName } from "@/lib/i18n/planTranslation";
import { PLAN_TIER_PRO } from "@/domain/models/Plan";
import {
  findPersonalSubscription,
  findTeamSubscription,
} from "@/domain/models/Subscription";

interface BillingPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    error?: string;
    interval?: string;
  }>;
}

export async function generateMetadata({
  params,
}: BillingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  return { title: t("title") };
}

export default async function BillingPage({
  params,
  searchParams,
}: BillingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Kick off `getCreditBalances` in stage 1 — it doesn't depend on the user
  // object, so chaining it behind `getSubscriptionPageData(user)` would burn
  // an unnecessary RTT on the critical path. `getSubscriptionPageData` still
  // chains off the user fetch because it needs `user.preferredCurrency`.
  const userPromise = getCurrentUser();
  const [t, tPlans, tProducts, user, query, creditBalances, pageData] =
    await Promise.all([
      getTranslations("billing"),
      getTranslations("plans"),
      getTranslations("products"),
      userPromise,
      searchParams,
      getCreditBalances(),
      userPromise.then((u) => getSubscriptionPageData(u)),
    ]);
  const {
    subscriptions,
    plans,
    products,
    userOrgs,
    canManageById,
    teamOwnerName,
    isCurrentUserOrgOwner,
  } = pageData;

  const hasOrg = userOrgs.length > 0;
  const personalSubscription = findPersonalSubscription(subscriptions);
  const teamSubscription = findTeamSubscription(subscriptions);
  const isConcurrent = subscriptions.length > 1;
  // URL ?interval=... wins; otherwise default to whichever active sub has a
  // yearly cadence so the relevant tab is pre-selected on first visit.
  const defaultInterval = subscriptions.some((s) => s.plan.interval === "year")
    ? "year"
    : "month";
  const selectedInterval = parseIntervalParam(query.interval, defaultInterval);
  const isTeamSubscription = teamSubscription !== null;
  const teamCanManage =
    teamSubscription !== null && canManageById[teamSubscription.id] === true;
  const personalCanManage =
    personalSubscription !== null &&
    canManageById[personalSubscription.id] === true;

  const { planNames, planDescriptions } = buildPlanTranslations(plans, tPlans);

  // Treat all of the user's subs as "current" — when concurrent, the user's
  // personal AND team plan cards both show the no-CTA "current plan" badge.
  const currentPlans = subscriptions.map((s) => s.plan);

  const groups = buildPlanCardGroups({
    plans,
    currentPlans,
    locale,
    labels: {
      upgrade: t("upgrade"),
      seat: t("seat"),
    },
    planNames,
    planDescriptions,
    renderCta: ({
      plan,
      isCurrent,
      isUpgrade,
      isTeam,
      displayAmount,
      currency,
      ctaLabel,
    }) => {
      if (isCurrent) {
        return (
          <p className="text-center text-sm font-medium text-gray-500">
            {t("currentPlan")}
          </p>
        );
      }
      if (!plan.price) return null;
      if (!isUpgrade) return null;
      const highlighted = plan.tier === PLAN_TIER_PRO;
      // Upgrades for an existing in-context subscription go through the
      // Stripe Billing Portal, not Checkout. Reasons:
      //   1) Backend rule 8 unconditionally 409s a second team checkout for
      //      a user who already owns an org, so the only legal way to move
      //      a team-basic owner to team-pro is via the portal.
      //   2) The portal is Stripe's canonical "change plan" surface — it
      //      handles proration, swaps the subscription item in place, and
      //      fires `customer.subscription.updated` so the existing webhook
      //      keeps the row in sync. Posting a fresh personal Checkout for
      //      a different price would create a parallel personal sub.
      // For a non-billing team member viewing a higher tier we show nothing
      // — they can't action the upgrade and the portal would 403.
      const hasSubInContext = isTeam
        ? teamSubscription !== null
        : personalSubscription !== null;
      const canManageInContext = isTeam ? teamCanManage : personalCanManage;
      if (hasSubInContext) {
        if (!canManageInContext) return null;
        // Pin context whenever we know it; required for concurrent billers
        // (rule 5) and harmless for single-sub callers since it matches the
        // backend default routing.
        const portalContext = isTeam ? "team" : "personal";
        return (
          <BillingPortalButton
            context={portalContext}
            highlighted={highlighted}
            fullWidth
          >
            {ctaLabel}
          </BillingPortalButton>
        );
      }
      if (isTeam) {
        // First-time team checkout: rule 8 guards against starting a second
        // team subscription when the user already owns an org. Without an
        // org we let the standard team-checkout flow (with the org-name
        // form) run.
        if (hasOrg) return null;
        return (
          <TeamCheckoutButton
            planPriceId={plan.price.id}
            highlighted={highlighted}
          >
            {ctaLabel}
          </TeamCheckoutButton>
        );
      }
      return (
        <CheckoutButton
          action={startCheckout}
          field={{ name: "planPriceId", value: plan.price.id }}
          highlighted={highlighted}
        >
          {ctaLabel}
        </CheckoutButton>
      );
    },
  });

  const {
    personal: personalGroups,
    team: teamGroups,
    personalSavingsPct,
    teamSavingsPct,
  } = splitPlanGroupsByContext(groups);

  const sectionLabels = {
    monthly: t("monthly"),
    yearly: t("yearly"),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {query.error === "checkout_failed" && (
        <AlertBanner variant="error">{t("checkoutError")}</AlertBanner>
      )}

      {subscriptions.length === 0 ? (
        <FreePlanCard
          eyebrowLabel={t("currentPlan")}
          planName={tPlans("personal.1.name")}
          description={tPlans("personal.1.description")}
          badgeLabel={tPlans("personal.1.name")}
        />
      ) : (
        <div className="space-y-4">
          {subscriptions.map((s) => (
            <CurrentSubscriptionCard
              key={s.id}
              subscription={s}
              locale={locale}
              planName={translatePlanName(tPlans, s.plan)}
              canManage={canManageById[s.id] === true}
              teamOwnerName={s.plan.context === "team" ? teamOwnerName : null}
              isConcurrent={isConcurrent}
            />
          ))}
        </div>
      )}

      {creditBalances.length > 0 && (
        // Trust backend ordering: it returns rows in the order it wants them
        // displayed (org-first for ORG_MEMBER upgraders per rule 16). Plain
        // personal/org labels stay accurate regardless of why both rows
        // appear, so we don't second-guess scope semantics in the client.
        <div className="space-y-4">
          {creditBalances.map((b) => (
            <CreditBalanceCard
              key={b.scope}
              eyebrowLabel={t("creditBalanceLabel")}
              balance={b.balance}
              unitLabel={t("credits")}
              description={t(
                b.scope === "org"
                  ? "creditBalanceOrgDescription"
                  : "creditBalancePersonalDescription",
              )}
              scopeBadge={t(
                b.scope === "org"
                  ? "creditBalanceOrgBadge"
                  : "creditBalancePersonalBadge",
              )}
              locale={locale}
            />
          ))}
        </div>
      )}

      {isTeamSubscription && !teamCanManage && !personalSubscription ? (
        <p className="text-sm text-gray-500">{t("teamPlanReadonly")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">{t("changePlan")}</p>
      ) : (
        <>
          {personalGroups.length > 0 && (
            <PricingSection
              title={t("personalPlans")}
              description={t("personalPlansDesc")}
              groups={personalGroups}
              labels={sectionLabels}
              savingsBadge={
                personalSavingsPct > 0
                  ? t("savingsBadge", { pct: personalSavingsPct })
                  : undefined
              }
              selectedInterval={selectedInterval}
              {...SUBSCRIPTION_INTERVAL_HREFS}
            />
          )}
          {teamGroups.length > 0 && (
            <PricingSection
              title={t("teamPlans")}
              description={t("teamPlansDesc")}
              groups={teamGroups}
              labels={sectionLabels}
              savingsBadge={
                teamSavingsPct > 0
                  ? t("savingsBadge", { pct: teamSavingsPct })
                  : undefined
              }
              selectedInterval={selectedInterval}
              {...SUBSCRIPTION_INTERVAL_HREFS}
            />
          )}
        </>
      )}

      <ProductsCheckoutSection
        title={t("products")}
        products={products}
        productNames={buildProductTranslations(products, tProducts)}
        creditsLabel={t("credits")}
        buyLabel={t("buy")}
        locale={locale}
        // Picker is only shown for the rule-5b case: an org owner who kept
        // their personal subscription alongside the team plan and therefore
        // has two Stripe customers the credits could land on.
        showPicker={isCurrentUserOrgOwner && isConcurrent}
        pickerLabel={t("productCheckoutContextLabel")}
        personalOptionLabel={t("productCheckoutContextPersonal")}
        teamOptionLabel={t("productCheckoutContextTeam", {
          orgName: userOrgs.at(0)?.name ?? "",
        })}
      />
    </div>
  );
}
