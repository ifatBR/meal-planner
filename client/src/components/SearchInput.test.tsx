import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { SearchInput } from './SearchInput';

function renderSearch(props: Partial<React.ComponentProps<typeof SearchInput>> = {}) {
  const defaults = { value: '', onChange: vi.fn() };
  return render(
    <ChakraProvider value={system}>
      <SearchInput {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('SearchInput', () => {
  it('renders with default placeholder', () => {
    renderSearch();
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });

  it('renders with a custom placeholder', () => {
    renderSearch({ placeholder: 'Find recipe…' });
    expect(screen.getByPlaceholderText('Find recipe…')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    renderSearch({ value: 'pasta' });
    expect(screen.getByDisplayValue('pasta')).toBeInTheDocument();
  });

  it('calls onChange with the new value when typing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSearch({ onChange });
    await user.type(screen.getByPlaceholderText('Search…'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('clear button is hidden when value is empty', () => {
    renderSearch({ value: '' });
    expect(screen.getByLabelText('Clear search')).toHaveStyle({ opacity: '0' });
  });

  it('clear button is visible when value is present', () => {
    renderSearch({ value: 'pasta' });
    expect(screen.getByLabelText('Clear search')).toHaveStyle({ opacity: '1' });
  });

  it('calls onChange with empty string when clear button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderSearch({ value: 'pasta', onChange });
    await user.click(screen.getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
