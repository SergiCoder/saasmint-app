import type {
  IProductGateway,
  ProductCheckoutInput,
} from "@/application/ports/IProductGateway";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import type { Product } from "@/domain/models/Product";
import { apiFetch } from "./apiClient";
import { keysToCamelWithPrice, keysToSnake } from "./caseTransform";
import { CheckoutSessionResponseSchema, ProductSchema } from "./schemas";

function contextQuery(context: SubscriptionContext | undefined): string {
  // Defense-in-depth: even though the type narrows to a literal union, server
  // actions hand untrusted RPC arguments to this gateway. Only emit the query
  // for values that exactly match the whitelist; drop anything else silently
  // so a tampered payload can't inject extra params or path characters.
  if (context !== "personal" && context !== "team") return "";
  return `?context=${context}`;
}

export class DjangoApiProductGateway implements IProductGateway {
  async listProducts(currency?: string): Promise<Product[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      `/billing/products/${query}`,
    );
    return data.results.map((r) =>
      ProductSchema.parse(keysToCamelWithPrice(r, currency)),
    );
  }

  async createCheckoutSession(
    input: ProductCheckoutInput,
  ): Promise<{ url: string }> {
    const { context, ...body } = input;
    const raw = await apiFetch<unknown>(
      `/billing/product-checkout-sessions/${contextQuery(context)}`,
      {
        method: "POST",
        body: JSON.stringify(keysToSnake(body)),
      },
    );
    return CheckoutSessionResponseSchema.parse(raw);
  }
}
