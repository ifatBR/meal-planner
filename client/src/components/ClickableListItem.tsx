import { Box, Flex } from "@chakra-ui/react";
import { BodyText } from "@/components/Typography";
import { COLORS, MAX_WIDTHS, RADII, SPACING } from "@/styles/designTokens";

interface ClickableListItemProps {
  name: string;
  nameDisplay?: React.ReactNode;
  onClick?: () => void;

  inlineError?: string;
}

export function ClickableListItem({
  name,
  nameDisplay,
  onClick,
  inlineError,
}: ClickableListItemProps) {
  return (
    <Box>
      <Flex
        align="center"
        gap={SPACING[3]}
        px={SPACING[3]}
        py={SPACING[2]}
        borderRadius={RADII.sm}
        maxW={MAX_WIDTHS.listItem}
        onClick={onClick}
        _hover={{ bg: COLORS.highlight.secondary }}
        transition="background-color 0.15s ease"
        cursor="pointer"
      >
        <Box flex={1}>{nameDisplay ?? <BodyText>{name}</BodyText>}</Box>
      </Flex>

      {inlineError && (
        <Box px={SPACING[3]} pb={SPACING[1]}>
          <BodyText secondary>{inlineError}</BodyText>
        </Box>
      )}
    </Box>
  );
}
