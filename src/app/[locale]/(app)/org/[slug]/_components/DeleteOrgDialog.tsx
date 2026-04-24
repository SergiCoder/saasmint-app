"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteOrg } from "@/app/actions/org";
import { Button } from "@/presentation/components/atoms/Button";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface DeleteOrgDialogProps {
  orgId: string;
  orgName: string;
}

export function DeleteOrgDialog({ orgId, orgName }: DeleteOrgDialogProps) {
  const t = useTranslations("org");
  const translateError = useActionErrorMessage();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  function handleClose() {
    if (pending) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  function handleSubmit() {
    if (confirmText !== orgName) {
      setError(t("deleteOrgDialogMismatch"));
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("orgId", orgId);
    startTransition(async () => {
      const result = await deleteOrg(null, formData);
      if (!result.ok) {
        setError(translateError(result));
        return;
      }
      router.replace("/dashboard");
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t("deleteOrg")}
      </Button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="mx-auto my-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("deleteOrgDialogTitle")}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {t("deleteOrgDialogDescription")}
          </p>

          {error && (
            <div className="mt-4">
              <AlertBanner variant="error">{error}</AlertBanner>
            </div>
          )}

          <div className="mt-4 space-y-1">
            <label
              htmlFor="delete-org-confirm"
              className="block text-sm font-medium text-gray-700"
            >
              {t("deleteOrgDialogLabel", { name: orgName })}
            </label>
            <input
              id="delete-org-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={orgName}
              disabled={pending}
              className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={pending}
            >
              {t("deleteOrgDialogCancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={pending}
              disabled={confirmText.length === 0}
            >
              {t("deleteOrgDialogSubmit")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
