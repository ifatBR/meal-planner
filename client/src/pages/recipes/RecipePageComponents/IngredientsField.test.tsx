import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { system } from "@/styles/theme";
import { IngredientsField, type FormIngredient } from "./IngredientsField";
import * as ingredientsApi from "@/api/ingredients";

vi.mock("@/api/ingredients", () => ({
  fetchIngredients: vi.fn(),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockFetch = vi.mocked(ingredientsApi.fetchIngredients);

function makePage(names: string[]): ingredientsApi.IngredientsPage {
  return {
    items: names.map((name, i) => ({
      id: String(i + 10),
      name,
      ingredient_variants: [],
      category: null,
      workspace_id: "w1",
      created_at: new Date(),
      updated_at: new Date(),
    })),
    meta: { page: 1, totalPages: 1 },
  };
}

function renderField(
  value: FormIngredient[],
  onChange = vi.fn()
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={qc}>
        <IngredientsField value={value} onChange={onChange} />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

const chicken: FormIngredient = { id: "1", displayName: "Chicken", isMain: true };
const rice: FormIngredient = { id: "2", displayName: "Rice", isMain: false };

beforeEach(() => {
  mockFetch.mockResolvedValue(makePage([]));
});

describe("IngredientsField", () => {
  it("renders ingredient display names", () => {
    renderField([chicken, rice]);
    expect(screen.getByText("Chicken")).toBeInTheDocument();
    expect(screen.getByText("Rice")).toBeInTheDocument();
  });

  it("shows star marker for main ingredient", () => {
    renderField([chicken, rice]);
    expect(screen.getByLabelText("Main ingredient")).toBeInTheDocument();
  });

  it("renders 'Set as main' button for non-main ingredient and hides it for main", () => {
    renderField([chicken, rice]);
    expect(screen.getByLabelText("Set Rice as main")).toBeInTheDocument();
    // Button is always in DOM but CSS-hidden for the main ingredient
    expect(screen.getByLabelText("Set Chicken as main")).not.toBeVisible();
  });

  it("calls onChange with updated isMain when 'Set as main' is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderField([chicken, rice], onChange);
    await user.click(screen.getByLabelText("Set Rice as main"));
    expect(onChange).toHaveBeenCalledWith([
      { ...chicken, isMain: false },
      { ...rice, isMain: true },
    ]);
  });

  it("calls onChange without the removed ingredient when × is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderField([chicken, rice], onChange);
    await user.click(screen.getByLabelText("Remove Rice"));
    expect(onChange).toHaveBeenCalledWith([chicken]);
  });

  it("removing a non-main ingredient preserves the main's isMain flag", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderField([chicken, rice], onChange);
    await user.click(screen.getByLabelText("Remove Rice"));
    expect(onChange).toHaveBeenCalledWith([chicken]);
  });

  it("shows search panel when '+ Add ingredient' is clicked", async () => {
    const user = userEvent.setup();
    renderField([]);
    await user.click(screen.getByRole("button", { name: "+ Add ingredient" }));
    expect(screen.getByPlaceholderText("Search ingredients…")).toBeInTheDocument();
  });

  it("searches ingredients and adds on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(makePage(["Tomato", "Tofu"]));
    renderField([], onChange);
    await user.click(screen.getByRole("button", { name: "+ Add ingredient" }));
    await waitFor(() =>
      expect(screen.getByText("Tomato")).toBeInTheDocument()
    );
    await user.click(screen.getByText("Tomato"));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ displayName: "Tomato", isMain: true }),
    ]);
  });

  it("first added ingredient is marked as main", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(makePage(["Tomato"]));
    renderField([], onChange);
    await user.click(screen.getByRole("button", { name: "+ Add ingredient" }));
    await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
    await user.click(screen.getByText("Tomato"));
    const [call] = onChange.mock.calls;
    expect(call[0][0].isMain).toBe(true);
  });

  it("subsequent added ingredients are not main", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    mockFetch.mockResolvedValue(makePage(["Tomato"]));
    renderField([chicken], onChange);
    await user.click(screen.getByRole("button", { name: "+ Add ingredient" }));
    await waitFor(() => expect(screen.getByText("Tomato")).toBeInTheDocument());
    await user.click(screen.getByText("Tomato"));
    const [call] = onChange.mock.calls;
    expect(call[0][1].isMain).toBe(false);
  });

  it("renders validation error", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ChakraProvider value={system}>
        <QueryClientProvider client={qc}>
          <IngredientsField
            value={[]}
            onChange={vi.fn()}
            error="At least one ingredient is required."
          />
        </QueryClientProvider>
      </ChakraProvider>
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "At least one ingredient is required."
    );
  });
});
