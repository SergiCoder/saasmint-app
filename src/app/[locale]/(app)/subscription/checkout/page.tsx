import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { subscriptionGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { APP_ORIGIN, assertTrustedRedirect } from "../_data/trustedRedirect";

function extractErrorMessage(err: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/^API \d+: (.+)$/s);
  if (!match) return fallback;
  try {
    const body = JSON.parse(match[1]) as { detail?: string } | string[];
    if (Array.isArray(body)) return body.join(" ");
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Body is plain text — use it directly
    return match[1];
  }
  return fallback;
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

  let url: string | null = null;
  try {
    const session = await new StartCheckout(subscriptionGateway).execute({
      planPriceId: plan,
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start checkout", err);
    const message = extractErrorMessage(err);
    redirect(`/subscription?error=${encodeURIComponent(message)}`);
  }

  if (!url) {
    redirect("/subscription");
  }

  redirect(url);
}
