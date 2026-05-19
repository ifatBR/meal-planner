import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete item?',
  };
  return render(
    <ChakraProvider value={system}>
      <ConfirmDialog {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('ConfirmDialog', () => {
  it('renders title when open', () => {
    renderDialog();
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
  });

  it('does not render title when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByText('Delete item?')).not.toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderDialog({ description: 'This cannot be undone.' });
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('does not render description area when not provided', () => {
    renderDialog();
    expect(screen.queryByText('This cannot be undone.')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onClose });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onConfirm });
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables Cancel and shows loading on Delete when isLoading is true', () => {
    renderDialog({ isLoading: true });
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});
