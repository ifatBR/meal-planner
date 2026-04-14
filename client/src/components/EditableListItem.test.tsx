import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { EditableListItem } from './EditableListItem';

function renderItem(props: Partial<React.ComponentProps<typeof EditableListItem>> = {}) {
  const defaults = {
    name: 'Breakfast',
    onSave: vi.fn(),
    onDelete: vi.fn(),
  };
  return render(
    <ChakraProvider value={system}>
      <EditableListItem {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('EditableListItem', () => {
  it('renders the name as text by default', () => {
    renderItem();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('switches to input when the name is clicked', async () => {
    const user = userEvent.setup();
    renderItem();
    await user.click(screen.getByText('Breakfast'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSave with the new value and exits edit mode on Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderItem({ onSave });
    await user.click(screen.getByText('Breakfast'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Brunch');
    await user.keyboard('{Enter}');
    expect(onSave).toHaveBeenCalledWith('Brunch');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('exits edit mode without calling onSave on Escape', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    renderItem({ onSave });
    await user.click(screen.getByText('Breakfast'));
    await user.keyboard('{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
  });

  it('delete button wrapper is not visible before hover', () => {
    renderItem();
    const deleteBtn = screen.getByRole('button', { name: /delete breakfast/i });
    // button → cursor Box → opacity Box (Tooltip uses asChild so adds no DOM element)
    expect(deleteBtn.parentElement?.parentElement).toHaveStyle({ opacity: '0' });
  });

  it('delete button wrapper is visible on hover', async () => {
    const user = userEvent.setup();
    renderItem();
    // Hover the row by hovering the name text, which triggers onMouseEnter on the Flex row
    await user.hover(screen.getByText('Breakfast'));
    const deleteBtn = screen.getByRole('button', { name: /delete breakfast/i });
    expect(deleteBtn.parentElement?.parentElement).toHaveStyle({ opacity: '1' });
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderItem({ onDelete });
    await user.click(screen.getByRole('button', { name: /delete breakfast/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('delete button is disabled when deleteBlocked is true', () => {
    renderItem({ deleteBlocked: true });
    expect(screen.getByRole('button', { name: /delete breakfast/i })).toBeDisabled();
  });

  it('renders inlineError under the row when provided', () => {
    renderItem({ inlineError: 'Used in a layout' });
    expect(screen.getByText('Used in a layout')).toBeInTheDocument();
  });
});
