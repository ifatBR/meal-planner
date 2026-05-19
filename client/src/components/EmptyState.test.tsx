import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { EmptyState } from './EmptyState';

function renderEmpty(props: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  const defaults = {
    title: 'No items yet',
    description: 'Add your first item to get started.',
  };
  return render(
    <ChakraProvider value={system}>
      <EmptyState {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('EmptyState', () => {
  it('renders title and description', () => {
    renderEmpty();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first item to get started.')).toBeInTheDocument();
  });

  it('does not render a button when action is not provided', () => {
    renderEmpty();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the action button with the given label', () => {
    renderEmpty({ action: { label: 'Add Item', onClick: vi.fn() } });
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('calls action.onClick when the button is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderEmpty({ action: { label: 'Add Item', onClick } });
    await user.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
