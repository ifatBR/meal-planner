import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import { Sidebar } from './Sidebar'
import { SIDEBAR, SPACING } from '@/styles/designTokens'

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((v) => !v)} />
      <Box
        as="main"
        ml={isCollapsed ? SIDEBAR.widthCollapsed : SIDEBAR.widthExpanded}
        minH="100vh"
        overflowY="auto"
        p={SPACING[6]}
        transition="margin-left 0.2s ease"
      >
        <Outlet />
      </Box>
    </>
  )
}
