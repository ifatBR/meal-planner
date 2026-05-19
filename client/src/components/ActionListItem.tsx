import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { BodyText } from "@/components/Typography";
import { Tooltip } from "@/components/ui/tooltip";
import { COLORS, ICON_SIZES, MAX_WIDTHS, RADII, SPACING } from "@/styles/designTokens";

interface ActionListItemProps {
  name: string;
  nameDisplay?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  inlineError?: string;
}

export function ActionListItem({
  name,
  nameDisplay,
  onView,
  onEdit,
  onDelete,
  inlineError,
}: ActionListItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box>
      <Flex
        align="center"
        gap={SPACING[3]}
        px={SPACING[3]}
        py={SPACING[2]}
        borderRadius={RADII.sm}
        maxW={MAX_WIDTHS.listItem}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        _hover={{ bg: COLORS.highlight.secondary }}
        transition="background-color 0.15s ease"
      >
        <Box flex={1}>
          {nameDisplay ?? <BodyText>{name}</BodyText>}
        </Box>

        <Flex
          gap={SPACING[1]}
          opacity={hovered ? 1 : 0}
          transition="opacity 0.15s ease"
          flexShrink={0}
        >
          {onView && (
            <Tooltip content="View" positioning={{ placement: "top" }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`View ${name}`}
                onClick={onView}
              >
                <Eye size={ICON_SIZES.xs} />
              </Button>
            </Tooltip>
          )}

          {onEdit && (
            <Tooltip content="Edit" positioning={{ placement: "top" }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Edit ${name}`}
                onClick={onEdit}
              >
                <Pencil size={ICON_SIZES.xs} />
              </Button>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip content="Delete" positioning={{ placement: "top" }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${name}`}
                onClick={onDelete}
              >
                <Trash2 size={ICON_SIZES.xs} />
              </Button>
            </Tooltip>
          )}
        </Flex>
      </Flex>

      {inlineError && (
        <Box px={SPACING[3]} pb={SPACING[1]}>
          <BodyText secondary>{inlineError}</BodyText>
        </Box>
      )}
    </Box>
  );
}
