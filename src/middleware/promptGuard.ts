/**
 * Heuristic prompt injection detector.
 *
 * This is a SUPPLEMENTARY defense layer — not the primary one.
 * Primary defense is the system prompt instructions + role separation.
 *
 * This detects common injection patterns and logs them for monitoring.
 * It does NOT block requests to prevent false positives.
 */

const SUSPICIOUS_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "ignore_instructions", pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i },
  { name: "system_role_fake", pattern: /^(system|assistant)\s*:/im },
  { name: "new_instructions", pattern: /new\s+(instructions|rules|prompt)\s*:/i },
  { name: "reveal_prompt", pattern: /(reveal|show|display|print|output)\s+(the\s+)?(system\s+)?(prompt|instructions|rules)/i },
  { name: "jailbreak_dan", pattern: /\bDAN\b.*\bjailbreak/i },
  { name: "role_play_override", pattern: /(pretend|act\s+as|you\s+are\s+now|from\s+now\s+on\s+you\s+are)/i },
  { name: "delimiter_injection", pattern: /<\/?(?:system|user|assistant|context|instructions)>/i },
  { name: "markdown_code_injection", pattern: /```(?:system|instruction|prompt)/i },
];

export interface PromptGuardResult {
  suspicious: boolean;
  matchedPatterns: string[];
}

export function checkPromptInjection(input: string): PromptGuardResult {
  const matchedPatterns: string[] = [];

  for (const { name, pattern } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(name);
    }
  }

  return {
    suspicious: matchedPatterns.length > 0,
    matchedPatterns,
  };
}

/**
 * Log suspicious prompt injection attempts.
 */
export function logSuspiciousPrompt(
  userId: string | null,
  ip: string,
  matchedPatterns: string[],
  promptLength: number,
): void {
  console.warn("[prompt-guard] Suspicious prompt detected", JSON.stringify({
    timestamp: new Date().toISOString(),
    userId,
    ip,
    matchedPatterns,
    promptLength,
  }));
}
