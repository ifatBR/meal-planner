import { describe, it, expect } from 'vitest';
import { hasDayOverlap } from '../domain/layouts.rules';

describe('hasDayOverlap', () => {
  it('returns false for a single layout with no duplicate days', () => {
    expect(hasDayOverlap([{ days: [0, 1, 2] }])).toBe(false);
  });

  it('returns false for multiple layouts with no overlapping days', () => {
    expect(hasDayOverlap([{ days: [0, 1, 2] }, { days: [3, 4] }, { days: [5, 6] }])).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(hasDayOverlap([])).toBe(false);
  });

  it('returns true when the same day appears in two different layouts', () => {
    expect(hasDayOverlap([{ days: [0, 1, 2] }, { days: [2, 3] }])).toBe(true);
  });

  it('returns true when day 0 appears in both layouts', () => {
    expect(hasDayOverlap([{ days: [0] }, { days: [0] }])).toBe(true);
  });

  it('returns true when a repeated day appears within a single layout', () => {
    expect(hasDayOverlap([{ days: [1, 1, 2] }])).toBe(true);
  });
});
