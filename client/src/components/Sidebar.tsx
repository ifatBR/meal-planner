import { Flex, Text } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import { Tooltip } from "./ui/tooltip";

import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  ICON_SIZES,
  RADII,
  SHADOWS,
  SIDEBAR,
  SPACING,
  Z_INDEX,
} from "@/styles/designTokens";
import { ROUTES } from "@/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import { NavItem } from "./NavItem";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItemDef {
  label: string;
  to: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const NAV_ITEMS: NavItemDef[] = [
  { label: "Library", to: ROUTES.LIBRARY, Icon: BookOpen },
  { label: "Schedules", to: ROUTES.SCHEDULES, Icon: CalendarDays },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  console.log("user:", user);
  console.log("user:", user ? `${user.firstName} ${user.lastName}` : "");

  return (
    <Flex
      as="nav"
      direction="column"
      justify="space-between"
      position="fixed"
      top={0}
      left={0}
      h="100vh"
      w={isCollapsed ? SIDEBAR.widthCollapsed : SIDEBAR.widthExpanded}
      bg={COLORS.sidebar.bg}
      boxShadow={SHADOWS.sidebar}
      py={SPACING[4]}
      zIndex={Z_INDEX.sidebar}
      transition="width 0.2s ease"
      overflow="hidden"
    >
      {/* Nav items */}
      <Flex direction="column" gap={SPACING[1]} px={SPACING[2]}>
        {NAV_ITEMS.map(({ label, to, Icon }) => (
          <NavItem
            key={to}
            icon={Icon}
            label={label}
            to={to}
            isActive={pathname.startsWith(to)}
            isCollapsed={isCollapsed}
          />
        ))}
      </Flex>

      {/* Bottom group: user section + logout + toggle */}
      <Flex direction="column" gap={SPACING[1]} px={SPACING[2]}>
        {/* User section — expanded */}
        {!isCollapsed && (
          <Flex
            align="center"
            px={SPACING[3]}
            py={SPACING[3]}
            borderRadius={RADII.md}
            gap={SPACING[2]}
            overflow="hidden"
          >
            <Flex
              flexShrink={0}
              w="28px"
              h="28px"
              borderRadius={RADII.full}
              bg={COLORS.sidebar.itemActiveBg}
              color={COLORS.sidebar.itemActiveColor}
              align="center"
              justify="center"
              fontSize={FONT_SIZES.sm}
              fontWeight={FONT_WEIGHTS.semibold}
            >
              {user?.firstName?.[0]?.toUpperCase() ?? "?"}
            </Flex>
            <Flex direction="column" flex={1} overflow="hidden">
              <Text
                fontSize={FONT_SIZES.sm}
                fontWeight={FONT_WEIGHTS.medium}
                color={COLORS.sidebar.itemColor}
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                {user ? `${user.firstName} ${user.lastName}` : ""}
              </Text>
              <Text
                fontSize={FONT_SIZES.xs}
                color={COLORS.sidebar.itemColor}
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                {user?.email ?? ""}
              </Text>
            </Flex>
          </Flex>
        )}

        {/* User section — collapsed (avatar only) */}
        {isCollapsed && (
          <Flex justify="center" px={SPACING[3]} py={SPACING[3]}>
            <Flex
              w="28px"
              h="28px"
              borderRadius={RADII.full}
              bg={COLORS.sidebar.itemActiveBg}
              color={COLORS.sidebar.itemActiveColor}
              align="center"
              justify="center"
              fontSize={FONT_SIZES.sm}
              fontWeight={FONT_WEIGHTS.semibold}
              flexShrink={0}
            >
              {user?.firstName?.[0]?.toUpperCase() ?? "?"}
            </Flex>
          </Flex>
        )}

        {/* Logout */}
        <NavItem
          icon={LogOut}
          label="Log out"
          onClick={logout}
          isCollapsed={isCollapsed}
        />

        {/* Toggle button — kept separate due to flex-end alignment when expanded */}
        <Flex
          as="button"
          onClick={onToggle}
          align="center"
          justify={isCollapsed ? "center" : "flex-end"}
          px={SPACING[3]}
          py={SPACING[3]}
          borderRadius={RADII.md}
          color={COLORS.sidebar.itemColor}
          bg="transparent"
          border="none"
          cursor="pointer"
          _hover={{ bg: COLORS.sidebar.itemHoverBg }}
          transition="background-color 0.15s ease"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Tooltip content={isCollapsed ? "Expand" : "Collapse"}>
            {isCollapsed ? (
              <ChevronRight size={ICON_SIZES.md} />
            ) : (
              <ChevronLeft size={ICON_SIZES.md} />
            )}
          </Tooltip>
        </Flex>
      </Flex>
    </Flex>
  );
}
