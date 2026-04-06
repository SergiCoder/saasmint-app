import type { PlanPrice } from "./PlanPrice";

export interface Plan {
  id: string;
  name: string;
  description: string;
  context: "personal" | "team";
  interval: "month" | "year";
  isActive: boolean;
  prices: PlanPrice[];
}
