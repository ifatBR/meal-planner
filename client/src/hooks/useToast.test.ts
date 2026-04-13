import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from './useToast';

vi.mock('@/components/ui/toaster', () => ({
  toaster: { create: vi.fn() },
}));

// Import after mock is registered so we get the mocked instance
import { toaster } from '@/components/ui/toaster';

describe('useToast', () => {
  it('success calls toaster.create with type success', () => {
    const { result } = renderHook(() => useToast());
    result.current.success('Saved!');
    expect(toaster.create).toHaveBeenCalledWith({ title: 'Saved!', type: 'success' });
  });

  it('error calls toaster.create with type error', () => {
    const { result } = renderHook(() => useToast());
    result.current.error('Something went wrong');
    expect(toaster.create).toHaveBeenCalledWith({ title: 'Something went wrong', type: 'error' });
  });

  it('info calls toaster.create with type info', () => {
    const { result } = renderHook(() => useToast());
    result.current.info('Did you know?');
    expect(toaster.create).toHaveBeenCalledWith({ title: 'Did you know?', type: 'info' });
  });

  it('warning calls toaster.create with type warning', () => {
    const { result } = renderHook(() => useToast());
    result.current.warning('Heads up');
    expect(toaster.create).toHaveBeenCalledWith({ title: 'Heads up', type: 'warning' });
  });
});
