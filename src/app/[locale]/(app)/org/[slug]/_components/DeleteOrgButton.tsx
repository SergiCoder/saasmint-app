"use client";

import { useRef, useState, useTransition } from "react";
import { deleteOrg } from "@/app/actions/org";
import { Button } from "@/presentation/components/atoms/Button";

interface DeleteOrgButtonProps {
  orgId: string;
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
}

export function DeleteOrgButton({
  orgId,
  label,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
}: DeleteOrgButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const confirm = () => {
    const formData = new FormData();
    formData.set("orgId", orgId);
    startTransition(async () => {
      try {
        await deleteOrg(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    });
  };

  return (
    <>
      <Button type="button" variant="danger" onClick={open}>
        {label}
      </Button>
      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/40"
        onClose={() => setError(null)}
      >
        <div className="w-[min(90vw,28rem)] space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {confirmTitle}
          </h2>
          <p className="text-sm text-gray-600">{confirmBody}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={close}
              disabled={isPending}
            >
              {confirmDismiss}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirm}
              loading={isPending}
            >
              {confirmAction}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
