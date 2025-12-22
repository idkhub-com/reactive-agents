/**
 * Security utilities for XSS prevention and input sanitization
 */

/**
 * Sanitizes a string to prevent XSS attacks by escaping HTML entities
 */
export function sanitizeHtml(input: string): string {
  const entityMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return input.replace(/[&<>"'`=/]/g, (s) => entityMap[s]);
}

/**
 * Safely stringify JSON data for display, preventing XSS
 */
export function safeJsonStringify(
  value: unknown,
  space?: string | number,
): string {
  try {
    const jsonString = JSON.stringify(value, null, space);
    if (jsonString === undefined) {
      return 'undefined';
    }
    // Sanitize the JSON string to prevent XSS
    return sanitizeHtml(jsonString);
  } catch (_error) {
    // If JSON.stringify fails, return a safe error message
    return '[Invalid JSON data]';
  }
}

/**
 * Sanitizes user input text by escaping HTML entities.
 * This is the most reliable XSS prevention - by escaping all special characters,
 * no HTML tags or attributes can be injected regardless of the input.
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input).trim();
}

/**
 * Sanitizes agent metadata object keys and values
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Sanitize the key
    const sanitizedKey = sanitizeUserInput(key);

    // Remove HTML entities to check if anything meaningful remains
    const keyWithoutEntities = sanitizedKey.replace(/&[a-zA-Z0-9#]+;/g, '');

    // Skip if key becomes empty after sanitization or only contains HTML entities
    if (!keyWithoutEntities.trim()) continue;

    // Sanitize the value
    let sanitizedValue: string;
    if (typeof value === 'object' && value !== null) {
      sanitizedValue = safeJsonStringify(value, 2);
    } else {
      sanitizedValue = sanitizeUserInput(String(value));
    }

    // Skip if value becomes empty after sanitization
    if (sanitizedValue.trim().length === 0) continue;

    sanitized[sanitizedKey] = sanitizedValue;
  }

  return sanitized;
}
