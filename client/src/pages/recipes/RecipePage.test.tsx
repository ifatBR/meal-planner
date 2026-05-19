import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { system } from "@/styles/theme";
import { RecipePage } from "./RecipePage";
import * as recipesApi from "@/api/recipes";
import * as mealTypesApi from "@/api/mealTypes";
import * as dishTypesApi from "@/api/dishTypes";
import * as ingredientsApi from "@/api/ingredients";

vi.mock("@/api/recipes", () => ({
  fetchRecipeById: vi.fn(),
  updateRecipe: vi.fn(),
  createRecipe: vi.fn(),
}));
vi.mock("@/api/mealTypes", () => ({ fetchMealTypes: vi.fn() }));
vi.mock("@/api/dishTypes", () => ({ fetchDishTypes: vi.fn() }));
vi.mock("@/api/ingredients", () => ({ fetchIngredients: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }) }));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const recipe = {
  id: "r1",
  name: "pasta",
  instructions: "Cook pasta.",
  mealTypes: [{ id: "mt1", name: "Dinner", color: "#FF6B6B" }],
  dishTypes: [{ id: "dt1", name: "Main" }],
  ingredients: [{ id: "i1", displayName: "Pasta", isMain: true }],
};

const mealTypes = [
  { id: "mt1", name: "Dinner", color: "#FF6B6B" },
  { id: "mt2", name: "Lunch", color: "#AEE553" },
];
const dishTypes = [
  { id: "dt1", name: "Main" },
  { id: "dt2", name: "Side" },
];

function renderCreatePage() {
  vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue(mealTypes);
  vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue(dishTypes);

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/recipes/new"]}>
          <Routes>
            <Route path="/recipes/new" element={<RecipePage />} />
            <Route path="/library" element={<div>Library</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

function renderPage() {
  vi.mocked(recipesApi.fetchRecipeById).mockResolvedValue(recipe);
  vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue(mealTypes);
  vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue(dishTypes);

  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/recipes/r1"]}>
          <Routes>
            <Route path="/recipes/:id" element={<RecipePage />} />
            <Route path="/library" element={<div>Library</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockToastSuccess.mockClear();
  mockToastError.mockClear();
});

describe("RecipePage", () => {
  it("does not show the form while loading", () => {
    vi.mocked(recipesApi.fetchRecipeById).mockReturnValue(new Promise(() => {}));
    vi.mocked(mealTypesApi.fetchMealTypes).mockReturnValue(new Promise(() => {}));
    vi.mocked(dishTypesApi.fetchDishTypes).mockReturnValue(new Promise(() => {}));

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ChakraProvider value={system}>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/recipes/r1"]}>
            <Routes>
              <Route path="/recipes/:id" element={<RecipePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    );
    expect(screen.queryByPlaceholderText("Recipe name")).not.toBeInTheDocument();
  });

  it("pre-fills the name field with the recipe name", async () => {
    renderPage();
    const input = await screen.findByPlaceholderText("Recipe name");
    expect((input as HTMLInputElement).value).toBe("pasta");
  });

  it("pre-fills the description field", async () => {
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    const textarea = screen.getByPlaceholderText("Add a description…");
    expect((textarea as HTMLTextAreaElement).value).toBe("Cook pasta.");
  });

  it("renders the selected meal type tag", async () => {
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("renders the selected dish type tag", async () => {
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("renders the main ingredient with star marker", async () => {
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.getByLabelText("Main ingredient")).toBeInTheDocument();
  });

  it("shows name validation error when saving with empty name", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByPlaceholderText("Recipe name");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
    expect(recipesApi.updateRecipe).not.toHaveBeenCalled();
  });

  it("shows ingredient validation error when saving with no ingredients", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.fetchRecipeById).mockResolvedValue({
      ...recipe,
      ingredients: [],
    });
    vi.mocked(mealTypesApi.fetchMealTypes).mockResolvedValue(mealTypes);
    vi.mocked(dishTypesApi.fetchDishTypes).mockResolvedValue(dishTypes);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ChakraProvider value={system}>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/recipes/r1"]}>
            <Routes>
              <Route path="/recipes/:id" element={<RecipePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </ChakraProvider>
    );
    await screen.findByPlaceholderText("Recipe name");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("At least one ingredient is required.");
  });

  it("calls updateRecipe with changed name and shows success toast", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.updateRecipe).mockResolvedValue({ ...recipe, name: "spaghetti" });
    renderPage();
    const input = await screen.findByPlaceholderText("Recipe name");
    await user.clear(input);
    await user.type(input, "spaghetti");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(recipesApi.updateRecipe).toHaveBeenCalledWith(
        "r1",
        expect.objectContaining({ name: "spaghetti" })
      )
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Recipe saved."));
  });

  it("does not call updateRecipe when nothing changed", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByText("Library")).toBeInTheDocument()
    );
    expect(recipesApi.updateRecipe).not.toHaveBeenCalled();
  });

  it("shows inline name error on 409 name conflict", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.updateRecipe).mockRejectedValue({
      statusCode: 409,
      error: "recipe",
      message: "recipe already exists",
    });
    renderPage();
    const input = await screen.findByPlaceholderText("Recipe name");
    await user.clear(input);
    await user.type(input, "other name");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A recipe with this name already exists."
    );
  });

  it("resets form to original values on Discard", async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByPlaceholderText("Recipe name");
    await user.clear(input);
    await user.type(input, "changed name");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect((input as HTMLInputElement).value).toBe("pasta");
  });

  it("navigates to Library when Discard is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByPlaceholderText("Recipe name");
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.getByText("Library")).toBeInTheDocument();
  });
});

describe("RecipePage — create mode", () => {
  it("renders an empty name field at /recipes/new", async () => {
    renderCreatePage();
    const input = await screen.findByPlaceholderText("Recipe name");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("shows name validation error on save with empty name", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    await screen.findByPlaceholderText("Recipe name");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(recipesApi.createRecipe).not.toHaveBeenCalled();
  });

  it("shows meal type validation error when no meal type selected", async () => {
    const user = userEvent.setup();
    renderCreatePage();
    const input = await screen.findByPlaceholderText("Recipe name");
    await user.type(input, "New Recipe");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("At least one meal type is required.")).toBeInTheDocument();
    expect(recipesApi.createRecipe).not.toHaveBeenCalled();
  });

  it("calls createRecipe and shows 'Recipe created.' toast on valid submission", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesApi.createRecipe).mockResolvedValue({ ...recipe, id: "r-new" });
    vi.mocked(ingredientsApi.fetchIngredients).mockResolvedValueOnce({
      items: [{ id: "i99", name: "Pasta", ingredient_variants: [], category: null, workspace_id: "w1", created_at: new Date(), updated_at: new Date() }],
      meta: { page: 1, totalPages: 1 },
    });
    renderCreatePage();

    const input = await screen.findByPlaceholderText("Recipe name");
    await user.type(input, "New Recipe");

    // Add meal type
    await user.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    await user.click(screen.getByText("Dinner"));

    // Add dish type
    await user.click(screen.getAllByRole("button", { name: "+ Add" })[1]);
    await user.click(screen.getByText("Main"));

    // Add ingredient
    await user.click(screen.getByRole("button", { name: "+ Add ingredient" }));
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await user.click(screen.getByText("Pasta"));

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(recipesApi.createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Recipe" })
      )
    );
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Recipe created."));
  });
});
