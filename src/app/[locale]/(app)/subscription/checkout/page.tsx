import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { subscriptionGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const TRUSTED_REDIRECT_HOSTS = ["checkout.stripe.com", "billing.stripe.com"];

function assertTrustedRedirect(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid redirect URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Untrusted redirect URL");
  }
  if (!TRUSTED_REDIRECT_HOSTS.includes(parsed.hostname)) {
    throw new Error("Untrusted redirect URL");
  }
}

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const [, { plan }] = await Promise.all([getCurrentUser(), searchParams]);

  if (!plan) {
    redirect("/subscription");
  }

  let url: string;
  try {
    ({ url } = await new StartCheckout(subscriptionGateway).execute({
      planPriceId: plan,
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    }));
    assertTrustedRedirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Failed to start checkout", err);
    redirect("/subscription");
  }

  redirect(url);
}
