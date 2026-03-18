import { describe, it, expect } from 'vitest';
import {
  normalise,
  isNameConflict,
  isVariantConflict,
  hasWorkspaceConflict,
} from '../domain/ingredients.rules';

describe('normalise', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalise('  Tomato  ')).toBe('tomato');
    expect(normalise('BASIL')).toBe('basil');
  });
});

describe('isNameConflict', () => {
  it('returns true on case-insensitive match', () => {
    expect(isNameConflict('Tomato', ['tomato', 'basil'])).toBe(true);
    expect(isNameConflict('BASIL', ['tomato', 'basil'])).toBe(true);
  });
  it('returns false when no match', () => {
    expect(isNameConflict('cilantro', ['tomato', 'basil'])).toBe(false);
  });
});

describe('isVariantConflict', () => {
  it('returns true on case-insensitive match', () => {
    expect(isVariantConflict('Aubergine', ['aubergine', 'brinjal'])).toBe(true);
  });
  it('returns false when no match', () => {
    expect(isVariantConflict('eggplant', ['aubergine', 'brinjal'])).toBe(false);
  });
});

describe('hasWorkspaceConflict', () => {
  const names = ['tomato', 'basil'];
  const variants = ['aubergine', 'brinjal'];

  it('returns true when conflicts with an existing name', () => {
    expect(hasWorkspaceConflict('Tomato', names, variants)).toBe(true);
  });
  it('returns true when conflicts with an existing variant', () => {
    expect(hasWorkspaceConflict('AUBERGINE', names, variants)).toBe(true);
  });
  it('returns false when no conflict', () => {
    expect(hasWorkspaceConflict('cilantro', names, variants)).toBe(false);
  });
});
