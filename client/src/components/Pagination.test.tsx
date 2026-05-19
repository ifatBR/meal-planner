import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/styles/theme';
import { Pagination } from './Pagination';

function renderPagination(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const defaults = {
    meta: { page: 1, totalPages: 3 },
    setPage: vi.fn(),
  };
  return render(
    <ChakraProvider value={system}>
      <Pagination {...defaults} {...props} />
    </ChakraProvider>
  );
}

describe('Pagination', () => {
  it('renders nothing when meta is undefined', () => {
    const { container } = renderPagination({ meta: undefined });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when totalPages is 1', () => {
    const { container } = renderPagination({ meta: { page: 1, totalPages: 1 } });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders page info', () => {
    renderPagination();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    renderPagination({ meta: { page: 1, totalPages: 3 } });
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables Next on the last page', () => {
    renderPagination({ meta: { page: 3, totalPages: 3 } });
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('enables both buttons on a middle page', () => {
    renderPagination({ meta: { page: 2, totalPages: 3 } });
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls setPage with a decrement function when Previous is clicked', async () => {
    const setPage = vi.fn();
    const user = userEvent.setup();
    renderPagination({ meta: { page: 2, totalPages: 3 }, setPage });
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(setPage).toHaveBeenCalledTimes(1);
    const updater = setPage.mock.calls[0][0];
    expect(updater(2)).toBe(1);
  });

  it('calls setPage with an increment function when Next is clicked', async () => {
    const setPage = vi.fn();
    const user = userEvent.setup();
    renderPagination({ meta: { page: 2, totalPages: 3 }, setPage });
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(setPage).toHaveBeenCalledTimes(1);
    const updater = setPage.mock.calls[0][0];
    expect(updater(2)).toBe(3);
  });
});
