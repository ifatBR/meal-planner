import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { ActionListItem } from './ActionListItem';

function renderItem(props: Partial<React.ComponentProps<typeof ActionListItem>> & { name?: string } = {}) {
  const defaults = { name: 'Chicken' };
  return render(
    <ChakraProvider value={system}>
      <ActionListItem {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('ActionListItem', () => {
  it('renders the name', () => {
    renderItem();
    expect(screen.getByText('Chicken')).toBeInTheDocument();
  });

  it('renders nameDisplay instead of name when provided', () => {
    renderItem({ nameDisplay: <span>Custom Display</span> });
    expect(screen.getByText('Custom Display')).toBeInTheDocument();
    expect(screen.queryByText('Chicken')).not.toBeInTheDocument();
  });

  it('does not render action buttons when no handlers are provided', () => {
    renderItem();
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders only the provided action buttons', () => {
    renderItem({ onView: vi.fn(), onDelete: vi.fn() });
    expect(screen.getByRole('button', { name: /view chicken/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit chicken/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete chicken/i })).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    renderItem({ onView });
    await user.click(screen.getByRole('button', { name: /view chicken/i }));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderItem({ onEdit });
    await user.click(screen.getByRole('button', { name: /edit chicken/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderItem({ onDelete });
    await user.click(screen.getByRole('button', { name: /delete chicken/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders inlineError when provided', () => {
    renderItem({ inlineError: 'Used in a recipe' });
    expect(screen.getByText('Used in a recipe')).toBeInTheDocument();
  });

  it('does not render inlineError when not provided', () => {
    renderItem();
    expect(screen.queryByText('Used in a recipe')).not.toBeInTheDocument();
  });
});
