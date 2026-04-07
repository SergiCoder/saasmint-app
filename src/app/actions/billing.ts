"use server";

import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import { subscriptionGateway } from "@/infrastructure/registry";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const TRUSTED_REDIRECT_HOSTS = ["checkout.stripe.com", "billing.stripe.com"];

const MAX_CHECKOUT_QUANTITY = 100;

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

export async function startCheckout(formData: FormData) {
  const planPriceId = formData.get("planPriceId");
  const quantityRaw = formData.get("quantity");

  if (typeof planPriceId !== "string") {
    return;
  }

  let quantity: number | undefined;
  if (typeof quantityRaw === "string" && quantityRaw) {
    const parsed = parseInt(quantityRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      quantity = Math.min(parsed, MAX_CHECKOUT_QUANTITY);
    }
  }

  let url: string;
  try {
    ({ url } = await new StartCheckout(subscriptionGateway).execute({
      planPriceId,
      ...(quantity ? { quantity } : {}),
      successUrl: `${APP_ORIGIN}/billing?status=success`,
      cancelUrl: `${APP_ORIGIN}/billing`,
    }));
    assertTrustedRedirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Failed to start checkout", err);
    return;
  }
  redirect(url);
}

export async function openBillingPortal() {
  let url: string;
  try {
    ({ url } = await new OpenBillingPortal(subscriptionGateway).execute({
      returnUrl: `${APP_ORIGIN}/billing`,
    }));
    assertTrustedRedirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Failed to open billing portal", err);
    return;
  }
  redirect(url);
}
