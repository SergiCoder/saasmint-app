"use client";

import { useRef, useState, useTransition } from "react";
import { changePlan } from "@/app/actions/billing";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { Button } from "@/presentation/components/atoms/Button";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface ChangePlanButtonProps {
  children: React.ReactNode;
  planPriceId: string;
  /** True when target price < current price — backend defers to period end. */
  isDeferred: boolean;
  highlighted?: boolean;
  fullWidth?: boolean;
  confirmTitle: string;
  /** Already-interpolated body (caller substitutes plan name, price, period-end date). */
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
  /**
   * Targets one of the caller's two possible subscriptions during concurrent
   * personal+team billing. Omit for single-sub callers — the backend default
   * (`team` for org members, `personal` otherwise) is correct.
   */
  context?: SubscriptionContext;
}

export function ChangePlanButton({
  children,
  planPriceId,
  isDeferred,
  highlighted = false,
  fullWidth = false,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
  context,
}: ChangePlanButtonProps) {
  const translateError = useActionErrorMessage();
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    confirmRef.current?.open();
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await changePlan(planPriceId, context);
      if (result.ok) {
        confirmRef.current?.close();
      } else {
        setError(translateError(result));
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant={highlighted ? "primary" : "secondary"}
        className={fullWidth ? "w-full" : ""}
        onClick={open}
      >
        {children}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        variant={isDeferred ? "primary" : "primary"}
        loading={isPending}
        onConfirm={confirm}
        onClose={() => setError(null)}
      />
    </>
  );
}
