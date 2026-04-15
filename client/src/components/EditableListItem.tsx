import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { BodyText } from "@/components/Typography";
import { InlineEditInput } from "@/components/InlineEditInput";
import { Tooltip } from "@/components/ui/tooltip";
import { COLORS, ICON_SIZES, RADII, SPACING } from "@/styles/designTokens";

interface EditableListItemProps {
  name: string;
  nameDisplay?: React.ReactNode;
  color?: string;
  onSave: (newValue: string) => void;
  onDelete: () => void;
  deleteBlocked?: boolean;
  deleteBlockedReason?: string;
  inlineError?: string;
  addButtonProps?: { tooltip: string; onClick?: () => void };
  hoverColors?: { bg?: string; color?: string };
}

export function EditableListItem({
  name,
  nameDisplay,
  color,
  onSave,
  onDelete,
  deleteBlocked = false,
  deleteBlockedReason,
  inlineError,
  addButtonProps,
  hoverColors,
}: EditableListItemProps) {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleSave = (newValue: string) => {
    setEditing(false);
    onSave(newValue);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  return (
    <Box>
      <Flex
        align="center"
        gap={SPACING[3]}
        px={SPACING[3]}
        py={SPACING[2]}
        borderRadius={RADII.sm}
        bg={hovered ? COLORS.bg.base : "transparent"}
        maxW="600px"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        transition="background-color 0.15s ease"
        _hover={hoverColors || { bg: COLORS.highlight.secondary }}
      >
        {color && (
          <Box
            w="10px"
            h="10px"
            borderRadius={RADII.full}
            bg={color}
            flexShrink={0}
          />
        )}

        <Box flex={1}>
          {editing ? (
            <InlineEditInput
              value={name}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <Box
              cursor="text"
              onClick={() => setEditing(true)}
              display="inline-block"
              w="100%"
            >
              {nameDisplay ?? <BodyText>{name}</BodyText>}
            </Box>
          )}
        </Box>

        <Box
          opacity={hovered ? 1 : 0}
          transition="opacity 0.15s ease"
          flexShrink={0}
        >
          {addButtonProps && (
            <Tooltip content={addButtonProps.tooltip}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={addButtonProps.tooltip}
                onClick={addButtonProps.onClick}
              >
                <Plus size={ICON_SIZES.xs} />
              </Button>
            </Tooltip>
          )}
          <Tooltip
            content={
              deleteBlocked && deleteBlockedReason
                ? deleteBlockedReason
                : "Delete"
            }
            positioning={{ placement: "top" }}
          >
            <Box
              display="inline-block"
              cursor={deleteBlocked ? "not-allowed" : undefined}
            >
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${name}`}
                onClick={deleteBlocked ? undefined : onDelete}
                disabled={deleteBlocked}
              >
                <Trash2 size={ICON_SIZES.xs} />
              </Button>
            </Box>
          </Tooltip>
        </Box>
      </Flex>

      {inlineError && (
        <Box px={SPACING[3]} pb={SPACING[1]}>
          <BodyText secondary>{inlineError}</BodyText>
        </Box>
      )}
    </Box>
  );
}
