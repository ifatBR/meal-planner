import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { system } from "@/styles/theme";
import { RecipesTab } from "./RecipesTab";
import * as recipesApi from "@/api/recipes";

vi.mock("@/api/recipes", () => ({
  fetchRecipes: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("./RecipesTabComponents/RecipeViewModal", () => ({
  RecipeViewModal: () => null,
}));

function renderTab() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <ChakraProvider value={system}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/library"]}>
          <Routes>
            <Route path="/library" element={<RecipesTab />} />
            <Route path="/recipes/new" element={<div>Create Recipe Page</div>} />
            <Route path="/recipes/:id" element={<div>Edit Recipe Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

const recipePage = {
  items: [
    { id: "r1", name: "pasta", mealTypes: [], dishTypes: [], ingredients: [] },
    { id: "r2", name: "salad", mealTypes: [], dishTypes: [], ingredients: [] },
  ],
  meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecipesTab — list", () => {
  it("renders recipe names capitalised", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockResolvedValue(recipePage);
    renderTab();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    expect(screen.getByText("Salad")).toBeInTheDocument();
  });

  it("shows empty state when list is empty", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });
    renderTab();
    await waitFor(() =>
      expect(screen.getByText("No recipes yet.")).toBeInTheDocument()
    );
  });

  it("shows spinner while loading", () => {
    vi.mocked(recipesApi.fetchRecipes).mockReturnValue(new Promise(() => {}));
    renderTab();
    expect(document.querySelector(".chakra-spinner")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockRejectedValue(new Error("fail"));
    renderTab();
    await waitFor(() =>
      expect(screen.getByText("Failed to load recipes.")).toBeInTheDocument()
    );
  });
});

describe("RecipesTab — create navigation", () => {
  it("navigates to /recipes/new when '+ Create recipe' is clicked", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockResolvedValue(recipePage);
    const user = userEvent.setup();
    renderTab();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "+ Create recipe" }));
    expect(screen.getByText("Create Recipe Page")).toBeInTheDocument();
  });

  it("navigates to /recipes/new from the empty state action", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });
    const user = userEvent.setup();
    renderTab();
    await waitFor(() => expect(screen.getByText("No recipes yet.")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add your first recipe" }));
    expect(screen.getByText("Create Recipe Page")).toBeInTheDocument();
  });
});

describe("RecipesTab — edit navigation", () => {
  it("navigates to /recipes/:id when Edit is clicked", async () => {
    vi.mocked(recipesApi.fetchRecipes).mockResolvedValue(recipePage);
    const user = userEvent.setup();
    renderTab();
    await waitFor(() => expect(screen.getByText("Pasta")).toBeInTheDocument());
    await user.click(screen.getByLabelText("Edit Pasta"));
    expect(screen.getByText("Edit Recipe Page")).toBeInTheDocument();
  });
});
