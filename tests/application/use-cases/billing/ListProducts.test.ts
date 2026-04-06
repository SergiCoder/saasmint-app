import { describe, it, expect, vi } from "vitest";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import type { IProductGateway } from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";

const products: Product[] = [
  {
    id: "prod1",
    name: "Boost 1",
    type: "one_time",
    credits: 100,
    isActive: true,
    prices: [
      {
        id: "pp1",
        stripePriceId: "price_boost1",
        currency: "usd",
        amount: 999,
      },
    ],
  },
];

function makeGateway(overrides?: Partial<IProductGateway>): IProductGateway {
  return {
    listProducts: vi.fn().mockResolvedValue(products),
    ...overrides,
  };
}

describe("ListProducts", () => {
  it("returns all active products", async () => {
    const gateway = makeGateway();
    const result = await new ListProducts(gateway).execute();
    expect(result).toEqual(products);
    expect(gateway.listProducts).toHaveBeenCalledOnce();
  });
});
