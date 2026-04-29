/**
 * One scope of the caller's credit balance. Concurrent personal+team billers
 * (rule 5) get two rows — one `user`-scoped and one `org`-scoped; everyone
 * else gets at most one. Free-tier users with no credits get an empty list.
 */
export interface CreditBalance {
  readonly balance: number;
  readonly scope: "user" | "org";
}

/**
 * `GET /billing/credits/me/` returns up to two rows. These selectors pick the
 * row that matches the caller's scope; `null` when no row of that scope exists.
 */
export function findPersonalCreditBalance(
  balances: readonly CreditBalance[],
): CreditBalance | null {
  return balances.find((b) => b.scope === "user") ?? null;
}

export function findOrgCreditBalance(
  balances: readonly CreditBalance[],
): CreditBalance | null {
  return balances.find((b) => b.scope === "org") ?? null;
}
