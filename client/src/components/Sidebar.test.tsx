import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { system } from '@/styles/theme';
import { Sidebar } from './Sidebar';
import { COLORS, SIDEBAR } from '@/styles/designTokens';

const mockLogout = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      userName: 'janedoe',
      role: 'user',
    },
    logout: mockLogout,
    accessToken: 'token',
    isLoading: false,
    login: vi.fn(),
  }),
}));

function renderSidebar(
  props: { isCollapsed: boolean; onToggle: () => void },
  initialPath = '/'
) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Sidebar {...props} />
      </MemoryRouter>
    </ChakraProvider>
  );
}

describe('Sidebar', () => {
  it('shows Library and Schedules labels when expanded', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Schedules')).toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ isCollapsed: false, onToggle });
    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides nav labels when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    expect(screen.queryByText('Schedules')).not.toBeInTheDocument();
  });

  it('shows expand button aria-label when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('renders navigation when expanded', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders navigation when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('applies active background color to Library when pathname is /library', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() }, '/library');
    const libraryFlex = screen.getByText('Library').parentElement;
    expect(libraryFlex).toHaveStyle({ backgroundColor: COLORS.sidebar.itemActiveBg });
  });

  it('uses collapsed width when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.getByRole('navigation')).toHaveStyle({ width: SIDEBAR.widthCollapsed });
  });

  it('uses expanded width when not collapsed', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    expect(screen.getByRole('navigation')).toHaveStyle({ width: SIDEBAR.widthExpanded });
  });

  it('shows user name and email when expanded', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows first initial in avatar when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows Log out label when expanded', () => {
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    expect(screen.getByText('Log out')).toBeInTheDocument();
  });

  it('hides Log out label when collapsed', () => {
    renderSidebar({ isCollapsed: true, onToggle: vi.fn() });
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('calls logout when Log out is clicked', async () => {
    const user = userEvent.setup();
    renderSidebar({ isCollapsed: false, onToggle: vi.fn() });
    await user.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
