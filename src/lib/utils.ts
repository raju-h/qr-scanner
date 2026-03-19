/** Shared utility functions — date formatting, value truncation, URL detection. */

// TODO: Implement truncateValue, isUrl, formatRelativeTime, cn (classname merge)

/**
 * Truncate a string to a maximum length with ellipsis.
 * @param value - The string to truncate
 * @param maxLength - Maximum character length before truncation
 * @returns Truncated string with ellipsis if over limit
 */
export function truncateValue(value: string, maxLength: number = 50): string {
  // TODO: Implement
  return value.length > maxLength ? value.slice(0, maxLength) + "..." : value;
}

/**
 * Check if a string is a valid URL.
 * @param value - The string to check
 * @returns True if the string is a valid URL
 */
export function isUrl(value: string): boolean {
  // TODO: Implement
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
