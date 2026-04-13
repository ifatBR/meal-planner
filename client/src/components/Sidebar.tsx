import { Box, Flex } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
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
} from '@/styles/designTokens'
import { ROUTES } from '@/utils/constants'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

interface NavItem {
  label: string
  to: string
  Icon: React.ComponentType<{ size?: number }>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Library', to: ROUTES.LIBRARY, Icon: BookOpen },
  { label: 'Schedules', to: ROUTES.SCHEDULES, Icon: CalendarDays },
]

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation()

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
        {NAV_ITEMS.map(({ label, to, Icon }) => {
          const isActive = pathname.startsWith(to)
          return (
            <Link key={to} to={to}>
              <Flex
                align="center"
                gap={SPACING[3]}
                px={SPACING[3]}
                py={SPACING[3]}
                borderRadius={RADII.md}
                bg={isActive ? COLORS.sidebar.itemActiveBg : 'transparent'}
                color={isActive ? COLORS.sidebar.itemActiveColor : COLORS.sidebar.itemColor}
                fontSize={FONT_SIZES.base}
                fontWeight={FONT_WEIGHTS.medium}
                whiteSpace="nowrap"
                _hover={{
                  bg: isActive ? COLORS.sidebar.itemActiveBg : COLORS.sidebar.itemHoverBg,
                }}
                transition="background-color 0.15s ease"
              >
                <Box flexShrink={0}>
                  <Icon size={ICON_SIZES.md} />
                </Box>
                {!isCollapsed && <span>{label}</span>}
              </Flex>
            </Link>
          )
        })}
      </Flex>

      {/* Toggle button */}
      <Flex
        as="button"
        onClick={onToggle}
        align="center"
        justify={isCollapsed ? 'center' : 'flex-end'}
        mx={SPACING[2]}
        px={SPACING[3]}
        py={SPACING[3]}
        borderRadius={RADII.md}
        color={COLORS.sidebar.itemColor}
        bg="transparent"
        border="none"
        cursor="pointer"
        _hover={{ bg: COLORS.sidebar.itemHoverBg }}
        transition="background-color 0.15s ease"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={ICON_SIZES.md} /> : <ChevronLeft size={ICON_SIZES.md} />}
      </Flex>
    </Flex>
  )
}
