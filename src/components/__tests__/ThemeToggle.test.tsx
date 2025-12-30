import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '../ThemeToggle';

// Mock next-themes
vi.mock('next-themes', async () => {
  const actual = await vi.importActual('next-themes');
  return {
    ...actual,
    useTheme: vi.fn(() => ({
      theme: 'light',
      setTheme: vi.fn(),
    })),
  };
});

describe('ThemeToggle Component', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(
      <ThemeProvider attribute="class" defaultTheme="system">
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render theme toggle button', () => {
    renderWithTheme(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should have accessible label', () => {
    renderWithTheme(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('should show dropdown menu on click', async () => {
    renderWithTheme(<ThemeToggle />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    // The dropdown should appear with theme options
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });
});
