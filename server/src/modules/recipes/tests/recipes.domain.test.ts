import { describe, it, expect } from 'vitest';
import { validateExactlyOneMain } from '../domain/recipes.rules';

describe('validateExactlyOneMain', () => {
  it('returns true when exactly one ingredient is main', () => {
    expect(
      validateExactlyOneMain([{ isMain: true }, { isMain: false }, { isMain: false }]),
    ).toBe(true);
  });

  it('returns false when no ingredient is main', () => {
    expect(validateExactlyOneMain([{ isMain: false }, { isMain: false }])).toBe(false);
  });

  it('returns false when more than one ingredient is main', () => {
    expect(validateExactlyOneMain([{ isMain: true }, { isMain: true }, { isMain: false }])).toBe(
      false,
    );
  });

  it('returns true for a single main ingredient', () => {
    expect(validateExactlyOneMain([{ isMain: true }])).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(validateExactlyOneMain([])).toBe(false);
  });
});
