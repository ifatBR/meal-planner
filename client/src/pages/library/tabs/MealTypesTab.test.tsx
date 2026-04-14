import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { system } from '@/styles/theme';
import { MealTypesTab } from './MealTypesTab';
import * as mealTypesApi from '@/api/mealTypes';
import { MEAL_TYPE_COLORS } from '@/utils/constants';

vi.mock('@/api/mealTypes', () => ({
  fetchMealTypes: vi.fn(),
  createMealType: vi.fn(),
  updateMealType: vi.fn(),
  deleteMealType: vi.fn(),
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
        <MealTypesTab />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MealTypesTab — list', () => {
  it('renders an EditableListItem per meal type', async () => {
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
      { id: '2', name: 'Lunch', color: '#45C9B2' },
    ]);
    renderTab();
    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());
    expect(screen.getByText('Lunch')).toBeInTheDocument();
  });

  it('renders empty state when list is empty', async () => {
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([]);
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('No meal types yet.')).toBeInTheDocument()
    );
  });

  it('renders a loading spinner while fetching', () => {
    // Never resolve — stays loading
    vi.mocked(mealTypesApi.fetchMealTypes).mockReturnValue(new Promise(() => {}));
    renderTab();
    // Chakra's Spinner renders as a <span> without an explicit ARIA role
    expect(document.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  it('renders an inline error with a retry button on fetch failure', async () => {
    vi.mocked(mealTypesApi.fetchMealTypes).mockRejectedValue(new Error('Network error'));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('Failed to load meal types.')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('MealTypesTab — update', () => {
  it('calls PATCH with the correct id and name on save', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
    ]);
    vi.mocked(mealTypesApi.updateMealType).mockResolvedValue({
      id: '1',
      name: 'Brunch',
      color: '#AEE553',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByText('Breakfast'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Brunch');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mealTypesApi.updateMealType).toHaveBeenCalledWith('1', { name: 'Brunch' })
    );
  });

  it('reverts the optimistic update when PATCH fails', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
    ]);
    vi.mocked(mealTypesApi.updateMealType).mockRejectedValue(new Error('Server error'));
    renderTab();

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByText('Breakfast'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Brunch');
    await user.keyboard('{Enter}');

    // onError restores previous data — Breakfast is back, Brunch is gone
    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());
    expect(screen.queryByText('Brunch')).not.toBeInTheDocument();
  });
});

describe('MealTypesTab — delete', () => {
  it('shows inlineError on the correct item on 409 and does not show a toast', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
      { id: '2', name: 'Lunch', color: '#45C9B2' },
    ]);
    vi.mocked(mealTypesApi.deleteMealType).mockRejectedValue({
      statusCode: 409,
      message: 'Used in a layout',
    });
    renderTab();

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete breakfast/i }));

    // Inline error appears under the Breakfast row
    await waitFor(() =>
      expect(screen.getByText('Used in a layout')).toBeInTheDocument()
    );
    // Toast error is NOT shown for 409 — it is handled inline
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('invalidates the query after a successful delete', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
    ]);
    vi.mocked(mealTypesApi.deleteMealType).mockResolvedValue(undefined);
    renderTab();

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete breakfast/i }));

    // invalidateQueries triggers a second fetch
    await waitFor(() =>
      expect(mealTypesApi.fetchMealTypes).toHaveBeenCalledTimes(2)
    );
  });
});

describe('MealTypesTab — create', () => {
  it('shows an inline input when Add meal type is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
    ]);
    renderTab();

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add meal type/i }));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls POST with the correct name and next-cycle color on Enter', async () => {
    const user = userEvent.setup();
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue([
      { id: '1', name: 'Breakfast', color: '#AEE553' },
    ]);
    vi.mocked(mealTypesApi.createMealType).mockResolvedValue({
      id: '2',
      name: 'Lunch',
      color: MEAL_TYPE_COLORS[1],
    });
    renderTab();

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add meal type/i }));

    await user.type(screen.getByRole('textbox'), 'Lunch');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mealTypesApi.createMealType).toHaveBeenCalledWith({
        name: 'Lunch',
        // 1 existing meal type → index 1
        color: MEAL_TYPE_COLORS[1],
      })
    );
  });
});
