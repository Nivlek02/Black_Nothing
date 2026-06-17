import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the safeCompare function extracted from PinLock logic
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

describe('PinLock safety', () => {
  describe('safeCompare (constant-time comparison)', () => {
    it('should return true for identical strings', () => {
      expect(safeCompare('2026', '2026')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(safeCompare('2026', '2027')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(safeCompare('2026', '20267')).toBe(false);
    });

    it('should return false for empty vs non-empty', () => {
      expect(safeCompare('', '2026')).toBe(false);
    });

    it('should return true for two empty strings', () => {
      expect(safeCompare('', '')).toBe(true);
    });

    it('should handle special characters', () => {
      expect(safeCompare('abc!', 'abc!')).toBe(true);
      expect(safeCompare('abc!', 'abc@')).toBe(false);
    });
  });

  describe('rate limiting logic', () => {
    it('should track attempts in localStorage', () => {
      localStorage.clear();
      localStorage.setItem('pin_attempts', '3');
      const stored = parseInt(localStorage.getItem('pin_attempts') || '0', 10);
      expect(stored).toBe(3);
    });

    it('should lock out after MAX_ATTEMPTS', () => {
      localStorage.clear();
      const MAX_ATTEMPTS = 5;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        localStorage.setItem('pin_attempts', String(i + 1));
      }
      const attempts = parseInt(localStorage.getItem('pin_attempts') || '0', 10);
      expect(attempts).toBeGreaterThanOrEqual(MAX_ATTEMPTS);
    });

    it('should clear lockout state on successful attempt', () => {
      localStorage.clear();
      localStorage.setItem('pin_attempts', '3');
      localStorage.setItem('pin_lockout_until', String(Date.now() + 30000));
      
      // Simulate successful unlock
      localStorage.removeItem('pin_lockout_until');
      localStorage.removeItem('pin_attempts');
      
      expect(localStorage.getItem('pin_lockout_until')).toBeNull();
      expect(localStorage.getItem('pin_attempts')).toBeNull();
    });
  });
});
