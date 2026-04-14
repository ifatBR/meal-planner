import { Box, Flex } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Tooltip } from "@/components/ui/tooltip";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  ICON_SIZES,
  RADII,
  SPACING,
} from "@/styles/designTokens";

interface NavItemProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isCollapsed: boolean;
  isActive?: boolean;
  to?: string;
  onClick?: () => void;
}

export function NavItem({
  icon: Icon,
  label,
  isCollapsed,
  isActive = false,
  to,
  onClick,
}: NavItemProps) {
  const sharedFlexProps = {
    align: "center" as const,
    justify: isCollapsed ? "center" : undefined,
    gap: SPACING[3],
    px: SPACING[3],
    py: SPACING[3],
    borderRadius: RADII.md,
    bg: isActive ? COLORS.sidebar.itemActiveBg : "transparent",
    color: isActive ? COLORS.sidebar.itemActiveColor : COLORS.sidebar.itemColor,
    fontSize: FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    whiteSpace: "nowrap" as const,
    _hover: {
      bg: isActive ? COLORS.sidebar.itemActiveBg : COLORS.sidebar.itemHoverBg,
    },
    transition: "background-color 0.15s ease",
  };

  const content = (
    <>
      <Box flexShrink={0}>
        <Icon size={ICON_SIZES.md} />
      </Box>
      {!isCollapsed && <Box as="span">{label}</Box>}
    </>
  );

  if (to) {
    return (
      <Tooltip content={label} positioning={{ placement: "right" }} disabled={!isCollapsed}>
        <Link to={to}>
          <Flex {...sharedFlexProps}>{content}</Flex>
        </Link>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={label} positioning={{ placement: "right" }} disabled={!isCollapsed}>
      <Flex
        as="button"
        onClick={onClick}
        w="full"
        cursor="pointer"
        border="none"
        {...sharedFlexProps}
      >
        {content}
      </Flex>
    </Tooltip>
  );
}
