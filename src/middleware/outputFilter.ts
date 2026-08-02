/**
 * Output filter — last line of defense.
 *
 * Scrubs model responses before they reach the client.
 * Catches accidental leaks of system prompts, API keys, env vars, etc.
 */

const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: "api_key", pattern: /(?:sk-|api[_-]?key["\s:=]+)[a-zA-Z0-9\-_]{20,}/gi, replacement: "[REDACTED]" },
  { name: "db_url", pattern: /(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s"']+/gi, replacement: "[REDACTED_DB_URL]" },
  { name: "env_leak", pattern: /(?:process\.env\.[A-Z_]+\s*=\s*")[^"]+"/gi, replacement: "[REDACTED_ENV]" },
  { name: "bearer_token", pattern: /Bearer\s+[a-zA-Z0-9\-_.]{20,}/gi, replacement: "Bearer [REDACTED]" },
  { name: "s3_secret", pattern: /(?:secret[_-]?key|access[_-]?key)["\s:=]+[a-zA-Z0-9\/+=]{16,}/gi, replacement: "[REDACTED_CREDENTIAL]" },
];

export function sanitizeOutput(text: string): string {
  let sanitized = text;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}
