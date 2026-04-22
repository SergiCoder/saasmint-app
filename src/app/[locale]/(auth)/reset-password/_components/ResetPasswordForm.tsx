"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import type { ActionResult } from "@/lib/actions/ActionResult";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface ResetPasswordFormProps {
  action: (prev: unknown, fd: FormData) => Promise<ActionResult>;
  token?: string;
}

export function ResetPasswordForm({ action, token }: ResetPasswordFormProps) {
  const t = useTranslations("auth.resetPassword");
  const translateError = useActionErrorMessage();
  const [state, formAction, pending] = useActionState(action, null);

  if (state?.ok) {
    return (
      <>
        <AlertBanner variant="success">{t("successMessage")}</AlertBanner>
        <p className="mt-4 text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error" className="mb-4">
          {translateError(state)}
        </AlertBanner>
      )}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <FormField
          label={t("newPassword")}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <FormField
          label={t("confirmPassword")}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" loading={pending} className="mt-6 w-full">
          {t("submit")}
        </Button>
      </form>
    </>
  );
}
