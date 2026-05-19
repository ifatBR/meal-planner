import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flex, Spinner } from "@chakra-ui/react";
import { fetchLayouts, deleteLayout } from "@/api/layouts";
import { ActionListItem } from "@/components/ActionListItem";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/useToast";
import { LoadingError } from "@/components/LoadingError";
import { SPACING } from "@/styles/designTokens";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function LayoutsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const {
    data: layouts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["layouts"],
    queryFn: fetchLayouts,
  });

  const handleLayoutView = (_id: string) => {
    // TODO: open layout read-only view
  };

  const handleLayoutEdit = (_id: string) => {
    // TODO: navigate to layout detail
  };

  const handleAddLayout = () => {
    // TODO: navigate to layout creation
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLayout(id),
    onSuccess: (_data, id) => {
      setPendingDelete(null);
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
    },
    onError: (err: { statusCode?: number; message?: string }, id) => {
      setPendingDelete(null);
      if (err?.statusCode === 409) {
        setDeleteErrors((prev) => ({
          ...prev,
          [id]:
            err.message ??
            "This layout is used in an active schedule and cannot be deleted.",
        }));
      } else {
        toast.error("Failed to delete layout. Please try again.");
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
        message="Failed to load layouts."
        onClick={() => refetch()}
      />
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!layouts?.length) {
    return (
      <EmptyState
        title="No layouts yet."
        description="Layouts define the meal structure for your week — which meal types appear on which days and how many dishes each slot requires. Add your first layout to start building schedules."
        action={{ label: "Add your first layout", onClick: handleAddLayout }}
      />
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <Flex direction="column" gap={SPACING[1]} pt={SPACING[4]}>
      {layouts.map((layout) => (
        <ActionListItem
          key={layout.id}
          name={layout.name}
          onView={() => handleLayoutView(layout.id)}
          onEdit={() => handleLayoutEdit(layout.id)}
          onDelete={() => setPendingDelete({ id: layout.id, name: layout.name })}
          inlineError={deleteErrors[layout.id]}
        />
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This action cannot be undone."
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        isLoading={deleteMutation.isPending}
      />
    </Flex>
  );
}
