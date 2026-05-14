import { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { BodyText } from "@/components/Typography";
import { Tooltip } from "@/components/ui/tooltip";
import { COLORS, ICON_SIZES, MAX_WIDTHS, RADII, SPACING } from "@/styles/designTokens";

interface ClickableListItemProps {
  name: string;
  nameDisplay?: React.ReactNode;
  onClick?: () => void;
  onDelete?: () => void;
  inlineError?: string;
}

export function ClickableListItem({
  name,
  nameDisplay,
  onClick,
  onDelete,
  inlineError,
}: ClickableListItemProps) {
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
        cursor={onClick ? "pointer" : "default"}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        _hover={{ bg: COLORS.highlight.secondary }}
        transition="background-color 0.15s ease"
      >
        <Box flex={1}>
          {nameDisplay ?? <BodyText>{name}</BodyText>}
        </Box>

        {onDelete && (
          <Box
            opacity={hovered ? 1 : 0}
            transition="opacity 0.15s ease"
            flexShrink={0}
          >
            <Tooltip content="Delete" positioning={{ placement: "top" }}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Delete ${name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 size={ICON_SIZES.xs} />
              </Button>
            </Tooltip>
          </Box>
        )}
      </Flex>

      {inlineError && (
        <Box px={SPACING[3]} pb={SPACING[1]}>
          <BodyText secondary>{inlineError}</BodyText>
        </Box>
      )}
    </Box>
  );
}
