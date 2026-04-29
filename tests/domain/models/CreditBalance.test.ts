import { describe, it, expect } from "vitest";
import {
  findOrgCreditBalance,
  findPersonalCreditBalance,
  type CreditBalance,
} from "@/domain/models/CreditBalance";

const personal: CreditBalance = { balance: 75, scope: "user" };
const org: CreditBalance = { balance: 500, scope: "org" };

describe("findPersonalCreditBalance", () => {
  it("returns null on an empty list (free tier)", () => {
    expect(findPersonalCreditBalance([])).toBeNull();
  });

  it("returns the user-scoped row when present alongside an org row (concurrent billing)", () => {
    expect(findPersonalCreditBalance([org, personal])).toBe(personal);
  });

  it("returns null when only an org row exists", () => {
    expect(findPersonalCreditBalance([org])).toBeNull();
  });

  it("returns the user-scoped row when it is the only row", () => {
    expect(findPersonalCreditBalance([personal])).toBe(personal);
  });
});

describe("findOrgCreditBalance", () => {
  it("returns null on an empty list (free tier)", () => {
    expect(findOrgCreditBalance([])).toBeNull();
  });

  it("returns the org-scoped row when present alongside a user row (concurrent billing)", () => {
    expect(findOrgCreditBalance([personal, org])).toBe(org);
  });

  it("returns null when only a user row exists", () => {
    expect(findOrgCreditBalance([personal])).toBeNull();
  });

  it("returns the org-scoped row when it is the only row", () => {
    expect(findOrgCreditBalance([org])).toBe(org);
  });
});
