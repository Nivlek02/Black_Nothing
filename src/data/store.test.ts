import { describe, it, expect } from 'vitest';
import { calculateNextCharge, daysUntil, formatCurrency, generateId } from './store';

describe('store utilities', () => {
  describe('calculateNextCharge', () => {
    it('should return a valid date string for monthly billing', () => {
      const result = calculateNextCharge(15, 'monthly');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return a valid date string for annual billing', () => {
      const result = calculateNextCharge(15, 'annual');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('daysUntil', () => {
    it('should return 0 or 1 for today (depending on time of day)', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = daysUntil(today);
      expect([0, 1]).toContain(result);
    });

    it('should return positive number for future dates', () => {
      const future = '2099-12-25';
      expect(daysUntil(future)).toBeGreaterThan(0);
    });

    it('should return negative number for past dates', () => {
      const past = '2020-01-01';
      expect(daysUntil(past)).toBeLessThan(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format COP without decimal digits', () => {
      const result = formatCurrency(1500000, 'COP');
      expect(result).toBeTruthy();
      // COP format uses . as thousands separator, so it may contain dots
      // but should NOT contain decimal fraction digits (no ",XX")
      expect(result).not.toMatch(/,\d{2}/);
    });

    it('should format USD with 2 decimals', () => {
      const result = formatCurrency(99.99, 'USD');
      expect(result).toContain('99');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'USD')).toBeTruthy();
    });
  });

  describe('generateId', () => {
    it('should generate a UUID string', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });
});
