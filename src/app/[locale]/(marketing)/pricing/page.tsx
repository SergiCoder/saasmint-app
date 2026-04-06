import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { planGateway, subscriptionGateway } from "@/infrastructure/registry";
import {
  PricingTable,
  type PricingTableProps,
} from "@/presentation/components/organisms/PricingTable";
import { GetStartedButton } from "./_components/GetStartedButton";
import { CheckoutButton } from "@/app/[locale]/(app)/billing/_components/CheckoutButton";
import { TeamCheckoutButton } from "@/app/[locale]/(app)/billing/_components/TeamCheckoutButton";
import { getOptionalUser } from "../_data/getOptionalUser";
import type { Plan } from "@/domain/models/Plan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function PricingPage() {
  const [t, user] = await Promise.all([
    getTranslations("billing"),
    getOptionalUser(),
  ]);

  let plans: Plan[] = [];
  try {
    plans = await new ListPlans(planGateway).execute();
  } catch (err) {
    console.error("Failed to fetch plans", err);
  }

  let currentPlanId: string | undefined;
  if (user) {
    try {
      const subscription = await new GetSubscription(
        subscriptionGateway,
      ).execute();
      currentPlanId = subscription?.plan;
    } catch {
      /* no subscription */
    }
  }

  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentPrice = currentPlan?.prices[0]?.amount ?? 0;

  const planCards: PricingTableProps["plans"] = plans.map((plan) => {
    const highlighted = plan.name.toLowerCase().includes("pro");
    const unitPrice = plan.prices[0]?.amount ?? 0;
    const isTeam = plan.context === "team";
    const isCurrent = Boolean(currentPlanId) && plan.id === currentPlanId;
    const isUpgrade = unitPrice > currentPrice;

    let cta: React.ReactNode;

    if (!user) {
      cta = (
        <GetStartedButton highlighted={highlighted}>
          {t("getStarted")}
        </GetStartedButton>
      );
    } else if (isCurrent) {
      cta = <span />;
    } else if (plan.prices[0]) {
      const ctaLabel = isUpgrade ? t("upgrade") : t("downgrade");
      cta = isTeam ? (
        <TeamCheckoutButton
          planPriceId={plan.prices[0].stripePriceId}
          unitPrice={unitPrice}
          interval={plan.interval}
          highlighted={highlighted}
          seatLabel={t("seat")}
          seatsLabel={t("seats")}
          perSeatLabel={t("perSeat")}
        >
          {ctaLabel}
        </TeamCheckoutButton>
      ) : (
        <CheckoutButton
          planPriceId={plan.prices[0].stripePriceId}
          highlighted={highlighted}
        >
          {ctaLabel}
        </CheckoutButton>
      );
    } else {
      cta = <span />;
    }

    return {
      name: plan.name,
      price: plan.prices[0] ? `$${(unitPrice / 100).toFixed(0)}` : "$0",
      interval: isTeam ? `${t("perSeat")}/${plan.interval}` : plan.interval,
      description: plan.description,
      highlighted,
      cta,
    };
  });

  if (planCards.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("title")}
        </h1>
      </div>
      <div className="mt-12">
        <PricingTable plans={planCards} />
      </div>
    </div>
  );
}
