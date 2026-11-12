import { format, parseISO } from "date-fns";

export const formatDate = (iso: string) => format(parseISO(iso), "MMM d, yyyy");
export const formatDateTime = (iso: string) => format(parseISO(iso), "MMM d, h:mm a");

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
