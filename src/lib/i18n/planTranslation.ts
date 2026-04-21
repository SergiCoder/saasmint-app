import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";

/**
 * next-intl's typed translator narrows keys to the literal union derived from
 * the messages JSON, which can't represent keys built from runtime data
 * (`${context}.${tier}.name`). These helpers localise the `as never` cast so
 * callers don't sprinkle it across pages. Missing translations still surface
 * at runtime as next-intl's `MISSING_MESSAGE`.
 *
 * Parameter type `(key: never) => string` is assignable from any typed
 * translator — `never` is the bottom type, so a function that accepts a
 * specific literal union is assignable where one accepting `never` is
 * required.
 */

type DynamicTranslator = (key: never) => string;

export function translatePlanName(
  tPlans: DynamicTranslator,
  plan: Pick<Plan, "context" | "tier">,
): string {
  return tPlans(`${plan.context}.${plan.tier}.name` as never);
}

export function translatePlanDescription(
  tPlans: DynamicTranslator,
  plan: Pick<Plan, "context" | "tier">,
): string {
  return tPlans(`${plan.context}.${plan.tier}.description` as never);
}

export function translateProductName(
  tProducts: DynamicTranslator,
  product: Pick<Product, "credits">,
): string {
  return tProducts(`${product.credits}` as never);
}
