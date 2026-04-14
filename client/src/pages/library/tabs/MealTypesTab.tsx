import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import type { MealTypeResponse } from "@app/types";
import {
  fetchMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from "@/api/mealTypes";
import { Button } from "@/components/Button";
import { EditableListItem } from "@/components/EditableListItem";
import { InlineEditInput } from "@/components/InlineEditInput";
import { BodyText } from "@/components/Typography";
import { useToast } from "@/hooks/useToast";
import { MEAL_TYPE_COLORS } from "@/utils/constants";
import { RADII, SPACING } from "@/styles/designTokens";

export function MealTypesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [addingNew, setAddingNew] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const {
    data: mealTypes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["meal-types"],
    queryFn: fetchMealTypes,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateMealType(id, { name }),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["meal-types"] });
      const previous = queryClient.getQueryData<MealTypeResponse[]>([
        "meal-types",
      ]);
      queryClient.setQueryData<MealTypeResponse[]>(
        ["meal-types"],
        (old) => old?.map((mt) => (mt.id === id ? { ...mt, name } : mt)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["meal-types"], context.previous);
      }
      toast.error("Failed to update meal type. Please try again.");
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["meal-types"] }),
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string; color: string }) =>
      createMealType(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-types"] });
      setAddingNew(false);
    },
    onError: () => {
      toast.error("Failed to create meal type. Please try again.");
      setAddingNew(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMealType(id),
    onSuccess: (_data, id) => {
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["meal-types"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      if (err?.statusCode === 409) {
        setDeleteErrors((prev) => ({
          ...prev,
          [id]:
            err.message ??
            "This meal type is used in a layout and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete meal type. Please try again.");
      }
    },
  });

  const handleSave = (id: string, name: string) => {
    updateMutation.mutate({ id, name });
  };

  const handleCreate = (name: string) => {
    const color =
      MEAL_TYPE_COLORS[(mealTypes?.length ?? 0) % MEAL_TYPE_COLORS.length];
    createMutation.mutate({ name, color });
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
      <Flex
        direction="column"
        align="flex-start"
        gap={SPACING[3]}
        pt={SPACING[6]}
      >
        <BodyText secondary>Failed to load meal types.</BodyText>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </Flex>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!mealTypes?.length && !addingNew) {
    return (
      <Flex
        direction="column"
        align="flex-start"
        gap={SPACING[4]}
        pt={SPACING[6]}
      >
        <BodyText>No meal types yet.</BodyText>
        <BodyText secondary>
          Meal types define when meals are served — for example Breakfast,
          Lunch, and Dinner. They are used when building layouts and generating
          schedules.
        </BodyText>
        <Button variant="primary" size="sm" onClick={() => setAddingNew(true)}>
          Add your first meal type
        </Button>
      </Flex>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <Flex direction="column" gap={SPACING[1]} pt={SPACING[4]}>
      {mealTypes?.map((mt) => (
        <EditableListItem
          key={mt.id}
          name={mt.name}
          color={mt.color}
          onSave={(name) => handleSave(mt.id, name)}
          onDelete={() => deleteMutation.mutate(mt.id)}
          inlineError={deleteErrors[mt.id]}
        />
      ))}

      {addingNew && (
        <Flex align="center" gap={SPACING[3]} px={SPACING[3]} py={SPACING[2]}>
          <Box
            w="10px"
            h="10px"
            borderRadius={RADII.full}
            bg={
              MEAL_TYPE_COLORS[
                (mealTypes?.length ?? 0) % MEAL_TYPE_COLORS.length
              ]
            }
            flexShrink={0}
          />
          <Box flex={1}>
            <InlineEditInput
              value=""
              onSave={handleCreate}
              onCancel={() => setAddingNew(false)}
            />
          </Box>
        </Flex>
      )}

      {!addingNew && (
        <Box pt={SPACING[2]} px={SPACING[3]}>
          <Button variant="ghost" size="sm" onClick={() => setAddingNew(true)}>
            + Add meal type
          </Button>
        </Box>
      )}
    </Flex>
  );
}
