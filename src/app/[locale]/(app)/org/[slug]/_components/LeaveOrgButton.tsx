"use client";

import { useRef, useState, useTransition } from "react";
import { leaveOrg } from "@/app/actions/org";
import { Button } from "@/presentation/components/atoms/Button";
import {
  ConfirmDialog,
  type ConfirmDialogHandle,
} from "@/presentation/components/molecules/ConfirmDialog";

interface LeaveOrgButtonProps {
  orgId: string;
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
}

export function LeaveOrgButton({
  orgId,
  label,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
}: LeaveOrgButtonProps) {
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const formData = new FormData();
    formData.set("orgId", orgId);
    startTransition(async () => {
      try {
        await leaveOrg(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setError(null);
          confirmRef.current?.open();
        }}
      >
        {label}
      </Button>
      <ConfirmDialog
        ref={confirmRef}
        title={confirmTitle}
        body={error ?? confirmBody}
        confirmLabel={confirmAction}
        cancelLabel={confirmDismiss}
        loading={isPending}
        onConfirm={confirm}
        onClose={() => setError(null)}
      />
    </>
  );
}
