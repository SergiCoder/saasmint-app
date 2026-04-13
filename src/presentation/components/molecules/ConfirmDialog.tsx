"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/presentation/components/atoms/Button";

export interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
}

export interface ConfirmDialogHandle {
  open: () => void;
  close: () => void;
}

export const ConfirmDialog = forwardRef<
  ConfirmDialogHandle,
  ConfirmDialogProps
>(function ConfirmDialog(
  {
    title,
    body,
    confirmLabel,
    cancelLabel,
    variant = "danger",
    loading = false,
    onConfirm,
    onClose,
  },
  ref,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
    close: () => dialogRef.current?.close(),
  }));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/40"
      style={{
        margin: "auto",
        maxWidth: "none",
        maxHeight: "none",
        width: "auto",
      }}
    >
      <div className="w-[28rem] max-w-[90vw] space-y-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{body}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
});
