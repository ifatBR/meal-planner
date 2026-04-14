import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { system } from '@/styles/theme';
import { LibraryPage } from './LibraryPage';

vi.mock('./tabs/MealTypesTab', () => ({
  MealTypesTab: () => <div data-testid="meal-types-tab" />,
}));

vi.mock('./tabs/DishTypesTab', () => ({
  DishTypesTab: () => <div data-testid="dish-types-tab" />,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={queryClient}>
        <LibraryPage />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

describe('LibraryPage', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Library' })).toBeInTheDocument();
  });

  it('renders all 5 tab labels', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Meal Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dish Types' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ingredients' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recipes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Layouts' })).toBeInTheDocument();
  });

  it('Meal Types tab is active by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'Meal Types' })).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking Dish Types activates its tab and deactivates Meal Types', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Dish Types' }));

    expect(screen.getByRole('tab', { name: 'Dish Types' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Meal Types' })).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking Ingredients activates its tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Ingredients' }));

    expect(screen.getByRole('tab', { name: 'Ingredients' })).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking Recipes activates its tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Recipes' }));

    expect(screen.getByRole('tab', { name: 'Recipes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('clicking Layouts activates its tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Layouts' }));

    expect(screen.getByRole('tab', { name: 'Layouts' })).toHaveAttribute('aria-selected', 'true');
  });
});
