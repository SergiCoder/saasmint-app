import type { ProductPrice } from "./ProductPrice";

export interface Product {
  id: string;
  name: string;
  type: "one_time";
  credits: number;
  isActive: boolean;
  price: ProductPrice | null;
}
