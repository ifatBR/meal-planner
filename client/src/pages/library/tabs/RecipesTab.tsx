import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import { fetchRecipes, deleteRecipe } from "@/api/recipes";
import { ROUTES } from "@/utils/constants";
import { ClickableListItem } from "@/components/ClickableListItem";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/useToast";
import { LoadingError } from "@/components/LoadingError";
import { Pagination } from "@/components/Pagination";
import { SIDEBAR, SPACING } from "@/styles/designTokens";

interface RecipesTabProps {
  initialPage?: number;
}

export function RecipesTab({ initialPage = 1 }: RecipesTabProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(initialPage);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["recipes", page],
    queryFn: () => fetchRecipes(page),
  });

  const handleRecipeClick = (id: string) => {
    navigate(ROUTES.RECIPE_DETAIL(id), { state: { fromPage: page } });
  };

  const handleAddRecipe = () => {
    // TODO: navigate to recipe creation
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: (_data, id) => {
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      if (err?.statusCode === 409) {
        setDeleteErrors((prev) => ({
          ...prev,
          [id]:
            err.message ??
            "This recipe is used in an active schedule and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete recipe. Please try again.");
      }
    },
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Flex justify="center" pt={SPACING[8]}>
        <Spinner />
      </Flex>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <LoadingError
        message="Failed to load recipes."
        onClick={() => refetch()}
      />
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!data?.items.length) {
    return (
      <EmptyState
        title="No recipes yet."
        description="Recipes are the dishes that fill your meal schedule. Add your first recipe to get started."
        action={{ label: "Add your first recipe", onClick: handleAddRecipe }}
      />
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <Box pt={SPACING[4]} pb={SPACING[12]}>
      <Flex direction="column" gap={SPACING[1]}>
        {data.items.map((recipe) => (
          <ClickableListItem
            key={recipe.id}
            name={recipe.name}
            onClick={() => handleRecipeClick(recipe.id)}
            onDelete={() => deleteMutation.mutate(recipe.id)}
            inlineError={deleteErrors[recipe.id]}
          />
        ))}
      </Flex>
      <Box
        position="fixed"
        bottom={SPACING[5]}
        left={`calc(${SIDEBAR.widthExpanded} + ${SPACING[6]})`}
      >
        <Pagination meta={data.meta} setPage={setPage} />
      </Box>
    </Box>
  );
}
