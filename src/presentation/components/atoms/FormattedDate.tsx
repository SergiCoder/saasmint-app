export interface FormattedDateProps {
  iso: string;
  locale?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
}

export function FormattedDate({
  iso,
  locale,
  dateStyle = "medium",
}: FormattedDateProps) {
  const fallback = iso.slice(0, 10);
  const date = new Date(iso);
  const display = Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, { dateStyle }).format(date);

  return <span>{display}</span>;
}
