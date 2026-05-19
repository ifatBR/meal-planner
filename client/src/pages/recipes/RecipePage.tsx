import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Flex, Spinner, Textarea } from "@chakra-ui/react";
import type {
  RecipeResponse,
  MealTypeResponse,
  DishTypeResponse,
} from "@app/types";
import { fetchRecipeById, updateRecipe, createRecipe } from "@/api/recipes";
import { fetchMealTypes } from "@/api/mealTypes";
import { fetchDishTypes } from "@/api/dishTypes";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { FormField } from "@/components/FormField";
import { LoadingError } from "@/components/LoadingError";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/utils/constants";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  FONTS,
  RADII,
  SPACING,
} from "@/styles/designTokens";
import { TagField, type TagItem } from "./RecipePageComponents/TagField";
import {
  IngredientsField,
  type FormIngredient,
} from "./RecipePageComponents/IngredientsField";

// ── Page shell ──────────────────────────────────────────────────────────────

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage =
    (location.state as { fromPage?: number } | null)?.fromPage ?? 1;

  const recipeQuery = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetchRecipeById(id!),
    enabled: !!id,
  });

  const mealTypesQuery = useQuery({
    queryKey: ["meal-types"],
    queryFn: fetchMealTypes,
  });

  const dishTypesQuery = useQuery({
    queryKey: ["dish-types"],
    queryFn: fetchDishTypes,
  });

  const isLoading =
    (!isCreate && recipeQuery.isLoading) ||
    mealTypesQuery.isLoading ||
    dishTypesQuery.isLoading;
  const isError =
    (!isCreate && recipeQuery.isError) ||
    mealTypesQuery.isError ||
    dishTypesQuery.isError;

  const refetchAll = () => {
    recipeQuery.refetch();
    mealTypesQuery.refetch();
    dishTypesQuery.refetch();
  };

  if (isLoading) {
    return (
      <Flex justify="center" pt={SPACING[8]}>
        <Spinner />
      </Flex>
    );
  }

  if (
    isError ||
    (!isCreate && !recipeQuery.data) ||
    !mealTypesQuery.data ||
    !dishTypesQuery.data
  ) {
    return (
      <LoadingError message="Failed to load recipe." onClick={refetchAll} />
    );
  }

  return (
    <RecipeForm
      recipe={recipeQuery.data ?? null}
      allMealTypes={mealTypesQuery.data}
      allDishTypes={dishTypesQuery.data}
      onBack={() =>
        navigate(ROUTES.LIBRARY, {
          state: { activeTab: 3, recipesPage: fromPage },
        })
      }
    />
  );
}

// ── Form ────────────────────────────────────────────────────────────────────

interface RecipeFormProps {
  recipe: RecipeResponse | null;
  allMealTypes: MealTypeResponse[];
  allDishTypes: DishTypeResponse[];
  onBack: () => void;
}

