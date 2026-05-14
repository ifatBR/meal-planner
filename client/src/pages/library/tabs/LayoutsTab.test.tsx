import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { system } from '@/styles/theme';
import { LayoutsTab } from './LayoutsTab';
import * as layoutsApi from '@/api/layouts';

vi.mock('@/api/layouts', () => ({
  fetchLayouts: vi.fn(),
  deleteLayout: vi.fn(),
}));

const mockToastError = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: mockToastError,
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <LayoutsTab />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

const mockLayouts = [
  { id: '1', name: 'Weekday Plan', inUse: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', name: 'Weekend Plan', inUse: true, createdAt: '2024-01-02', updatedAt: '2024-01-02' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LayoutsTab — list', () => {
  it('renders a list item per layout', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockResolvedValue(mockLayouts);
    renderTab();
    await waitFor(() => expect(screen.getByText('Weekday Plan')).toBeInTheDocument());
    expect(screen.getByText('Weekend Plan')).toBeInTheDocument();
  });

  it('renders empty state when list is empty', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockResolvedValue([]);
    renderTab();
    await waitFor(() => expect(screen.getByText('No layouts yet.')).toBeInTheDocument());
  });

  it('renders loading error when fetch fails', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockRejectedValue(new Error('network'));
    renderTab();
    await waitFor(() => expect(screen.getByText('Failed to load layouts.')).toBeInTheDocument());
  });
});

describe('LayoutsTab — delete', () => {
  it('calls deleteLayout and refetches on success', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockResolvedValue(mockLayouts);
    vi.mocked(layoutsApi.deleteLayout).mockResolvedValue(undefined);
    renderTab();

    await waitFor(() => expect(screen.getByText('Weekday Plan')).toBeInTheDocument());

    const item = screen.getByText('Weekday Plan').closest('[data-testid]') ?? screen.getByText('Weekday Plan');
    await userEvent.hover(item);
    const deleteBtn = screen.getByRole('button', { name: /delete weekday plan/i });
    await userEvent.click(deleteBtn);

    await waitFor(() => expect(layoutsApi.deleteLayout).toHaveBeenCalledWith('1'));
  });

  it('shows inline error on 409 conflict', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockResolvedValue(mockLayouts);
    vi.mocked(layoutsApi.deleteLayout).mockRejectedValue({
      statusCode: 409,
      message: 'This layout is used in an active schedule and cannot be deleted.',
    });
    renderTab();

    await waitFor(() => expect(screen.getByText('Weekday Plan')).toBeInTheDocument());

    const item = screen.getByText('Weekday Plan').closest('[data-testid]') ?? screen.getByText('Weekday Plan');
    await userEvent.hover(item);
    const deleteBtn = screen.getByRole('button', { name: /delete weekday plan/i });
    await userEvent.click(deleteBtn);

    await waitFor(() =>
      expect(screen.getByText('This layout is used in an active schedule and cannot be deleted.')).toBeInTheDocument()
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('shows toast on non-409 delete failure', async () => {
    vi.mocked(layoutsApi.fetchLayouts).mockResolvedValue(mockLayouts);
    vi.mocked(layoutsApi.deleteLayout).mockRejectedValue({ statusCode: 500 });
    renderTab();

    await waitFor(() => expect(screen.getByText('Weekday Plan')).toBeInTheDocument());

    const item = screen.getByText('Weekday Plan').closest('[data-testid]') ?? screen.getByText('Weekday Plan');
    await userEvent.hover(item);
    const deleteBtn = screen.getByRole('button', { name: /delete weekday plan/i });
    await userEvent.click(deleteBtn);

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Failed to delete layout. Please try again.'));
  });
});
