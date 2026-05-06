"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationEmail } from "@/app/actions/auth";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";

interface ResendVerificationLinkProps {
  email?: string;
}

export function ResendVerificationLink({ email }: ResendVerificationLinkProps) {
  const t = useTranslations("auth.login");
  const translateError = useActionErrorMessage();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedEmail, setTypedEmail] = useState("");

  function submit(target: string) {
    setStatus("idle");
    setErrorMessage(null);
    startTransition(async () => {
      const result = await resendVerificationEmail(target);
      if (result.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(translateError(result));
      }
    });
  }

  if (status === "sent") {
    return <p className="mt-2 text-sm">{t("verificationEmailSent")}</p>;
  }

  if (email) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => submit(email)}
          disabled={pending}
          className="text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("resendVerification")}
        </button>
        {status === "error" && errorMessage && (
          <p className="mt-1 text-sm">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={typedEmail}
        onChange={(e) => setTypedEmail(e.target.value)}
        placeholder={t("email")}
        className="focus:border-primary-500 focus:ring-primary-500 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => typedEmail.trim() && submit(typedEmail)}
        disabled={pending || !typedEmail.trim()}
        className="bg-primary-600 hover:bg-primary-700 shrink-0 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("resendVerification")}
      </button>
      {status === "error" && errorMessage && (
        <p className="mt-1 text-sm sm:basis-full">{errorMessage}</p>
      )}
    </div>
  );
}
