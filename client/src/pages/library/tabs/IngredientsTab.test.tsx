import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { system } from '@/styles/theme';
import { IngredientsTab } from './IngredientsTab';
import * as ingredientsApi from '@/api/ingredients';

vi.mock('@/api/ingredients', () => ({
  fetchIngredients: vi.fn(),
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  addVariant: vi.fn(),
  updateVariant: vi.fn(),
  deleteVariant: vi.fn(),
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

function page(
  ingredients: ingredientsApi.IngredientsPage['ingredients'],
  meta: ingredientsApi.IngredientsPage['meta'] = { page: 1, totalPages: 1 },
): ingredientsApi.IngredientsPage {
  return { ingredients, meta };
}

const tomato = {
  id: '1',
  name: 'Tomato',
  ingredient_variants: [] as { id: string; variant: string }[],
  category: null,
  workspace_id: 'w1',
  created_at: new Date(),
  updated_at: new Date(),
};

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
        <IngredientsTab />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

// Helper: returns the inline edit input (not the search box).
// The search box has a placeholder; InlineEditInput does not.
function getEditInput() {
  return screen
    .getAllByRole('textbox')
    .find((el) => !(el as HTMLInputElement).placeholder)!;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Loading / error / empty ─────────────────────────────────────────────────

describe('IngredientsTab — loading / error / empty', () => {
  it('renders a spinner while loading', () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(document.querySelector('.chakra-spinner')).toBeInTheDocument();
  });

  it('renders an inline error with retry on fetch failure', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockRejectedValue(new Error('Network error'));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('Failed to load ingredients.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders an empty state when there are no ingredients', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([]));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText('No ingredients yet.')).toBeInTheDocument(),
    );
  });
});

// ── List rendering ──────────────────────────────────────────────────────────

describe('IngredientsTab — list', () => {
  it('renders parent ingredient names', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([
        tomato,
        { ...tomato, id: '2', name: 'Basil' },
      ]),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByText('Basil')).toBeInTheDocument();
  });

  it('renders variant names under their parent', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([
        {
          ...tomato,
          ingredient_variants: [
            { id: 'v1', variant: 'Cherry Tomato' },
            { id: 'v2', variant: 'Plum Tomato' },
          ],
        },
      ]),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByText('Cherry Tomato')).toBeInTheDocument();
    expect(screen.getByText('Plum Tomato')).toBeInTheDocument();
  });

  it('renders a search input', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Search ingredients…')).toBeInTheDocument();
  });
});

// ── Search / debounce ───────────────────────────────────────────────────────

describe('IngredientsTab — search', () => {
  it('calls fetchIngredients with the typed search term after debounce', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([]));
    await user.type(screen.getByPlaceholderText('Search ingredients…'), 'tom');

    await waitFor(() => {
      const calls = vi.mocked(ingredientsApi.fetchIngredients).mock.calls;
      expect(calls.some(([, s]) => s === 'tom')).toBe(true);
    });
  });

  it('shows "no results" message when search returns empty', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([]));
    await user.type(screen.getByPlaceholderText('Search ingredients…'), 'xyz');

    await waitFor(() =>
      expect(screen.getByText(/no ingredients match/i)).toBeInTheDocument(),
    );
  });
});

// ── Pagination ──────────────────────────────────────────────────────────────

describe('IngredientsTab — pagination', () => {
  it('renders prev/next buttons when totalPages > 1', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([tomato], { page: 1, totalPages: 3 }),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('previous button is disabled on page 1', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([tomato], { page: 1, totalPages: 3 }),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('next button is disabled on last page', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([tomato], { page: 3, totalPages: 3 }),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('does not render pagination when totalPages is 1', async () => {
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([tomato], { page: 1, totalPages: 1 }),
    );
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });
});

// ── Update ingredient ───────────────────────────────────────────────────────

describe('IngredientsTab — update ingredient', () => {
  it('calls PATCH with the correct id and name on save', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.updateIngredient).mockResolvedValue({
      ...tomato,
      name: 'Cherry Tomato',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByText('Tomato'));
    const input = getEditInput();
    await user.clear(input);
    await user.type(input, 'Cherry Tomato');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(ingredientsApi.updateIngredient).toHaveBeenCalledWith('1', {
        name: 'Cherry Tomato',
      }),
    );
  });

  it('shows a toast and reverts on update failure', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.updateIngredient).mockRejectedValue(new Error('Server error'));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByText('Tomato'));
    const input = getEditInput();
    await user.clear(input);
    await user.type(input, 'Cherry Tomato');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to update ingredient. Please try again.',
      ),
    );
  });
});

// ── Delete ingredient ───────────────────────────────────────────────────────

