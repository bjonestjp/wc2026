"use client";

type Props = {
  date: string;
  short?: boolean;
};

/**
 * Renders a date/time formatted in the user's local timezone.
 * Accepts an ISO string. Uses `suppressHydrationWarning` because
 * the server and client will produce different locale strings.
 */
export function LocalTime({ date, short }: Props) {
  const d = new Date(date);

  const formatted = short
    ? d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <time dateTime={date} suppressHydrationWarning>
      {formatted}
    </time>
  );
}
