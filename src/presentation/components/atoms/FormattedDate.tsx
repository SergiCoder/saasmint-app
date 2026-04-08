"use client";

import { useEffect, useState } from "react";

export interface FormattedDateProps {
  iso: string;
  locale?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
}

/**
 * Formats an ISO date string with `Intl.DateTimeFormat`.
 *
 * If `locale` is provided (e.g. the app's next-intl locale), it is used
 * directly. Otherwise the browser's default locale is used.
 *
 * Renders a deterministic ISO fallback (`YYYY-MM-DD`) on the server and during
 * the first client render to avoid hydration mismatches, then upgrades to a
 * locale-aware format once mounted on the client.
 */
export function FormattedDate({
  iso,
  locale,
  dateStyle = "medium",
}: FormattedDateProps) {
  const fallback = iso.slice(0, 10);
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      setFormatted(fallback);
      return;
    }
    setFormatted(new Intl.DateTimeFormat(locale, { dateStyle }).format(date));
  }, [iso, locale, dateStyle, fallback]);

  return <span suppressHydrationWarning>{formatted ?? fallback}</span>;
}
