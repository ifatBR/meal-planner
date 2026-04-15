import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemIndicator,
  AccordionItemTrigger,
  AccordionRoot,
  Box,
  Flex,
  Spinner,
} from "@chakra-ui/react";
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
import { SearchInput } from "@/components/SearchInput";
import { BodyText, Caption } from "@/components/Typography";
import { useToast } from "@/hooks/useToast";
import {
  COLORS,
  FONT_WEIGHTS,
  ICON_SIZES,
  SPACING,
} from "@/styles/designTokens";

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

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(
    null,
  );
  const [editingIngredient, setEditingIngredient] = useState<string | null>(
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

  const ingredients = data?.items ?? [];
  const meta = data?.meta;

  // Auto-expand items whose variants match the search query
  useEffect(() => {
    if (!search || !ingredients.length) return;
    const matched = ingredients
      .filter((ing) =>
        ing.ingredient_variants.some((v) =>
          v.variant.toLowerCase().includes(search.toLowerCase()),
        ),
      )
      .map((ing) => ing.id);
    if (matched.length > 0) {
      setExpandedItems((prev) => Array.from(new Set([...prev, ...matched])));
    }
  }, [search, ingredients]);

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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddVariantClick = (ingredientId: string) => {
    setAddingVariantFor(ingredientId);
    setExpandedItems((prev) =>
      prev.includes(ingredientId) ? prev : [...prev, ingredientId],
    );
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

  // ── Empty state ───────────────────────────────────────────────────────────

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

      {/* Accordion list */}
      <AccordionRoot
        multiple
        collapsible
        value={expandedItems}
        onValueChange={(e) => setExpandedItems(e.value)}
        mt={SPACING[2]}
      >
        {ingredients.map((ingredient: IngredientResponse) => {
          const hasVariants = ingredient.ingredient_variants.length > 0;
          const isAddingHere = addingVariantFor === ingredient.id;
          const isHovered = hoveredIngredient === ingredient.id;
          const isEditing = editingIngredient === ingredient.id;

          return (
            <AccordionItem key={ingredient.id} value={ingredient.id}>
              {/* Trigger row */}
              <Flex
                align="center"
                onMouseEnter={() => setHoveredIngredient(ingredient.id)}
                onMouseLeave={() => setHoveredIngredient(null)}
              >
                <AccordionItemTrigger
                  flex={1}
                  cursor={hasVariants ? "pointer" : "default"}
                >
                  {isEditing ? (
                    <Box flex={1} onClick={(e) => e.stopPropagation()}>
                      <InlineEditInput
                        value={ingredient.name}
                        onSave={(name) => {
                          updateIngredientMutation.mutate({
                            id: ingredient.id,
                            name,
                          });
                          setEditingIngredient(null);
                        }}
                        onCancel={() => setEditingIngredient(null)}
                      />
                    </Box>
                  ) : (
                    <Box
                      flex={1}
                      textAlign="left"
                      fontWeight={FONT_WEIGHTS.medium}
                      cursor="text"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIngredient(ingredient.id);
                      }}
                    >
                      <HighlightedText text={ingredient.name} query={search} />
                    </Box>
                  )}

                  {hasVariants && (
                    <AccordionItemIndicator
                      data-testid={`accordion-indicator-${ingredient.id}`}
                    />
                  )}
                </AccordionItemTrigger>

                {/* Hover action buttons — outside the trigger to avoid nested buttons */}
                <Flex
                  opacity={isHovered && !isEditing ? 1 : 0}
                  transition="opacity 0.15s ease"
                  gap={SPACING[1]}
                  flexShrink={0}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Add variant to ${ingredient.name}`}
                    onClick={() => handleAddVariantClick(ingredient.id)}
                  >
                    <Plus size={ICON_SIZES.sm} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${ingredient.name}`}
                    onClick={() =>
                      deleteIngredientMutation.mutate(ingredient.id)
                    }
                  >
                    <Trash2 size={ICON_SIZES.sm} />
                  </Button>
                </Flex>
              </Flex>

              {/* Inline delete error */}
              {deleteErrors[ingredient.id] && (
                <Box px={SPACING[3]} pb={SPACING[1]}>
                  <BodyText secondary>{deleteErrors[ingredient.id]}</BodyText>
                </Box>
              )}

              {/* Content — only rendered when there's something to show */}
              {(hasVariants || isAddingHere) && (
                <AccordionItemContent>
                  <Box px={SPACING[3]} pt={SPACING[2]} pb={SPACING[1]}>
                    <Caption>Variants</Caption>
                  </Box>

                  {ingredient.ingredient_variants.map((v) => (
                    <EditableListItem
                      key={v.id}
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
                  ))}

                  {isAddingHere && (
                    <Box px={SPACING[3]} py={SPACING[1]}>
                      <InlineEditInput
                        value=""
                        placeholder="Variant name"
                        onSave={(variant) =>
                          addVariantMutation.mutate({
                            ingredientId: ingredient.id,
                            variant,
                          })
                        }
                        onCancel={() => handleCancelAddVariant(ingredient)}
                      />
                    </Box>
                  )}
                </AccordionItemContent>
              )}
            </AccordionItem>
          );
        })}
      </AccordionRoot>

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
