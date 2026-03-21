import { describe, it, expect } from 'vitest';
import { currentWeekISO, nextWeekISO, isWeekExpired } from '@/lib/weekUtils';

// @vitest-environment node

describe('currentWeekISO', () => {
  it('returns correct ISO week string for a normal date', () => {
    expect(currentWeekISO(new Date('2026-03-21'))).toBe('2026-W12');
  });

  it('handles ISO year boundary: Dec 31 may belong to the next ISO year', () => {
    // 2026-12-31 is a Thursday. ISO week: it is in 2026-W53 or 2027-W01?
    // Let's verify: 2026-12-28 is Monday of the last week. 2026-12-31 is Thursday.
    // ISO week 53 of 2026? No — the last week of 2026 containing a Thursday must be the last ISO week.
    // Per ISO 8601: 2026-12-31 -> week 53 of 2026 (since Jan 1, 2027 is a Friday, the last week
    // starts Mon Dec 28 2026). Actually 2027-W01 starts Mon Jan 4, 2027.
    // So 2026-12-31 => 2026-W53
    expect(currentWeekISO(new Date('2026-12-31'))).toBe('2026-W53');
  });

  it('handles ISO year boundary: date that belongs to next ISO year', () => {
    // 2024-12-31 is a Tuesday. ISO week: 2025-W01 starts Mon Dec 30, 2024.
    // So 2024-12-31 => 2025-W01
    expect(currentWeekISO(new Date('2024-12-31'))).toBe('2025-W01');
  });

  it('returns W01 format with zero padding for single-digit weeks', () => {
    // 2026-01-05 is a Monday, week 2 of 2026
    expect(currentWeekISO(new Date('2026-01-05'))).toBe('2026-W02');
  });

  it('returns first week of year correctly', () => {
    // 2026-01-01 is a Thursday — ISO week 1 of 2026
    expect(currentWeekISO(new Date('2026-01-01'))).toBe('2026-W01');
  });
});

describe('nextWeekISO', () => {
  it('returns the next ISO week string', () => {
    expect(nextWeekISO(new Date('2026-03-21'))).toBe('2026-W13');
  });

  it('correctly advances across month boundaries', () => {
    // 2026-03-28 is week 13 of 2026, next is W14
    expect(nextWeekISO(new Date('2026-03-28'))).toBe('2026-W14');
  });

  it('advances across year boundary correctly using ISO year', () => {
    // 2024-12-24 is week 52 of 2024 (Tue). Next week includes Dec 30 = 2025-W01
    expect(nextWeekISO(new Date('2024-12-24'))).toBe('2025-W01');
  });
});

describe('isWeekExpired', () => {
  it('returns true for a week in the past', () => {
    expect(isWeekExpired('2026-W11', new Date('2026-03-21'))).toBe(true);
  });

  it('returns false for the current week', () => {
    expect(isWeekExpired('2026-W12', new Date('2026-03-21'))).toBe(false);
  });

  it('returns false for a future week', () => {
    expect(isWeekExpired('2026-W13', new Date('2026-03-21'))).toBe(false);
  });

  it('returns false for several weeks in the future', () => {
    expect(isWeekExpired('2026-W52', new Date('2026-03-21'))).toBe(false);
  });

  it('returns true for a week from a previous year', () => {
    expect(isWeekExpired('2025-W50', new Date('2026-03-21'))).toBe(true);
  });
});
