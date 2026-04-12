"use client";

import { useActionState, useRef, useState } from "react";
import { transferOwnership } from "@/app/actions/org";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

interface TransferCandidate {
  id: string;
  fullName: string;
}

interface TransferOwnershipFormProps {
  orgId: string;
  candidates: TransferCandidate[];
  label: string;
  selectLabel: string;
  confirmTitle: string;
  confirmBody: string;
  confirmAction: string;
  confirmDismiss: string;
}

export function TransferOwnershipForm({
  orgId,
  candidates,
  label,
  selectLabel,
  confirmTitle,
  confirmBody,
  confirmAction,
  confirmDismiss,
}: TransferOwnershipFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [state, formAction, pending] = useActionState(transferOwnership, null);

  const selectedName =
    candidates.find((c) => c.id === selectedUserId)?.fullName ?? "";

  const open = () => {
    if (!selectedUserId) return;
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error">{state.error}</AlertBanner>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label
            htmlFor="transfer-user"
            className="block text-sm font-medium text-gray-700"
          >
            {selectLabel}
          </label>
          <select
            id="transfer-user"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="focus:border-primary-500 focus:ring-primary-500 block w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-0 focus:outline-none"
          >
            <option value="" disabled>
              —
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={open}
          disabled={!selectedUserId}
        >
          {label}
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <form action={formAction}>
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="userId" value={selectedUserId} />
          <div className="w-[min(90vw,28rem)] space-y-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {confirmTitle}
            </h2>
            <p className="text-sm text-gray-600">
              {confirmBody.replace("{name}", selectedName)}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={close}
                disabled={pending}
              >
                {confirmDismiss}
              </Button>
              <Button type="submit" variant="danger" loading={pending}>
                {confirmAction}
              </Button>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
