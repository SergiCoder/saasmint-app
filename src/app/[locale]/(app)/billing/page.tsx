import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import {
  subscriptionGateway,
  planGateway,
  productGateway,
} from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { SubscriptionCard } from "@/presentation/components/organisms/SubscriptionCard";
import {
  PricingTable,
  type PricingTableProps,
} from "@/presentation/components/organisms/PricingTable";
import { CheckoutButton } from "./_components/CheckoutButton";
import { TeamCheckoutButton } from "./_components/TeamCheckoutButton";
import { BillingPortalButton } from "./_components/BillingPortalButton";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function BillingPage() {
  const [t] = await Promise.all([getTranslations("billing"), getCurrentUser()]);

  const subscription = await new GetSubscription(subscriptionGateway).execute();

  let plans: Plan[] = [];
  let products: Product[] = [];
  try {
    [plans, products] = await Promise.all([
      new ListPlans(planGateway).execute(),
      new ListProducts(productGateway).execute(),
    ]);
  } catch (err) {
    console.error("Failed to fetch plans/products", err);
  }

  const planName = subscription
    ? plans.find((p) => p.id === subscription.plan)?.name
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>

      {subscription && (
        <SubscriptionCard
          planName={planName ?? t("currentPlan")}
          status={subscription.status}
          statusLabel={subscription.status}
          interval=""
          price={`${subscription.quantity} ${subscription.quantity === 1 ? t("seat") : t("seats")}`}
          currentPeriodEnd={new Date(
            subscription.currentPeriodEnd,
          ).toLocaleDateString()}
          periodEndLabel={t("periodEnd")}
          cancelAtPeriodEnd={subscription.canceledAt !== null}
          cancelLabel={
            subscription.canceledAt !== null ? t("cancel") : undefined
          }
          actions={<BillingPortalButton>{t("portal")}</BillingPortalButton>}
        />
      )}

      <PlansSection plans={plans} currentPlanId={subscription?.plan} t={t} />

      {products.length > 0 && (
        <div className="space-y-4">
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
                {product.price && (
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    ${(product.price.amount / 100).toFixed(0)}
                  </p>
                )}
                {product.price && (
                  <div className="mt-4">
                    <CheckoutButton planPriceId={product.price.id}>
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

function PlansSection({
  plans,
  currentPlanId,
  t,
}: {
  plans: Plan[];
  currentPlanId?: string;
  t: Awaited<ReturnType<typeof getTranslations<"billing">>>;
}) {
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentPrice = currentPlan?.price?.amount ?? 0;

  const planCards: PricingTableProps["plans"] = plans.map((plan) => {
    const highlighted = plan.name.toLowerCase().includes("pro");
    const unitPrice = plan.price?.amount ?? 0;
    const isTeam = plan.context === "team";
    const isCurrent = plan.id === currentPlanId;
    const isUpgrade = unitPrice > currentPrice;
    const ctaLabel = isUpgrade ? t("upgrade") : t("downgrade");

    return {
      name: plan.name,
      price: plan.price ? `$${(unitPrice / 100).toFixed(0)}` : "$0",
      interval: isTeam ? `${t("perSeat")}/${plan.interval}` : plan.interval,
      description: plan.description,
      highlighted,
      cta: isCurrent ? (
        <span />
      ) : plan.price ? (
        isTeam ? (
          <TeamCheckoutButton
            planPriceId={plan.price.id}
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
            planPriceId={plan.price.id}
            highlighted={highlighted}
          >
            {ctaLabel}
          </CheckoutButton>
        )
      ) : (
        <span />
      ),
    };
  });

  if (planCards.length === 0) {
    return <p className="text-sm text-gray-500">{t("changePlan")}</p>;
  }

  return <PricingTable plans={planCards} />;
}
