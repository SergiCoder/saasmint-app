import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import {
  planGateway,
  productGateway,
  subscriptionGateway,
} from "@/infrastructure/registry";
import {
  PricingTable,
  type PricingTableProps,
} from "@/presentation/components/organisms/PricingTable";
import { GetStartedButton } from "./_components/GetStartedButton";
import { CheckoutButton } from "@/app/[locale]/(app)/billing/_components/CheckoutButton";
import { TeamCheckoutButton } from "@/app/[locale]/(app)/billing/_components/TeamCheckoutButton";
import { getOptionalUser } from "../_data/getOptionalUser";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

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
  let products: Product[] = [];
  if (user) {
    try {
      const [subscription, fetchedProducts] = await Promise.all([
        new GetSubscription(subscriptionGateway).execute(),
        new ListProducts(productGateway).execute(),
      ]);
      currentPlanId = subscription?.plan;
      products = fetchedProducts;
    } catch {
      /* no subscription or products */
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

      {products.length > 0 && (
        <div className="mt-16 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("products")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {product.credits} {t("credits")}
                </p>
                {product.prices[0] && (
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    ${(product.prices[0].amount / 100).toFixed(0)}
                  </p>
                )}
                {product.prices[0] && (
                  <div className="mt-4">
                    <CheckoutButton
                      planPriceId={product.prices[0].stripePriceId}
                    >
                      {t("buy")}
                    </CheckoutButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
