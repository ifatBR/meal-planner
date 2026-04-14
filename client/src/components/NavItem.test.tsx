import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { system } from '@/styles/theme';
import { NavItem } from './NavItem';
import { COLORS } from '@/styles/designTokens';

function renderNavItem(props: React.ComponentProps<typeof NavItem>) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter>
        <NavItem {...props} />
      </MemoryRouter>
    </ChakraProvider>
  );
}

describe('NavItem', () => {
  it('renders as a link when to is provided', () => {
    renderNavItem({ icon: BookOpen, label: 'Library', isCollapsed: false, to: '/library' });
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('renders as a button when onClick is provided', () => {
    renderNavItem({ icon: BookOpen, label: 'Log out', isCollapsed: false, onClick: vi.fn() });
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows label when not collapsed', () => {
    renderNavItem({ icon: BookOpen, label: 'Library', isCollapsed: false, to: '/library' });
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('hides label when collapsed', () => {
    renderNavItem({ icon: BookOpen, label: 'Library', isCollapsed: true, to: '/library' });
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
  });

  it('applies active background color when isActive is true', () => {
    renderNavItem({ icon: BookOpen, label: 'Library', isCollapsed: false, to: '/library', isActive: true });
    expect(screen.getByText('Library').parentElement).toHaveStyle({
      backgroundColor: COLORS.sidebar.itemActiveBg,
    });
  });

  it('does not apply active background color when isActive is false', () => {
    renderNavItem({ icon: BookOpen, label: 'Library', isCollapsed: false, to: '/library', isActive: false });
    expect(screen.getByText('Library').parentElement).not.toHaveStyle({
      backgroundColor: COLORS.sidebar.itemActiveBg,
    });
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderNavItem({ icon: BookOpen, label: 'Log out', isCollapsed: false, onClick });
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