function RecipeForm({
  recipe,
  allMealTypes,
  allDishTypes,
  onBack,
}: RecipeFormProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Form state
  const mealTypeColorMap = new Map(allMealTypes.map((m) => [m.id, m.color]));
  const [formName, setFormName] = useState(recipe?.name ?? "");
  const [formMealTypes, setFormMealTypes] = useState<TagItem[]>(
    recipe
      ? recipe.mealTypes.map((m) => ({
          ...m,
          color: mealTypeColorMap.get(m.id),
        }))
      : [],
  );
  const [formDishTypes, setFormDishTypes] = useState<TagItem[]>(
    recipe?.dishTypes ?? [],
  );
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>(
    recipe
      ? recipe.ingredients.map((ri) => ({
          id: ri.id,
          displayName: ri.displayName,
          isMain: ri.isMain,
          measure: ri.measure,
        }))
      : [],
  );
  const [formInstructions, setFormInstructions] = useState(
    recipe?.instructions ?? "",
  );

  // Field errors
  const [nameError, setNameError] = useState("");
  const [mealTypesError, setMealTypesError] = useState("");
  const [dishTypesError, setDishTypesError] = useState("");
  const [ingredientsError, setIngredientsError] = useState("");
  const [mealTypesConflict, setMealTypesConflict] = useState("");
  const [dishTypesConflict, setDishTypesConflict] = useState("");

  const resetForm = () => {
    setFormName(recipe?.name ?? "");
    setFormMealTypes(recipe?.mealTypes ?? []);
    setFormDishTypes(recipe?.dishTypes ?? []);
    setFormIngredients(
      recipe
        ? recipe.ingredients.map((ri) => ({
            id: ri.id,
            displayName: ri.displayName,
            isMain: ri.isMain,
            measure: ri.measure,
          }))
        : [],
    );
    setFormInstructions(recipe?.instructions ?? "");
    setNameError("");
    setMealTypesError("");
    setDishTypesError("");
    setIngredientsError("");
    setMealTypesConflict("");
    setDishTypesConflict("");
  };

  const validate = (): boolean => {
    let valid = true;

    if (!formName.trim()) {
      setNameError("Name is required.");
      valid = false;
    } else {
      setNameError("");
    }

    if (formMealTypes.length === 0) {
      setMealTypesError("At least one meal type is required.");
      valid = false;
    } else {
      setMealTypesError("");
    }

    if (formDishTypes.length === 0) {
      setDishTypesError("At least one dish type is required.");
      valid = false;
    } else {
      setDishTypesError("");
    }

    if (formIngredients.length === 0) {
      setIngredientsError("At least one ingredient is required.");
      valid = false;
    } else if (!formIngredients.some((i) => i.isMain)) {
      setIngredientsError("Exactly one ingredient must be marked as main.");
      valid = false;
    } else {
      setIngredientsError("");
    }

    return valid;
  };

  const buildIngredients = () =>
    formIngredients.map((i) => ({
      id: i.id,
      isMain: i.isMain,
      ...(i.measure ? { measure: i.measure } : {}),
    }));

  const buildPatch = (existing: RecipeResponse) => {
    const patch: Record<string, unknown> = {};

    if (formName.trim() !== existing.name) patch.name = formName.trim();

    const origInstructions = existing.instructions ?? "";
    if (formInstructions !== origInstructions)
      patch.instructions = formInstructions || null;

    const origMealIds = existing.mealTypes
      .map((m) => m.id)
      .sort()
      .join(",");
    const formMealIds = formMealTypes
      .map((m) => m.id)
      .sort()
      .join(",");
    if (origMealIds !== formMealIds)
      patch.mealTypeIds = formMealTypes.map((m) => m.id);

    const origDishIds = existing.dishTypes
      .map((d) => d.id)
      .sort()
      .join(",");
    const formDishIds = formDishTypes
      .map((d) => d.id)
      .sort()
      .join(",");
    if (origDishIds !== formDishIds)
      patch.dishTypeIds = formDishTypes.map((d) => d.id);

    const origIngStr = JSON.stringify(
      existing.ingredients
        .map((i) => ({ id: i.id, isMain: i.isMain }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
    const formIngStr = JSON.stringify(
      formIngredients
        .map((i) => ({ id: i.id, isMain: i.isMain }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
    if (origIngStr !== formIngStr) patch.ingredients = buildIngredients();

    return Object.keys(patch).length > 0 ? patch : null;
  };

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      recipe
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateRecipe(recipe.id, body as any)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createRecipe(body as any),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      if (recipe)
        queryClient.invalidateQueries({ queryKey: ["recipe", saved.id] });
      toast.success(recipe ? "Recipe saved." : "Recipe created.");
      onBack();
    },
    onError: (err: {
      statusCode?: number;
      error?: string;
      message?: string;
      affected_schedules?: { scheduleName: string }[];
    }) => {
      if (err?.error === "recipe") {
        setNameError("A recipe with this name already exists.");
      } else if (err?.error === "recipe_dish_type_conflict") {
        const names = (err.affected_schedules ?? [])
          .map((s) => s.scheduleName)
          .join(", ");
        setDishTypesConflict(`Can't update — used in: ${names}`);
      } else if (err?.error === "recipe_meal_type_conflict") {
        const names = (err.affected_schedules ?? [])
          .map((s) => s.scheduleName)
          .join(", ");
        setMealTypesConflict(`Can't update — used in: ${names}`);
      } else {
        toast.error("Failed to save recipe. Please try again.");
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    if (recipe) {
      const patch = buildPatch(recipe);
      if (!patch) {
        onBack();
        return;
      }
      saveMutation.mutate(patch);
    } else {
      saveMutation.mutate({
        name: formName.trim(),
        mealTypeIds: formMealTypes.map((m) => m.id),
        dishTypeIds: formDishTypes.map((d) => d.id),
        ingredients: buildIngredients(),
        ...(formInstructions.trim() ? { instructions: formInstructions } : {}),
      });
    }
  };

  const handleDiscard = () => {
    resetForm();
    onBack();
  };

  return (
    <Box maxW="680px" pb={SPACING[12]}>
      {/* Form fields */}
      <Flex direction="column" gap={SPACING[6]}>
        {/* Name — styled as page title */}
        <FormField label="Recipe Name" required error={nameError}>
          <Input
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value);
              if (nameError) setNameError("");
            }}
            placeholder="Recipe name"
            isError={!!nameError}
            style={{
              fontSize: FONT_SIZES["2xl"],
              fontWeight: String(FONT_WEIGHTS.semibold),
              fontFamily: FONTS.heading,
              border: "none",
              borderBottom: `2px solid ${nameError ? COLORS.input.borderError : COLORS.border.default}`,
              borderRadius: "0",
              padding: `${SPACING[1]} 0`,
              backgroundColor: "transparent",
            }}
          />
        </FormField>

        {/* Meal types */}
        <FormField label="Meal types" required error={mealTypesError}>
          <TagField
            allItems={allMealTypes}
            selected={formMealTypes}
            onChange={(next) => {
              setFormMealTypes(next);
              if (mealTypesError) setMealTypesError("");
              if (mealTypesConflict) setMealTypesConflict("");
            }}
            conflictError={mealTypesConflict}
          />
        </FormField>

        {/* Dish types */}
        <FormField label="Dish types" required error={dishTypesError}>
          <TagField
            allItems={allDishTypes}
            selected={formDishTypes}
            onChange={(next) => {
              setFormDishTypes(next);
              if (dishTypesError) setDishTypesError("");
              if (dishTypesConflict) setDishTypesConflict("");
            }}
            conflictError={dishTypesConflict}
          />
        </FormField>

        {/* Ingredients */}
        <FormField label="Ingredients" required error={ingredientsError}>
          <IngredientsField
            value={formIngredients}
            onChange={(next) => {
              setFormIngredients(next);
              if (ingredientsError) setIngredientsError("");
            }}
          />
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <Textarea
            value={formInstructions}
            onChange={(e) => setFormInstructions(e.target.value)}
            placeholder="Add a description…"
            rows={4}
            bg={COLORS.input.bg}
            border={`1px solid ${COLORS.input.border}`}
            borderRadius={RADII.md}
            color={COLORS.input.color}
            fontFamily={FONTS.body}
            fontSize={FONT_SIZES.base}
            py={SPACING[2]}
            px={SPACING[3]}
            outline="none"
            w="100%"
            resize="vertical"
          />
        </FormField>
      </Flex>

      {/* Action bar */}
      <Flex gap={SPACING[3]} mt={SPACING[8]}>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saveMutation.isPending}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          onClick={handleDiscard}
          disabled={saveMutation.isPending}
        >
          Discard
        </Button>
      </Flex>
    </Box>
  );
}
