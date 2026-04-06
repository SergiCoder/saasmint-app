export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  plan: string;
  quantity: number;
  discountPercent: number | null;
  discountEndAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  createdAt: string;
}
