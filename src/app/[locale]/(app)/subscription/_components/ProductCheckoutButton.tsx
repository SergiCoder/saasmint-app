"use client";

import { useActionState } from "react";
import { Button } from "@/presentation/components/atoms/Button";
import { startProductCheckout } from "@/app/actions/billing";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface ProductCheckoutButtonProps {
  productPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function ProductCheckoutButton({
  productPriceId,
  children,
  highlighted = false,
}: ProductCheckoutButtonProps) {
  const translateError = useActionErrorMessage();
  const [state, action, isPending] = useActionState(
    startProductCheckout,
    undefined,
  );

  return (
    <form action={action}>
      <input type="hidden" name="productPriceId" value={productPriceId} />
      {state && !state.ok && (
        <p className="mb-2 text-sm text-red-600">{translateError(state)}</p>
      )}
      <Button
        type="submit"
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
        loading={isPending}
      >
        {children}
      </Button>
    </form>
  );
}
