import { RADII, SPACING } from "@/styles/designTokens";
import { Box } from "@chakra-ui/react";

interface CircleFullProps {
  color: string;
}
export function CircleFull({ color }: CircleFullProps) {
  return (
    <Box
      w={SPACING[2]}
      h={SPACING[2]}
      borderRadius={RADII.full}
      bg={color}
      flexShrink={0}
    />
  );
}
