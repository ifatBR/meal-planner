import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRecipes, fetchRecipeById, updateRecipe, deleteRecipe } from "./recipes";
import { setAccessTokenGetter } from "./apiClient";

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setAccessTokenGetter(() => "test-token");
  fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
  );
});

afterEach(() => {
  setAccessTokenGetter(() => null);
  fetchSpy.mockRestore();
});

function okJson(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

function errorJson(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status });
}

function getLastCall() {
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  const headers = options?.headers as Record<string, string>;
  return { url, options, headers };
}

describe("fetchRecipes", () => {
  it("calls GET /api/v1/recipes with page param", async () => {
    fetchSpy.mockResolvedValueOnce(
      okJson({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } })
    );
    await fetchRecipes(2);
    const { url } = getLastCall();
    expect(url).toContain("/api/v1/recipes");
    expect(url).toContain("page=2");
  });

  it("includes Authorization bearer token", async () => {
    fetchSpy.mockResolvedValueOnce(
      okJson({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } })
    );
    await fetchRecipes();
    const { headers } = getLastCall();
    expect(headers["Authorization"]).toBe("Bearer test-token");
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: "Server error" }));
    await expect(fetchRecipes()).rejects.toEqual({ message: "Server error" });
  });
});

describe("fetchRecipeById", () => {
  it("calls GET /api/v1/recipes/:id", async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: "r1", name: "pasta" }));
    await fetchRecipeById("r1");
    const { url } = getLastCall();
    expect(url).toBe("/api/v1/recipes/r1");
  });

  it("includes Authorization bearer token", async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: "r1", name: "pasta" }));
    await fetchRecipeById("r1");
    const { headers } = getLastCall();
    expect(headers["Authorization"]).toBe("Bearer test-token");
  });

  it("returns the data from the response", async () => {
    const recipe = { id: "r1", name: "pasta", mealTypes: [], dishTypes: [], ingredients: [] };
    fetchSpy.mockResolvedValueOnce(okJson(recipe));
    const result = await fetchRecipeById("r1");
    expect(result).toEqual(recipe);
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: "Not found" }, 404));
    await expect(fetchRecipeById("r1")).rejects.toEqual({ message: "Not found" });
  });
});

describe("updateRecipe", () => {
  it("calls PATCH /api/v1/recipes/:id with correct body and headers", async () => {
    const updated = { id: "r1", name: "spaghetti", mealTypes: [], dishTypes: [], ingredients: [] };
    fetchSpy.mockResolvedValueOnce(okJson(updated));
    await updateRecipe("r1", { name: "spaghetti" });
    const { url, options, headers } = getLastCall();
    expect(url).toBe("/api/v1/recipes/r1");
    expect(options?.method).toBe("PATCH");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(options?.body).toBe(JSON.stringify({ name: "spaghetti" }));
  });

  it("includes Authorization bearer token", async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: "r1", name: "spaghetti" }));
    await updateRecipe("r1", { name: "spaghetti" });
    const { headers } = getLastCall();
    expect(headers["Authorization"]).toBe("Bearer test-token");
  });

  it("returns updated recipe from response", async () => {
    const updated = { id: "r1", name: "spaghetti", mealTypes: [], dishTypes: [], ingredients: [] };
    fetchSpy.mockResolvedValueOnce(okJson(updated));
    const result = await updateRecipe("r1", { name: "spaghetti" });
    expect(result).toEqual(updated);
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ statusCode: 409, error: "recipe", message: "exists" }, 409));
    await expect(updateRecipe("r1", { name: "spaghetti" })).rejects.toEqual({
      statusCode: 409,
      error: "recipe",
      message: "exists",
    });
  });
});

describe("deleteRecipe", () => {
  it("calls DELETE /api/v1/recipes/:id", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await deleteRecipe("r1");
    const { url, options } = getLastCall();
    expect(url).toBe("/api/v1/recipes/r1");
    expect(options?.method).toBe("DELETE");
  });

  it("includes Authorization bearer token", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await deleteRecipe("r1");
    const { headers } = getLastCall();
    expect(headers["Authorization"]).toBe("Bearer test-token");
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce(
      errorJson({ statusCode: 409, message: "In use" }, 409)
    );
    await expect(deleteRecipe("r1")).rejects.toEqual({
      statusCode: 409,
      message: "In use",
    });
  });
});
