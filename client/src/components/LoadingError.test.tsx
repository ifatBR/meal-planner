import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { LoadingError } from './LoadingError';

function renderError(props: Partial<React.ComponentProps<typeof LoadingError>> = {}) {
  const defaults = { message: 'Failed to load data.', onClick: vi.fn() };
  return render(
    <ChakraProvider value={system}>
      <LoadingError {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('LoadingError', () => {
  it('renders the error message', () => {
    renderError();
    expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
  });

  it('renders a Retry button', () => {
    renderError();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onClick when Retry is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderError({ onClick });
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
