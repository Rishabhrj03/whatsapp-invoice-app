/**
 * Security Hardening Utility
 * Implements defenses against Regex Injection / ReDoS, Path Traversal, and Malicious File Uploads.
 */

/**
 * Escapes characters with special meaning in Regular Expressions.
 * Prevents ReDoS (Catastrophic Backtracking) and SyntaxError crashes from user-controlled search inputs.
 */
export function escapeRegex(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whitelist of allowed MIME types for file uploads to S3/Cloud Storage.
 * Prevents SVG/HTML Stored XSS and executable uploads.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedUploadMimeType = typeof ALLOWED_UPLOAD_MIME_TYPES[number];

export function isValidUploadMimeType(mimeType: string): mimeType is AllowedUploadMimeType {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mimeType?.toLowerCase().trim());
}

/**
 * Sanitizes an untrusted filename, stripping directory traversal attempts (../, /),
 * null bytes, control characters, and non-alphanumeric symbols except safe delimiters (. - _).
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file_' + Date.now();
  }

  // Extract base filename (strip any path traversal separators)
  const baseName = filename.replace(/^.*[\\/]/, '');

  // Strip null bytes and non-ASCII / control characters
  const clean = baseName
    .replace(/\0/g, '')
    .replace(/[^\w.-]/gi, '_')
    .replace(/_{2,}/g, '_');

  return clean.length > 0 ? clean : 'file_' + Date.now();
}
