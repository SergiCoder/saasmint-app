import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { subscriptionGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  await getCurrentUser();
  const { plan } = await searchParams;

  if (!plan) {
    redirect("/billing");
  }

  const { url } = await new StartCheckout(subscriptionGateway).execute({
    planPriceId: plan,
    successUrl: `${APP_ORIGIN}/billing?status=success`,
    cancelUrl: `${APP_ORIGIN}/billing`,
  });

  redirect(url);
}
