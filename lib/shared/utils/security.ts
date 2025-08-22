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
 * Sanitizes user input text by removing potentially dangerous content
 */
export function sanitizeUserInput(input: string): string {
  return (
    input
      // Remove any script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol and everything after it until space or end
      .replace(/javascript:[^\s]*/gi, '')
      // Remove data: protocol and everything after it until space or end
      .replace(/data:[^\s]*/gi, '')
      // Remove on* event handlers (onclick, onload, etc.) and their values
      .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
      .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
      // Escape HTML entities
      .replace(/[&<>"'`=/]/g, (s) => {
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
        return entityMap[s];
      })
      // Trim whitespace
      .trim()
  );
}

/**
 * Validates and sanitizes a description field
 */
export function sanitizeDescription(
  description: string | null | undefined,
): string | null {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const sanitized = sanitizeUserInput(description);

  // Additional validation for description field
  if (sanitized.length === 0) {
    return null;
  }

  // Limit length to prevent abuse (adjust as needed)
  const maxLength = 2000;
  if (sanitized.length > maxLength) {
    return `${sanitized.substring(0, maxLength)}...`;
  }

  return sanitized;
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