describe('IngredientsTab — delete ingredient', () => {
  it('shows inline error on 409 and does not show a toast', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.deleteIngredient).mockRejectedValue({
      statusCode: 409,
      message: 'Used in a recipe',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete tomato/i }));

    await waitFor(() =>
      expect(screen.getByText('Used in a recipe')).toBeInTheDocument(),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('invalidates the query after successful delete', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.deleteIngredient).mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /delete tomato/i }));

    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenCalledTimes(2),
    );
  });
});

// ── Create ingredient ───────────────────────────────────────────────────────

describe('IngredientsTab — create ingredient', () => {
  it('shows an inline input when Add ingredient is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add ingredient/i }));
    expect(getEditInput()).toBeInTheDocument();
  });

  it('calls POST with the correct name on Enter', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.createIngredient).mockResolvedValue({
      ...tomato,
      id: '2',
      name: 'Basil',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add ingredient/i }));
    await user.type(getEditInput(), 'Basil');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(ingredientsApi.createIngredient).toHaveBeenCalledWith({ name: 'Basil' }),
    );
  });

  it('shows inline error under input on 409', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.createIngredient).mockRejectedValue({
      statusCode: 409,
      message: 'An ingredient with this name already exists.',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add ingredient/i }));
    await user.type(getEditInput(), 'Tomato');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(
        screen.getByText('An ingredient with this name already exists.'),
      ).toBeInTheDocument(),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });
});

// ── Add variant ─────────────────────────────────────────────────────────────

describe('IngredientsTab — add variant', () => {
  it('shows inline input when Add variant is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add variant/i }));
    expect(getEditInput()).toBeInTheDocument();
  });

  it('calls POST variant with correct params on Enter', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.addVariant).mockResolvedValue({ id: 'v1', variant: 'Cherry Tomato' });
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add variant/i }));
    await user.type(getEditInput(), 'Cherry Tomato');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(ingredientsApi.addVariant).toHaveBeenCalledWith('1', {
        variant: 'Cherry Tomato',
      }),
    );
  });

  it('shows a toast on add variant failure', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(page([tomato]));
    vi.mocked(ingredientsApi.addVariant).mockRejectedValue(new Error('Server error'));
    renderTab();
    await waitFor(() => expect(screen.getByText('Tomato')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add variant/i }));
    await user.type(getEditInput(), 'Cherry');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Failed to add variant. Please try again.',
      ),
    );
  });
});

// ── Update variant ──────────────────────────────────────────────────────────

describe('IngredientsTab — update variant', () => {
  it('calls PATCH variant with correct params on save', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([
        {
          ...tomato,
          ingredient_variants: [{ id: 'v1', variant: 'Cherry Tomato' }],
        },
      ]),
    );
    vi.mocked(ingredientsApi.updateVariant).mockResolvedValue({ id: 'v1', variant: 'Grape Tomato' });
    renderTab();
    await waitFor(() => expect(screen.getByText('Cherry Tomato')).toBeInTheDocument());

    await user.click(screen.getByText('Cherry Tomato'));
    const input = getEditInput();
    await user.clear(input);
    await user.type(input, 'Grape Tomato');
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(ingredientsApi.updateVariant).toHaveBeenCalledWith('1', 'v1', {
        variant: 'Grape Tomato',
      }),
    );
  });
});

// ── Delete variant ──────────────────────────────────────────────────────────

describe('IngredientsTab — delete variant', () => {
  it('shows inline error on 409 and does not show a toast', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([
        {
          ...tomato,
          ingredient_variants: [{ id: 'v1', variant: 'Cherry Tomato' }],
        },
      ]),
    );
    vi.mocked(ingredientsApi.deleteVariant).mockRejectedValue({
      statusCode: 409,
      message: 'Variant used in a recipe',
    });
    renderTab();
    await waitFor(() => expect(screen.getByText('Cherry Tomato')).toBeInTheDocument());

    await user.click(
      screen.getByRole('button', { name: /delete cherry tomato/i }),
    );

    await waitFor(() =>
      expect(screen.getByText('Variant used in a recipe')).toBeInTheDocument(),
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('invalidates the query after successful delete', async () => {
    const user = userEvent.setup();
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValue(
      page([
        {
          ...tomato,
          ingredient_variants: [{ id: 'v1', variant: 'Cherry Tomato' }],
        },
      ]),
    );
    vi.mocked(ingredientsApi.deleteVariant).mockResolvedValue(undefined);
    renderTab();
    await waitFor(() => expect(screen.getByText('Cherry Tomato')).toBeInTheDocument());

    await user.click(
      screen.getByRole('button', { name: /delete cherry tomato/i }),
    );

    await waitFor(() =>
      expect(ingredientsApi.fetchIngredients).toHaveBeenCalledTimes(2),
    );
  });
});
