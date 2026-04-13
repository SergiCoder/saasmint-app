"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { updateSeats } from "@/app/actions/billing";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";

const MAX_SEATS = 100;

interface SeatManagerProps {
  currentSeats: number;
  usedSeats: number;
}

export function SeatManager({ currentSeats, usedSeats }: SeatManagerProps) {
  const t = useTranslations("org");
  const tCommon = useTranslations("common");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [seats, setSeats] = useState(currentSeats);
  const [state, formAction, pending] = useActionState(updateSeats, null);

  const canDecrease = seats > usedSeats;
  const canIncrease = seats < MAX_SEATS;
  const hasChanged = seats !== currentSeats;
  const isDecreasing = seats < currentSeats;

  const handleSubmit = () => {
    if (isDecreasing) {
      dialogRef.current?.showModal();
    } else {
      const formData = new FormData();
      formData.set("quantity", String(seats));
      formAction(formData);
    }
  };

  const confirmDecrease = () => {
    dialogRef.current?.close();
    const formData = new FormData();
    formData.set("quantity", String(seats));
    formAction(formData);
  };

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error" className="mb-4">
          {state.error}
        </AlertBanner>
      )}
      {state?.ok && (
        <AlertBanner variant="success" className="mb-4">
          {t("seatsUpdated")}
        </AlertBanner>
      )}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeats((s) => s - 1)}
            disabled={!canDecrease || pending}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("removeSeat")}
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-sm font-medium text-gray-900">
            {seats}
          </span>
          <button
            type="button"
            onClick={() => setSeats((s) => s + 1)}
            disabled={!canIncrease || pending}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t("addSeat")}
          >
            +
          </button>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          loading={pending}
          disabled={!hasChanged}
        >
          {t("updateSeats")}
        </Button>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="w-[min(90vw,28rem)] space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("removeSeatConfirmTitle")}
          </h2>
          <p className="text-sm text-gray-600">{t("removeSeatConfirmBody")}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmDecrease}
              loading={pending}
            >
              {t("removeSeatConfirmAction")}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
