import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { EditableListItem } from "@/components/EditableListItem";
import { InlineEditInput } from "@/components/InlineEditInput";
import { Input } from "@/components/Input";
import { BodyText, SectionTitle } from "@/components/Typography";
import { useToast } from "@/hooks/useToast";
import { COLORS, FONT_SIZES, ICON_SIZES, SPACING } from "@/styles/designTokens";
import { Tooltip } from "@/components/ui/tooltip";

// ── Highlight helper ────────────────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box as="span" bg={COLORS.highlight.default}>
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function IngredientsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredientError, setNewIngredientError] = useState<string | null>(
    null,
  );

  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [variantDeleteErrors, setVariantDeleteErrors] = useState<
    Record<string, string>
  >({});

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
  });

  const ingredients = data?.items ?? [];
  const meta = data?.meta;

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
                ingredients: old.items.map((ing) =>
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
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
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
                ingredients: old.items.map((ing) =>
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
      <Flex
        direction="column"
        align="flex-start"
        gap={SPACING[3]}
        pt={SPACING[6]}
      >
        <BodyText secondary>Failed to load ingredients.</BodyText>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </Flex>
    );
  }

  // ── Empty state (no ingredients at all) ───────────────────────────────────

  if (!search && !ingredients.length && !addingIngredient) {
    return (
      <Flex
        direction="column"
        align="flex-start"
        gap={SPACING[4]}
        pt={SPACING[6]}
      >
        <BodyText>No ingredients yet.</BodyText>
        <BodyText secondary>
          Ingredients are the building blocks of your recipes. Add them here and
          use them when creating recipes.
        </BodyText>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setAddingIngredient(true)}
        >
          Add your first ingredient
        </Button>
      </Flex>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  return (
    <Box maxW="600px" pt={SPACING[4]}>
      {/* Search */}
      <Flex align="center" gap={SPACING[2]} mb={SPACING[4]}>
        <Box color={COLORS.text.tertiary} flexShrink={0}>
          <Search size={16} />
        </Box>
        <Box flex={1}>
          <Input
            placeholder="Search ingredients…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </Box>
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
      </Flex>

      {/* No results */}
      {search && !ingredients.length && (
        <BodyText secondary>No ingredients match "{search}".</BodyText>
      )}

      {/* Grouped ingredient list */}
      <Flex direction="column" gap={SPACING[2]}>
        {ingredients.map((ingredient: IngredientResponse) => (
          <Box
            key={ingredient.id}
            onMouseEnter={() => setHoveredGroup(ingredient.id)}
            onMouseLeave={() => {
              setHoveredGroup(null);
            }}
          >
            {/* Parent row */}
            <EditableListItem
              name={ingredient.name}
              nameDisplay={
                <SectionTitle>
                  <HighlightedText text={ingredient.name} query={search} />
                </SectionTitle>
              }
              addButtonProps={{
                tooltip: `Add variant to ${ingredient.name}`,
                onClick: () => setAddingVariantFor(ingredient.id),
              }}
              onSave={(name) =>
                updateIngredientMutation.mutate({ id: ingredient.id, name })
              }
              onDelete={() => deleteIngredientMutation.mutate(ingredient.id)}
              inlineError={deleteErrors[ingredient.id]}
            />
            {/* Variant rows */}
            {ingredient.ingredient_variants.map((v) => (
              <Box key={v.id} pl={SPACING[8]}>
                <EditableListItem
                  name={v.variant}
                  nameDisplay={
                    <BodyText>
                      <HighlightedText text={v.variant} query={search} />
                    </BodyText>
                  }
                  onSave={(variant) =>
                    updateVariantMutation.mutate({
                      ingredientId: ingredient.id,
                      variantId: v.id,
                      variant,
                    })
                  }
                  onDelete={() =>
                    deleteVariantMutation.mutate({
                      ingredientId: ingredient.id,
                      variantId: v.id,
                    })
                  }
                  inlineError={variantDeleteErrors[v.id]}
                />
              </Box>
            ))}

            {/* Add variant row */}
            {addingVariantFor === ingredient.id && (
              <Box pl={SPACING[8]} px={SPACING[3]} py={SPACING[1]}>
                <InlineEditInput
                  value=""
                  placeholder="Add variant"
                  onSave={(variant) =>
                    addVariantMutation.mutate({
                      ingredientId: ingredient.id,
                      variant,
                    })
                  }
                  onCancel={() => setAddingVariantFor(null)}
                />
              </Box>
            )}
          </Box>
        ))}
      </Flex>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <Flex align="center" gap={SPACING[3]} pt={SPACING[4]}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={meta.page === 1}
          >
            Previous
          </Button>
          <BodyText secondary>
            Page {meta.page} of {meta.totalPages}
          </BodyText>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={meta.page === meta.totalPages}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  );
}
