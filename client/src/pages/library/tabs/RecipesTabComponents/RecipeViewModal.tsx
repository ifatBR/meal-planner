import {
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Box,
  Flex,
  Portal,
  Spinner,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecipeById } from "@/api/recipes";
import { fetchMealTypes } from "@/api/mealTypes";
import { Button } from "@/components/Button";
import { BodyText, Caption } from "@/components/Typography";
import { LoadingError } from "@/components/LoadingError";
import {
  COLORS,
  ICON_SIZES,
  MODAL,
  RADII,
  SPACING,
} from "@/styles/designTokens";
import { capitalizeFirst } from "@/utils/text";
import { CircleFull } from "@/components/CircleFull";

interface RecipeViewModalProps {
  recipeId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export function RecipeViewModal({
  recipeId,
  onClose,
  onEdit,
}: RecipeViewModalProps) {
  const {
    data: recipe,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["recipe", recipeId],
    queryFn: () => fetchRecipeById(recipeId!),
    enabled: recipeId !== null,
  });

  const { data: allMealTypes } = useQuery({
    queryKey: ["meal-types"],
    queryFn: fetchMealTypes,
    enabled: recipeId !== null,
  });

  const mealTypeColorMap = new Map(
    (allMealTypes ?? []).map((mt) => [mt.id, mt.color]),
  );

  return (
    <DialogRoot
      open={recipeId !== null}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <DialogBackdrop />
      <Portal>
        <DialogPositioner>
          <DialogContent
            bg={COLORS.bg.base}
            w={MODAL.width}
            maxW={MODAL.maxWidth}
            h={MODAL.height}
            display="flex"
            flexDirection="column"
          >
            <DialogHeader flexShrink={0}>
              <Flex justify="space-between" align="center" w="100%">
                <DialogTitle>
                  {recipe ? capitalizeFirst(recipe.name) : ""}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close"
                  onClick={onClose}
                >
                  <X size={ICON_SIZES.sm} />
                </Button>
              </Flex>
            </DialogHeader>

            <DialogBody flex={1} overflowY="auto">
              {isLoading && (
                <Flex justify="center" pt={SPACING[8]}>
                  <Spinner />
                </Flex>
              )}

              {isError && (
                <LoadingError
                  message="Failed to load recipe."
                  onClick={() => refetch()}
                />
              )}

              {recipe && (
                <Flex direction="column" gap={SPACING[4]}>
                  <Box>
                    <Caption>Meal types</Caption>
                    <Flex gap={SPACING[2]} mt={SPACING[2]} flexWrap="wrap">
                      {recipe.mealTypes.map((mt) => {
                        const color =
                          mealTypeColorMap.get(mt.id) ?? COLORS.border.default;
                        return (
                          <Flex
                            key={mt.id}
                            align="center"
                            gap={SPACING[2]}
                            borderRadius={RADII.full}
                            px={SPACING[3]}
                            py={SPACING[1]}
                            border={`1px solid  ${COLORS.border.strong}`}
                          >
                            <CircleFull color={color} />
                            <BodyText>{capitalizeFirst(mt.name)}</BodyText>
                          </Flex>
                        );
                      })}
                    </Flex>
                  </Box>

                  <Box>
                    <Caption>Dish types</Caption>
                    <Flex gap={SPACING[2]} mt={SPACING[2]} flexWrap="wrap">
                      {recipe.dishTypes.map((dt) => (
                        <Flex
                          key={dt.id}
                          borderRadius={RADII.full}
                          px={SPACING[3]}
                          py={SPACING[1]}
                          border={`1px solid ${COLORS.border.strong}`}
                        >
                          <BodyText>{capitalizeFirst(dt.name)}</BodyText>
                        </Flex>
                      ))}
                    </Flex>
                  </Box>

                  <Box>
                    <Caption>Ingredients</Caption>
                    <Flex direction="column" gap={SPACING[1]} mt={SPACING[2]}>
                      {recipe.ingredients.map((ing) => (
                        <Flex key={ing.id} align="center" gap={SPACING[2]}>
                          <BodyText>
                            {capitalizeFirst(ing.displayName)}
                            {ing.measure &&
                              ` — ${ing.measure.amount} ${ing.measure.unit}`}
                          </BodyText>
                          {ing.isMain && <Caption>(main)</Caption>}
                        </Flex>
                      ))}
                    </Flex>
                  </Box>

                  {recipe.instructions && (
                    <Box>
                      <Caption>Instructions</Caption>
                      <Box mt={SPACING[2]}>
                        <BodyText>{recipe.instructions}</BodyText>
                      </Box>
                    </Box>
                  )}
                </Flex>
              )}
            </DialogBody>

            <DialogFooter flexShrink={0}>
              <Button
                variant="primary"
                onClick={() => recipeId && onEdit(recipeId)}
                disabled={!recipe}
              >
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
