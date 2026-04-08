import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockStartCheckoutExecute = vi.fn();
vi.mock("@/application/use-cases/billing/StartCheckout", () => ({
  StartCheckout: function StartCheckout() {
    return { execute: mockStartCheckoutExecute };
  },
}));

const mockOpenBillingPortalExecute = vi.fn();
vi.mock("@/application/use-cases/billing/OpenBillingPortal", () => ({
  OpenBillingPortal: function OpenBillingPortal() {
    return { execute: mockOpenBillingPortalExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  subscriptionGateway: {},
}));

let startCheckout: typeof import("@/app/actions/billing").startCheckout;
let openBillingPortal: typeof import("@/app/actions/billing").openBillingPortal;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/billing");
  startCheckout = mod.startCheckout;
  openBillingPortal = mod.openBillingPortal;
});

describe("billing server actions", () => {
  describe("startCheckout", () => {
    it("redirects to checkout URL with successUrl and cancelUrl", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith({
        planPriceId: "price_abc",
        successUrl: "http://localhost:3000/subscription?status=success",
        cancelUrl: "http://localhost:3000/subscription",
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://checkout.stripe.com/session_123",
      );
    });

    it("returns early when planPriceId is missing", async () => {
      const formData = new FormData();

      const result = await startCheckout(formData);
      expect(result).toBeUndefined();
      expect(mockStartCheckoutExecute).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("forwards quantity when present and > 0", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_xyz",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "5");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      expect(mockStartCheckoutExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          planPriceId: "price_team",
          quantity: 5,
        }),
      );
    });

    it("omits quantity when value is 0 or invalid", async () => {
      mockStartCheckoutExecute.mockResolvedValue({
        url: "https://checkout.stripe.com/sess_xyz",
      });

      const formData = new FormData();
      formData.set("planPriceId", "price_team");
      formData.set("quantity", "0");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
      const callArgs = mockStartCheckoutExecute.mock.calls[0][0];
      expect(callArgs.quantity).toBeUndefined();
    });

    it("swallows non-redirect errors and returns without redirecting", async () => {
      mockStartCheckoutExecute.mockRejectedValue(new Error("network down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      const result = await startCheckout(formData);
      expect(result).toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("re-throws NEXT_REDIRECT errors from the use-case", async () => {
      mockStartCheckoutExecute.mockRejectedValue(new Error("NEXT_REDIRECT"));

      const formData = new FormData();
      formData.set("planPriceId", "price_abc");

      await expect(startCheckout(formData)).rejects.toThrow("NEXT_REDIRECT");
    });
  });

  describe("openBillingPortal", () => {
    it("redirects to billing portal URL with returnUrl", async () => {
      mockOpenBillingPortalExecute.mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      });

      await expect(openBillingPortal()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockOpenBillingPortalExecute).toHaveBeenCalledWith({
        returnUrl: "http://localhost:3000/subscription",
      });
      expect(mockRedirect).toHaveBeenCalledWith(
        "https://billing.stripe.com/portal_123",
      );
    });

    it("swallows non-redirect errors and returns without redirecting", async () => {
      mockOpenBillingPortalExecute.mockRejectedValue(new Error("portal down"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await openBillingPortal();
      expect(result).toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it("re-throws NEXT_REDIRECT errors from the use-case", async () => {
      mockOpenBillingPortalExecute.mockRejectedValue(
        new Error("NEXT_REDIRECT"),
      );

      await expect(openBillingPortal()).rejects.toThrow("NEXT_REDIRECT");
    });
  });
});
