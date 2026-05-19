import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import type { DishTypeResponse } from "@app/types";
import {
  fetchDishTypes,
  createDishType,
  updateDishType,
  deleteDishType,
} from "@/api/dishTypes";
import { Button } from "@/components/Button";
import { EditableListItem } from "@/components/EditableListItem";
import { InlineEditInput } from "@/components/InlineEditInput";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/useToast";
import { SectionTitle } from "@/components/Typography";
import { COLORS, MAX_WIDTHS, SPACING } from "@/styles/designTokens";
import { LoadingError } from "@/components/LoadingError";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function DishTypesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [addingNew, setAddingNew] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const {
    data: dishTypes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dish-types"],
    queryFn: fetchDishTypes,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateDishType(id, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["dish-types"] });
      const previous = queryClient.getQueryData<DishTypeResponse[]>([
        "dish-types",
      ]);
      queryClient.setQueryData<DishTypeResponse[]>(
        ["dish-types"],
        (old) => old?.map((dt) => (dt.id === id ? { ...dt, name } : dt)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["dish-types"], context.previous);
      }
      toast.error("Failed to update dish type. Please try again.");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["dish-types"] }),
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string }) => createDishType(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dish-types"] });
      setAddingNew(false);
    },
    onError: () => {
      toast.error("Failed to create dish type. Please try again.");
      setAddingNew(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDishType(id),
    onSuccess: (_data, id) => {
      setPendingDelete(null);
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["dish-types"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      setPendingDelete(null);
      if (err?.statusCode === 409) {
        setDeleteErrors((prev) => ({
          ...prev,
          [id]:
            err.message ??
            "This dish type is used in a recipe or meal slot and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete dish type. Please try again.");
      }
    },
  });

  const handleSave = (id: string, name: string) => {
    updateMutation.mutate({ id, name });
  };

  const handleCreate = (name: string) => {
    createMutation.mutate({ name });
  };

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
        message={"Failed to load dish types."}
        onClick={() => refetch()}
      />
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!dishTypes?.length && !addingNew) {
    return (
      <EmptyState
        title="No dish types yet."
        description="Dish types categorise what kind of food a recipe is — for example Salad, Soup, Main Course, or Dessert. They help organise your recipes and are used when building layouts."
        action={{
          label: "Add your first dish type",
          onClick: () => setAddingNew(true),
        }}
      />
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <Flex
      direction="column"
      gap={SPACING[1]}
      pt={SPACING[4]}
      maxW={MAX_WIDTHS.listItem}
    >
      <Box mb={SPACING[3]}>
        <SectionTitle>Dish types</SectionTitle>
      </Box>
      {addingNew ? (
        <Flex align="center" gap={SPACING[3]} px={SPACING[3]} py={SPACING[2]}>
          <Box flex={1}>
            <InlineEditInput
              value=""
              placeholder="New Dish-type name"
              onSave={handleCreate}
              onCancel={() => setAddingNew(false)}
            />
          </Box>
        </Flex>
      ) : (
        <Box pt={SPACING[2]} px={SPACING[3]}>
          <Button variant="ghost" size="sm" onClick={() => setAddingNew(true)}>
            + Add dish type
          </Button>
        </Box>
      )}

      {dishTypes?.map((dt) => (
        <EditableListItem
          key={dt.id}
          name={dt.name}
          color={COLORS.primary.default}
          onSave={(name) => handleSave(dt.id, name)}
          onDelete={() => setPendingDelete({ id: dt.id, name: dt.name })}
          inlineError={deleteErrors[dt.id]}
        />
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This action cannot be undone."
        onClose={() => setPendingDelete(null)}
        onConfirm={() =>
          pendingDelete && deleteMutation.mutate(pendingDelete.id)
        }
        isLoading={deleteMutation.isPending}
      />
    </Flex>
  );
}
