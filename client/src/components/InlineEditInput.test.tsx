import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { InlineEditInput } from './InlineEditInput';

function renderInput(props: Partial<React.ComponentProps<typeof InlineEditInput>> = {}) {
  const defaults = {
    value: '',
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(
    <ChakraProvider value={system}>
      <InlineEditInput {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('InlineEditInput', () => {
  it('pre-fills the input with the value prop', () => {
    renderInput({ value: 'Breakfast' });
    expect(screen.getByRole('textbox')).toHaveValue('Breakfast');
  });

  it('is auto-focused by default', () => {
    renderInput({ value: '' });
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('is not auto-focused when autoFocus is false', () => {
    renderInput({ value: '', autoFocus: false });
    expect(screen.getByRole('textbox')).not.toHaveFocus();
  });

  it('calls onSave with trimmed value on Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderInput({ value: '', onSave });
    await user.type(screen.getByRole('textbox'), '  Breakfast  ');
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith('Breakfast');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave when input is blank on Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderInput({ value: '', onSave });
    await user.type(screen.getByRole('textbox'), '   ');
    await user.keyboard('{Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onCancel on Escape', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderInput({ value: 'Breakfast', onCancel });
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the input loses focus', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderInput({ value: 'Breakfast', onCancel });
    await user.click(document.body);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
