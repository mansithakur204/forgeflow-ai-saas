import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names using clsx and tailwind-merge.
 * This is the canonical utility for conditional class composition.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if the current environment is a browser.
 * SSR-safe guard used by hooks that access window/document.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Formats a number with commas for thousands separators.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * Truncates a string to a given length, appending an ellipsis.
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

/**
 * Generates initials from a display name (up to 2 characters).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Sleeps for a given number of milliseconds (useful in dev/testing).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts a route path to a human-readable label.
 * e.g. "/my-workflows" → "My Workflows"
 */
export function pathToLabel(path: string): string {
  const segment = path.split("/").filter(Boolean).pop() ?? "";
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
