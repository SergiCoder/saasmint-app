import type { Subscription } from "@/domain/models/Subscription";

export interface CheckoutSessionInput {
  planPriceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingPortalInput {
  returnUrl: string;
}

export interface ISubscriptionGateway {
  getSubscription(): Promise<Subscription | null>;
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;
}
