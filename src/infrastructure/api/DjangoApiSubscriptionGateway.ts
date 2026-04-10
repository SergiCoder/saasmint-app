import type {
  BillingPortalInput,
  CheckoutSessionInput,
  ISubscriptionGateway,
} from "@/application/ports/ISubscriptionGateway";
import type { Subscription } from "@/domain/models/Subscription";
import { apiFetch } from "./apiClient";
import { keysToSnake, keysToCamel } from "./caseTransform";

export class DjangoApiSubscriptionGateway implements ISubscriptionGateway {
  private static mapPlan(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const plan = keysToCamel(raw) as Record<string, unknown>;
    if (raw.price && typeof raw.price === "object") {
      plan.price = keysToCamel(raw.price as Record<string, unknown>);
    }
    return plan;
  }

  async getSubscription(currency?: string): Promise<Subscription | null> {
    try {
      const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
      const raw = await apiFetch<Record<string, unknown>>(
        `/billing/subscription/${query}`,
      );
      const sub = keysToCamel<Subscription>(raw);
      if (raw.plan && typeof raw.plan === "object") {
        sub.plan = DjangoApiSubscriptionGateway.mapPlan(
          raw.plan as Record<string, unknown>,
        ) as unknown as Subscription["plan"];
      }
      return sub;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("API 404"))
        return null;
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
    await apiFetch<void>("/billing/subscription/", { method: "DELETE" });
  }

  async resumeSubscription(): Promise<void> {
    await apiFetch<void>("/billing/subscription/", {
      method: "PATCH",
      body: JSON.stringify({ cancel_at_period_end: false }),
    });
  }
}
