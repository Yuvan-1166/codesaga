import { CONFIG } from '../config';
import { Language } from '../types';

export class SecurityValidator {
  private static FORBIDDEN_PATTERNS = {
    javascript: [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /require\s*\(\s*['"]fs['"]\s*\)/gi,
      /require\s*\(\s*['"]child_process['"]\s*\)/gi,
      /require\s*\(\s*['"]net['"]\s*\)/gi,
      /require\s*\(\s*['"]http['"]\s*\)/gi,
      /require\s*\(\s*['"]https['"]\s*\)/gi,
      /require\s*\(\s*['"]vm['"]\s*\)/gi,
      /import\s+.*\s+from\s+['"]fs['"]/gi,
      /import\s+.*\s+from\s+['"]child_process['"]/gi,
    ],
    python: [
      /import\s+os/gi,
      /from\s+os\s+import/gi,
      /import\s+subprocess/gi,
      /from\s+subprocess\s+import/gi,
      /import\s+socket/gi,
      /from\s+socket\s+import/gi,
      /import\s+sys/gi,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /__import__\s*\(/gi,
    ],
  };

  static validateCode(code: string, language: Language): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check code size
    if (code.length > CONFIG.security.maxCodeSize) {
      errors.push(`Code size exceeds maximum of ${CONFIG.security.maxCodeSize} bytes`);
    }

    // Check for forbidden patterns
    const patterns = this.FORBIDDEN_PATTERNS[language];
    for (const pattern of patterns) {
      if (pattern.test(code)) {
        errors.push(`Forbidden pattern detected: ${pattern.source}`);
      }
    }

    // Check for suspicious strings
    if (code.includes('process.exit')) {
      errors.push('process.exit() is not allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static sanitizeOutput(output: string, maxLength: number = 10000): string {
    if (output.length > maxLength) {
      return output.substring(0, maxLength) + '\n... (output truncated)';
    }
    return output;
  }
}
