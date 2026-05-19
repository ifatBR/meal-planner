import { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import type { IngredientResponse } from "@app/types";
import {
  fetchIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addVariant,
  updateVariant,
  deleteVariant,
} from "@/api/ingredients";
import { Button } from "@/components/Button";
import { InlineEditInput } from "@/components/InlineEditInput";
import { SearchInput } from "@/components/SearchInput";
import { BodyText } from "@/components/Typography";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/useToast";
import { MAX_WIDTHS, SPACING } from "@/styles/designTokens";
import { AccordionList } from "./IngredientsTabComponents/AccordionList";
import { Pagination } from "@/components/Pagination";
import { LoadingError } from "@/components/LoadingError";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type PendingDelete =
  | { kind: "ingredient"; id: string; name: string }
  | { kind: "variant"; ingredientId: string; variantId: string; name: string };

// ── Main component ──────────────────────────────────────────────────────────

export function IngredientsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(
    null,
  );
  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredientError, setNewIngredientError] = useState<string | null>(
    null,
  );

  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [variantDeleteErrors, setVariantDeleteErrors] = useState<
    Record<string, string>
  >({});
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ingredients", page, search],
    queryFn: () => fetchIngredients(page, search || undefined),
    placeholderData: keepPreviousData,
  });

  const ingredients = useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta;

  const searchExpandedIds = useMemo(() => {
    if (!search || !ingredients.length) return [];
    return ingredients
      .filter((ing) =>
        ing.ingredient_variants.some((v) =>
          v.variant.toLowerCase().includes(search.toLowerCase()),
        ),
      )
      .map((ing) => ing.id);
  }, [search, ingredients]);

  const effectiveExpandedItems = useMemo(
    () => Array.from(new Set([...expandedItems, ...searchExpandedIds])),
    [expandedItems, searchExpandedIds],
  );

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateIngredientMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateIngredient(id, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["ingredients"] });
      const previous = queryClient.getQueryData(["ingredients", page, search]);
      queryClient.setQueryData(
        ["ingredients", page, search],
        (old: typeof data) =>
          old
            ? {
                ...old,
                items: old.items.map((ing) =>
                  ing.id === id ? { ...ing, name } : ing,
                ),
              }
            : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["ingredients", page, search],
          context.previous,
        );
      }
      toast.error("Failed to update ingredient. Please try again.");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (id: string) => deleteIngredient(id),
    onSuccess: (_data, id) => {
      setPendingDelete(null);
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      setPendingDelete(null);
      if (err?.statusCode === 409) {
        setDeleteErrors((prev) => ({
          ...prev,
          [id]:
            err.message ??
            "This ingredient is used in a recipe and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete ingredient. Please try again.");
      }
    },
  });

  const createIngredientMutation = useMutation({
    mutationFn: (name: string) => createIngredient({ name }),
    onSuccess: () => {
      setNewIngredientError(null);
      setAddingIngredient(false);
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (err: { statusCode?: number; message?: string }) => {
      if (err?.statusCode === 409) {
        setNewIngredientError(
          err.message ?? "An ingredient with this name already exists.",
        );
      } else {
        toast.error("Failed to create ingredient. Please try again.");
        setAddingIngredient(false);
      }
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: ({
      ingredientId,
      variantId,
      variant,
    }: {
      ingredientId: string;
      variantId: string;
      variant: string;
    }) => updateVariant(ingredientId, variantId, { variant }),
    onMutate: async ({ ingredientId, variantId, variant }) => {
      await queryClient.cancelQueries({ queryKey: ["ingredients"] });
      const previous = queryClient.getQueryData(["ingredients", page, search]);
      queryClient.setQueryData(
        ["ingredients", page, search],
        (old: typeof data) =>
          old
            ? {
                ...old,
                items: old.items.map((ing) =>
                  ing.id === ingredientId
                    ? {
                        ...ing,
                        ingredient_variants: ing.ingredient_variants.map((v) =>
                          v.id === variantId ? { ...v, variant } : v,
                        ),
                      }
                    : ing,
                ),
              }
            : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["ingredients", page, search],
          context.previous,
        );
      }
      toast.error("Failed to update variant. Please try again.");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: ({
      ingredientId,
      variantId,
    }: {
      ingredientId: string;
      variantId: string;
    }) => deleteVariant(ingredientId, variantId),
    onSuccess: (_data, { variantId }) => {
      setPendingDelete(null);
      setVariantDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (
      err: { statusCode?: number; message?: string },
      { variantId },
    ) => {
      setPendingDelete(null);
      if (err?.statusCode === 409) {
        setVariantDeleteErrors((prev) => ({
          ...prev,
          [variantId]:
            err.message ??
            "This variant is used in a recipe and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete variant. Please try again.");
      }
    },
  });

  const addVariantMutation = useMutation({
    mutationFn: ({
      ingredientId,
      variant,
    }: {
      ingredientId: string;
      variant: string;
    }) => addVariant(ingredientId, { variant }),
    onSuccess: () => {
      setAddingVariantFor(null);
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: () => {
      toast.error("Failed to add variant. Please try again.");
      setAddingVariantFor(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddVariantClick = (ingredientId: string) => {
    setAddingVariantFor(ingredientId);
    setExpandedItems((prev) =>
      prev.includes(ingredientId) ? prev : [...prev, ingredientId],
    );
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "ingredient") {
      deleteIngredientMutation.mutate(pendingDelete.id);
    } else {
      deleteVariantMutation.mutate({
        ingredientId: pendingDelete.ingredientId,
        variantId: pendingDelete.variantId,
      });
    }
  };

  const handleCancelAddVariant = (ingredient: IngredientResponse) => {
    setAddingVariantFor(null);
    if (ingredient.ingredient_variants.length === 0) {
      setExpandedItems((prev) => prev.filter((id) => id !== ingredient.id));
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Flex justify="center" pt={SPACING[8]}>
        <Spinner />
      </Flex>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <LoadingError
        message={"Failed to load ingredients."}
        onClick={() => refetch()}
      />
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!search && !ingredients.length && !addingIngredient) {
    return (
      <EmptyState
        title="No ingredients yet."
        description="Ingredients are the building blocks of your recipes. Add them here and use them when creating recipes."
        action={{ label: "Add your first ingredient", onClick: () => setAddingIngredient(true) }}
      />
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  return (
    <Box maxW={MAX_WIDTHS.listItem} pt={SPACING[4]}>
      {/* Search */}
      <SearchInput
        placeholder="Search ingredients…"
        value={searchInput}
        onChange={setSearchInput}
      />

      {/* Add ingredient */}
      {addingIngredient ? (
        <Box pt={SPACING[4]}>
          <InlineEditInput
            value=""
            onSave={(name) => createIngredientMutation.mutate(name)}
            onCancel={() => {
              setAddingIngredient(false);
              setNewIngredientError(null);
            }}
          />
          {newIngredientError && (
            <Box pt={SPACING[1]}>
              <BodyText secondary>{newIngredientError}</BodyText>
            </Box>
          )}
        </Box>
      ) : (
        <Box pt={SPACING[2]} px={SPACING[3]}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddingIngredient(true)}
          >
            + Add ingredient
          </Button>
        </Box>
      )}

      {/* No results */}
      {search && !ingredients.length && (
        <Box pt={SPACING[4]}>
          <BodyText secondary>No ingredients match "{search}".</BodyText>
        </Box>
      )}

      <AccordionList
        ingredients={ingredients}
        expandedItems={effectiveExpandedItems}
        setExpandedItems={setExpandedItems}
        addingVariantFor={addingVariantFor}
        setHoveredIngredient={setHoveredIngredient}
        hoveredIngredient={hoveredIngredient}
        updateIngredientMutation={updateIngredientMutation}
        onRequestDeleteIngredient={(id, name) =>
          setPendingDelete({ kind: "ingredient", id, name })
        }
        updateVariantMutation={updateVariantMutation}
        onRequestDeleteVariant={(ingredientId, variantId, name) =>
          setPendingDelete({ kind: "variant", ingredientId, variantId, name })
        }
        addVariantMutation={addVariantMutation}
        search={search}
        handleAddVariantClick={handleAddVariantClick}
        handleCancelAddVariant={handleCancelAddVariant}
        deleteErrors={deleteErrors}
        variantDeleteErrors={variantDeleteErrors}
      />

      <Pagination meta={meta} setPage={setPage} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This action cannot be undone."
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={
          pendingDelete?.kind === "ingredient"
            ? deleteIngredientMutation.isPending
            : deleteVariantMutation.isPending
        }
      />
    </Box>
  );
}
