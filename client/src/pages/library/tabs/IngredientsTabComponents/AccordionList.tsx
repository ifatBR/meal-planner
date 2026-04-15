import { Button } from "@/components/Button";
import { EditableListItem } from "@/components/EditableListItem";
import { HighlightedText } from "@/components/HighlightedText";
import { InlineEditInput } from "@/components/InlineEditInput";
import { BodyText, Caption } from "@/components/Typography";
import {
  COLORS,
  FONT_WEIGHTS,
  ICON_SIZES,
  RADII,
  SPACING,
} from "@/styles/designTokens";
import { capitalizeFirst } from "@/utils/text";
import { IngredientResponse } from "@app/types";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemIndicator,
  AccordionItemTrigger,
  AccordionRoot,
  Box,
  Flex,
} from "@chakra-ui/react";
import { Circle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface AccordionListProps {
  ingredients: IngredientResponse[];
  expandedItems: string[];
  setExpandedItems: (expandedItems: string[]) => void;
  addingVariantFor: string | null;
  setHoveredIngredient: (id: string | null) => void;
  hoveredIngredient: string | null;
  updateIngredientMutation: { mutate: any };
  deleteIngredientMutation: { mutate: any };
  updateVariantMutation: { mutate: any };
  deleteVariantMutation: { mutate: any };
  addVariantMutation: { mutate: any };
  search: string;
  handleAddVariantClick: (id: string) => void;
  handleCancelAddVariant: (ingredient: IngredientResponse) => void;
  deleteErrors: Record<string, string>;
  variantDeleteErrors: Record<string, string>;
}

export function AccordionList({
  ingredients,
  expandedItems,
  setExpandedItems,
  addingVariantFor,
  setHoveredIngredient,
  hoveredIngredient,
  updateIngredientMutation,
  deleteIngredientMutation,
  updateVariantMutation,
  deleteVariantMutation,
  addVariantMutation,
  search,
  handleAddVariantClick,
  handleCancelAddVariant,
  deleteErrors,
  variantDeleteErrors,
}: AccordionListProps) {
  const [editingIngredient, setEditingIngredient] = useState<string | null>(
    null,
  );

  return (
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
          <AccordionItem
            key={ingredient.id}
            value={ingredient.id}
            border="none"
          >
            {/* Trigger row */}
            <Flex
              align="center"
              onMouseEnter={() => setHoveredIngredient(ingredient.id)}
              onMouseLeave={() => setHoveredIngredient(null)}
              _hover={{ bg: COLORS.highlight.secondary }}
              borderRadius={RADII.md}
              px={SPACING[1]}
              py={SPACING[2]}
            >
              <AccordionItemTrigger
                flex={1}
                cursor={hasVariants ? "pointer" : "default"}
              >
                {hasVariants ? (
                  <AccordionItemIndicator
                    data-testid={`accordion-indicator-${ingredient.id}`}
                  />
                ) : (
                  <Box px={SPACING[1]}>
                    <Circle size={ICON_SIZES.xxs} />
                  </Box>
                )}

                {isEditing ? (
                  <Box flex={1} onClick={(e) => e.stopPropagation()}>
                    <InlineEditInput
                      value={capitalizeFirst(ingredient.name)}
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
                    fontWeight={FONT_WEIGHTS.bold}
                    cursor="text"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIngredient(ingredient.id);
                    }}
                  >
                    <HighlightedText
                      text={capitalizeFirst(ingredient.name)}
                      query={search}
                    />
                  </Box>
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
                  aria-label={`Add variant to ${capitalizeFirst(ingredient.name)}`}
                  tooltip={`Add variant to ${capitalizeFirst(ingredient.name)}`}
                  onClick={() => handleAddVariantClick(ingredient.id)}
                >
                  <Plus size={ICON_SIZES.sm} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${capitalizeFirst(ingredient.name)}`}
                  tooltip={
                    hasVariants
                      ? "Ingredient with variants can't be deleted"
                      : `Delete ${capitalizeFirst(ingredient.name)}`
                  }
                  onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                  disabled={hasVariants}
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
              <AccordionItemContent px={SPACING[5]}>
                <Box px={SPACING[3]} pt={SPACING[2]} pb={SPACING[1]}>
                  <Caption>Variants:</Caption>
                </Box>

                <Box px={SPACING[1]}>
                  {ingredient.ingredient_variants.map((v) => (
                    <EditableListItem
                      key={v.id}
                      name={capitalizeFirst(v.variant)}
                      hoverColors={{ bg: COLORS.highlight.tertiary }}
                      nameDisplay={
                        <BodyText>
                          <HighlightedText
                            text={capitalizeFirst(v.variant)}
                            query={search}
                          />
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
                </Box>
              </AccordionItemContent>
            )}
          </AccordionItem>
        );
      })}
    </AccordionRoot>
  );
}
