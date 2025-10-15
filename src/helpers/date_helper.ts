/**
 * Converts a date string or Date object to Unix timestamp (in seconds).
 * @param date - Date string (e.g., "YYYY-MM-DD") or Date object.
 * @returns Unix timestamp in seconds.
 * @throws Error if the date is invalid.
 */
function timeToTimestamp(date: string | Date): number {
  let dateObj: Date;

  if (typeof date === 'string') {
    // Assuming date format like "YYYY-MM-DD" or other parseable formats
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    throw new Error('Invalid date format. Expected string or Date object.');
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided.');
  }

  // Convert to Unix timestamp (seconds)
  return Math.floor(dateObj.getTime() / 1000);
}

/**
 * Converts a Unix timestamp (in seconds) to a YYYY-MM-DD string.
 * @param timestamp - Unix timestamp in seconds.
 * @returns Date string in YYYY-MM-DD format.
 * @throws Error if the timestamp is invalid.
 */
function timestampToDateString(timestamp: number): string {
  if (typeof timestamp !== 'number' || isNaN(timestamp)) {
    throw new Error('Invalid timestamp. Expected a valid number.');
  }

  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  if (isNaN(date.getTime())) {
    throw new Error('Invalid timestamp provided.');
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export { timeToTimestamp, timestampToDateString };