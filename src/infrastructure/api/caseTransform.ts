export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

export function keysToSnake<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnakeCase(k)] = v;
  }
  return out;
}

/**
 * Recursively convert all object keys to camelCase. Arrays are mapped; plain
 * objects walked; everything else returned as-is. Parse the result with a
 * schema (Zod) to get a typed value — the returned type is deliberately
 * `unknown` because this function does not validate shape.
 */
export function keysToCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(keysToCamel);
  if (value === null || typeof value !== "object") return value;
  // Preserve non-plain objects (Date, Map, etc.) untouched
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[toCamelCase(k)] = keysToCamel(v);
  }
  return out;
}

/**
 * Flatten a nested `phone: { prefix, number }` API object into flat
 * `phonePrefix` / `phone` fields on the target user object.
 */
export function flattenPhone(
  raw: Record<string, unknown>,
  user: Record<string, unknown>,
): void {
  const phoneData = raw.phone;
  if (
    phoneData &&
    typeof phoneData === "object" &&
    "prefix" in phoneData &&
    "number" in phoneData
  ) {
    user.phonePrefix = (phoneData as { prefix: unknown }).prefix;
    user.phone = (phoneData as { number: unknown }).number;
  } else {
    user.phonePrefix = null;
    user.phone = null;
  }
}

/**
 * Convert a raw API object's keys to camelCase and, when a nested `price`
 * object is present, fill in `displayAmount` and `currency` defaults when
 * the API omits them. Covers Plan, Product, and Subscription responses.
 */
export function keysToCamelWithPrice(
  raw: Record<string, unknown>,
  fallbackCurrency = "usd",
): Record<string, unknown> {
  const result = keysToCamel(raw) as Record<string, unknown>;
  const price = result.price;
  if (price && typeof price === "object") {
    const camelPrice = price as Record<string, unknown>;
    if (
      camelPrice.displayAmount === undefined &&
      typeof camelPrice.amount === "number"
    ) {
      camelPrice.displayAmount = camelPrice.amount / 100;
    }
    if (camelPrice.currency === undefined) {
      camelPrice.currency = fallbackCurrency;
    }
  }
  return result;
}
