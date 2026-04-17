import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { ApiError } from "@/domain/errors/ApiError";
import { apiFetch, apiFetchVoid } from "./apiClient";
import {
  keysToCamel,
  keysToCamelWithPrice,
  keysToSnake,
} from "./caseTransform";
import { SubscriptionSchema } from "./schemas";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  async getSubscription(currency?: string): Promise<Subscription | null> {
    try {
      const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
      const raw = await apiFetch<Record<string, unknown>>(
        `/billing/subscriptions/me/${query}`,
      );
      const camel = keysToCamel(raw) as Record<string, unknown>;
      if (raw.plan && typeof raw.plan === "object") {
        camel.plan = keysToCamelWithPrice(
          raw.plan as Record<string, unknown>,
          currency,
        );
      }
      return SubscriptionSchema.parse(camel);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/checkout-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }> {
    return apiFetch<{ url: string }>("/billing/portal-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
  }

  async cancelSubscription(): Promise<void> {
    await apiFetchVoid("/billing/subscriptions/me/", { method: "DELETE" });
  }

  async resumeSubscription(): Promise<void> {
    await apiFetchVoid("/billing/subscriptions/me/", {
      method: "PATCH",
      body: JSON.stringify({ cancel_at_period_end: false }),
    });
  }

  async updateSeats(quantity: number): Promise<void> {
    await apiFetchVoid("/billing/subscriptions/me/", {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  }
}
