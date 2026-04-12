"use client";

import { useState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { Input } from "@/presentation/components/atoms/Input";
import { FormField } from "@/presentation/components/molecules/FormField";
import { startCheckout } from "@/app/actions/billing";
import { formatCurrency } from "@/lib/formatCurrency";

interface TeamCheckoutFormProps {
  planPriceId: string;
  planName: string;
  displayAmount: number;
  currency: string;
  locale: string;
  interval: string;
  minSeats?: number;
  labels: {
    orgName: string;
    seat: string;
    seats: string;
    total: string;
    checkout: string;
  };
}

export function TeamCheckoutForm({
  planPriceId,
  planName,
  displayAmount,
  currency,
  locale,
  interval,
  minSeats = 2,
  labels,
}: TeamCheckoutFormProps) {
  const [quantity, setQuantity] = useState(minSeats);
  const total = displayAmount * quantity;
  const formattedTotal = formatCurrency(total, currency, locale);
  const formattedPerSeat = formatCurrency(displayAmount, currency, locale);

  return (
    <form action={startCheckout} className="space-y-6">
      <input type="hidden" name="planPriceId" value={planPriceId} />
      <input type="hidden" name="quantity" value={quantity} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900">{planName}</h2>
        <p className="text-sm text-gray-500">
          {formattedPerSeat}/{labels.seat}/{interval}
        </p>
      </div>

      <FormField label={labels.orgName} name="orgName" required />

      <div className="space-y-1">
        <label htmlFor="seats" className="text-sm font-medium text-gray-700">
          {labels.seats}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="seats"
            type="number"
            min={minSeats}
            max={100}
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(minSeats, parseInt(e.target.value, 10) || minSeats),
              )
            }
            className="w-20 text-center"
          />
          <span className="text-sm text-gray-500">
            {quantity === 1 ? labels.seat : labels.seats}
          </span>
        </div>
      </div>

      <p className="text-lg font-semibold text-gray-900">
        {labels.total}: {formattedTotal}/{interval}
      </p>

      <Button type="submit" variant="primary" className="w-full">
        {labels.checkout}
      </Button>
    </form>
  );
}
