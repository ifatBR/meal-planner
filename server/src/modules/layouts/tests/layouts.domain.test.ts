import { describe, it, expect } from 'vitest';
import { doSlotIdsMatch } from '../layouts.domain';

describe('doSlotIdsMatch', () => {
  it('returns true when ids match in same order', () => {
    expect(doSlotIdsMatch(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
  });

  it('returns true when ids match in different order', () => {
    expect(doSlotIdsMatch(['c', 'a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });

  it('returns true for empty arrays', () => {
    expect(doSlotIdsMatch([], [])).toBe(true);
  });

  it('returns false when incoming has fewer ids', () => {
    expect(doSlotIdsMatch(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  it('returns false when incoming has more ids', () => {
    expect(doSlotIdsMatch(['a', 'b', 'c', 'd'], ['a', 'b', 'c'])).toBe(false);
  });

  it('returns false when incoming contains an unknown id', () => {
    expect(doSlotIdsMatch(['a', 'x', 'c'], ['a', 'b', 'c'])).toBe(false);
  });
});
