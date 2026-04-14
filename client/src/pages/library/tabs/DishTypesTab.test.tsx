import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { system } from '@/styles/theme';
import { DishTypesTab } from './DishTypesTab';
import * as dishTypesApi from '@/api/dishTypes';

vi.mock('@/api/dishTypes', () => ({
  fetchDishTypes: vi.fn(),
  createDishType: vi.fn(),
  updateDishType: vi.fn(),
  deleteDishType: vi.fn(),
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
        <DishTypesTab />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DishTypesTab — list', () => {
  it('renders an EditableListItem per dish type', async () => {
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
      { id: '2', name: 'Soup' },
    ]);
    renderTab();
    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());
    expect(screen.getByText('Soup')).toBeInTheDocument();
  });

  it('renders empty state when list is empty', async () => {
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([]);
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('No dish types yet.')).toBeInTheDocument()
    );
  });

  it('renders a loading spinner while fetching', () => {
    vi.mocked(dishTypesApi.fetchDishTypes).mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(document.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  it('renders an inline error with a retry button on fetch failure', async () => {
    vi.mocked(dishTypesApi.fetchDishTypes).mockRejectedValue(new Error('Network error'));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('Failed to load dish types.')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('DishTypesTab — update', () => {
  it('calls PATCH with the correct id and name on save', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
    ]);
    vi.mocked(dishTypesApi.updateDishType).mockResolvedValue({
      id: '1',
      name: 'Caesar Salad',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByText('Salad'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Caesar Salad');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(dishTypesApi.updateDishType).toHaveBeenCalledWith('1', { name: 'Caesar Salad' })
    );
  });

  it('reverts the optimistic update when PATCH fails', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
    ]);
    vi.mocked(dishTypesApi.updateDishType).mockRejectedValue(new Error('Server error'));
    renderTab();

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByText('Salad'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Caesar Salad');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());
    expect(screen.queryByText('Caesar Salad')).not.toBeInTheDocument();
  });
});

describe('DishTypesTab — delete', () => {
  it('shows inlineError on the correct item on 409 and does not show a toast', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
      { id: '2', name: 'Soup' },
    ]);
    vi.mocked(dishTypesApi.deleteDishType).mockRejectedValue({
      statusCode: 409,
      message: 'Used in a recipe',
    });
    renderTab();

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete salad/i }));

    await waitFor(() =>
      expect(screen.getByText('Used in a recipe')).toBeInTheDocument()
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('invalidates the query after a successful delete', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
    ]);
    vi.mocked(dishTypesApi.deleteDishType).mockResolvedValue(undefined);
    renderTab();

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete salad/i }));

    await waitFor(() =>
      expect(dishTypesApi.fetchDishTypes).toHaveBeenCalledTimes(2)
    );
  });
});

describe('DishTypesTab — create', () => {
  it('shows an inline input when Add dish type is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
    ]);
    renderTab();

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add dish type/i }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls POST with the correct name on Enter', async () => {
    const user = userEvent.setup();
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue([
      { id: '1', name: 'Salad' },
    ]);
    vi.mocked(dishTypesApi.createDishType).mockResolvedValue({
      id: '2',
      name: 'Soup',
    });
    renderTab();

    await waitFor(() => expect(screen.getByText('Salad')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add dish type/i }));
    await user.type(screen.getByRole('textbox'), 'Soup');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(dishTypesApi.createDishType).toHaveBeenCalledWith({ name: 'Soup' })
    );
  });
});
