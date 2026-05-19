import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import { fetchRecipes, deleteRecipe } from "@/api/recipes";
import { ROUTES } from "@/utils/constants";
import { ActionListItem } from "@/components/ActionListItem";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/useToast";
import { LoadingError } from "@/components/LoadingError";
import { Pagination } from "@/components/Pagination";
import { SIDEBAR, SPACING } from "@/styles/designTokens";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface RecipesTabProps {
  initialPage?: number;
}

export function RecipesTab({ initialPage = 1 }: RecipesTabProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(initialPage);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["recipes", page],
    queryFn: () => fetchRecipes(page),
  });

  const handleRecipeView = (_id: string) => {
    // TODO: open recipe read-only view
  };

  const handleRecipeEdit = (id: string) => {
    navigate(ROUTES.RECIPE_DETAIL(id), { state: { fromPage: page } });
  };

  const handleAddRecipe = () => {
    // TODO: navigate to recipe creation
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: (_data, id) => {
      setPendingDelete(null);
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      setPendingDelete(null);
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
          <ActionListItem
            key={recipe.id}
            name={recipe.name}
            onView={() => handleRecipeView(recipe.id)}
            onEdit={() => handleRecipeEdit(recipe.id)}
            onDelete={() => setPendingDelete({ id: recipe.id, name: recipe.name })}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This action cannot be undone."
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        isLoading={deleteMutation.isPending}
      />
    </Box>
  );
}
