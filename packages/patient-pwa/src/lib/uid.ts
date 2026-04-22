/**
 * Patient UID Utility Functions
 * Generates and formats patient UIDs (Unique Identifiers)
 * Format: XX-XXXXX-XXXX (e.g., JD-12345-6789)
 */

/**
 * Generates a random UID from patient data
 * Takes first 2 letters of name, then random numbers
 */
export function generateUID(name: string, externalId: string): string {
  // Use first 2 letters of name (capitalized)
  const namePrefix = name
    .replace(/\s+/g, '')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'X');

  // Use last 5 digits from externalId (digits-only to preserve UID format)
  const digitsOnly = String(externalId).replace(/\D/g, '');
  const idPart = digitsOnly.slice(-5).padStart(5, '0');

  // Generate 4-digit random suffix
  const suffix = String(Math.floor(Math.random() * 10000))
    .padStart(4, '0')
    .slice(-4);

  return `${namePrefix}-${idPart}-${suffix}`;
}

/**
 * Formats a UID string to ensure consistent formatting
 */
export function formatUID(uid: string): string {
  // Remove any non-alphanumeric characters except dashes
  const cleaned = uid.replace(/[^A-Z0-9-]/gi, '').toUpperCase();

  // If it doesn't have the expected format, try to parse it
  if (!cleaned.includes('-')) {
    // Assume it's raw data and format it
    const parts = cleaned.match(/(.{2})(.{5})(.{4})/);
    if (parts) {
      return `${parts[1]}-${parts[2]}-${parts[3]}`;
    }
  }

  return cleaned;
}

/**
 * Validates UID format
 */
export function isValidUID(uid: string): boolean {
  const pattern = /^[A-Z]{2}-\d{5}-\d{4}$/;
  return pattern.test(uid);
}
