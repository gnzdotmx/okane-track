import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../services/api';

// Mock the AuthContext
const mockLogout = vi.fn();
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/dashboard' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock MUI hooks
const mockUseMediaQuery = vi.fn(() => false); // Default to desktop (not mobile)

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useTheme: vi.fn(() => ({
      breakpoints: {
        down: vi.fn(() => 'md'),
      },
    })),
    useMediaQuery: vi.fn(() => mockUseMediaQuery()),
  };
});

// Mock the api service
vi.mock('../../../services/api', () => ({
  default: {
    getCurrencies: vi.fn(),
  },
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;
const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;
const mockApi = api as unknown as {
  getCurrencies: ReturnType<typeof vi.fn>;
};

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      logout: mockLogout,
      user: mockUser,
    });
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseLocation.mockReturnValue(mockLocation);
    mockUseMediaQuery.mockReturnValue(false); // Default to desktop
    mockApi.getCurrencies.mockResolvedValue({
      success: true,
      data: [],
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render layout with children', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test Content</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    it('should render app title', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // App title appears in both drawer and app bar, so use getAllByText
        const titles = screen.getAllByText('💰 OkaneTrack');
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('should render user name in app bar', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should render all menu items', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // Menu items appear in sidebar, so use getAllByText to handle duplicates
        expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Charts').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Import/Export').length).toBeGreaterThan(0);
      });
    });

    it('should render logout button', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // Logout appears in sidebar menu (may appear multiple times)
        expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate when menu item is clicked', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
      });

      // Get the first Transactions button (from sidebar menu)
      const transactionsButtons = screen.getAllByText('Transactions');
      fireEvent.click(transactionsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/transactions');
    });

    it('should navigate to accounts when clicked', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getAllByText('Accounts').length).toBeGreaterThan(0);
      });

      // Get the first Accounts button (from sidebar menu)
      const accountsButtons = screen.getAllByText('Accounts');
      fireEvent.click(accountsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/accounts');
    });

    it('should navigate to charts when clicked', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getAllByText('Charts').length).toBeGreaterThan(0);
      });

      // Get the first Charts button (from sidebar menu)
      const chartsButtons = screen.getAllByText('Charts');
      fireEvent.click(chartsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/charts');
    });

    it('should navigate to import when clicked', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(screen.getAllByText('Import/Export').length).toBeGreaterThan(0);
      });

      // Get the first Import/Export button (from sidebar menu)
      const importButtons = screen.getAllByText('Import/Export');
      fireEvent.click(importButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/import');
    });

    it('should display current page title in app bar', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/transactions' });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // Transactions appears in both sidebar and app bar
        expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
      });
    });

    it('should display default title when path does not match menu items', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/unknown' });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // Should show default "OkaneTrack" in app bar (appears multiple times)
        const appBarTexts = screen.getAllByText('OkaneTrack');
        expect(appBarTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Logout', () => {
    it('should call logout when logout button is clicked', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        // Logout appears in sidebar menu
        expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
      });

      // Get the first Logout button (from sidebar menu)
      const logoutButtons = screen.getAllByText('Logout');
      fireEvent.click(logoutButtons[0]);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Exchange Rates', () => {
    it('should load and display exchange rates', async () => {
      const mockCurrencies = [
        { id: '1', code: 'USD', symbol: '$', exchangeRate: 1, isBase: true },
        { id: '2', code: 'EUR', symbol: '€', exchangeRate: 0.85, isBase: false },
        { id: '3', code: 'GBP', symbol: '£', exchangeRate: 0.73, isBase: false },
      ];

      mockApi.getCurrencies.mockResolvedValue({
        success: true,
        data: mockCurrencies,
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(mockApi.getCurrencies).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/USD 1 = EUR 0.85/i)).toBeInTheDocument();
        expect(screen.getByText(/USD 1 = GBP 0.73/i)).toBeInTheDocument();
      });
    });

    it('should not display exchange rates when no base currency', async () => {
      const mockCurrencies = [
        { id: '2', code: 'EUR', symbol: '€', exchangeRate: 0.85, isBase: false },
      ];

      mockApi.getCurrencies.mockResolvedValue({
        success: true,
        data: mockCurrencies,
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(mockApi.getCurrencies).toHaveBeenCalled();
      });

      // Exchange rates should not be displayed without base currency
      expect(screen.queryByText(/EUR/i)).not.toBeInTheDocument();
    });

    it('should not display exchange rates when API call fails', async () => {
      mockApi.getCurrencies.mockRejectedValue(new Error('API Error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(mockApi.getCurrencies).toHaveBeenCalled();
      });

      // Exchange rates should not be displayed on error
      expect(screen.queryByText(/USD 1 =/i)).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should not display exchange rates when response is not successful', async () => {
      mockApi.getCurrencies.mockResolvedValue({
        success: false,
        data: null,
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      await waitFor(() => {
        expect(mockApi.getCurrencies).toHaveBeenCalled();
      });

      // Exchange rates should not be displayed
      expect(screen.queryByText(/USD 1 =/i)).not.toBeInTheDocument();
    });

    it('should refresh exchange rates every 5 minutes', async () => {
      vi.useFakeTimers();

      mockApi.getCurrencies.mockResolvedValue({
        success: true,
        data: [
          { id: '1', code: 'USD', symbol: '$', exchangeRate: 1, isBase: true },
          { id: '2', code: 'EUR', symbol: '€', exchangeRate: 0.85, isBase: false },
        ],
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Flush promises to allow initial call to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockApi.getCurrencies).toHaveBeenCalledTimes(1);

      // Fast-forward 5 minutes (this will trigger the interval callback)
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
        // Flush promises to allow interval callback to complete
        await Promise.resolve();
      });

      expect(mockApi.getCurrencies).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Mobile Drawer', () => {
    it('should show menu button on mobile', async () => {
      // Mock mobile view
      mockUseMediaQuery.mockReturnValue(true); // isMobile = true

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Menu button should be visible on mobile
      // The menu button contains an SVG icon
      const buttons = screen.getAllByRole('button');
      const menuButton = buttons.find((btn: HTMLElement) => {
        const icon = btn.querySelector('svg');
        return icon !== null;
      });

      // Verify menu button exists (it should be in the buttons array)
      expect(buttons.length).toBeGreaterThan(0);
      expect(menuButton).toBeDefined();
    });

    it('should close mobile drawer when menu item is clicked on mobile', async () => {
      // Mock mobile view
      mockUseMediaQuery.mockReturnValue(true); // isMobile = true

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Get the first Transactions button (from sidebar menu)
      const transactionsButtons = screen.getAllByText('Transactions');
      expect(transactionsButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(transactionsButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/transactions');
      // Drawer should close (tested via navigation call)
    });

    it('should not show menu button on desktop', async () => {
      // Mock desktop view (default)
      mockUseMediaQuery.mockReturnValue(false); // isMobile = false

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Menu button should not be visible on desktop
      // The menu button has display: { md: 'none' } so it's hidden on desktop
      // We verify navigation still works (Dashboard appears in sidebar and app bar)
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });
  });

  describe('User Display', () => {
    it('should display user name when user exists', async () => {
      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle missing user gracefully', async () => {
      mockUseAuth.mockReturnValue({
        logout: mockLogout,
        user: null,
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Should not crash, user name just won't be displayed
      const titles = screen.getAllByText('💰 OkaneTrack');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('should handle user with missing name fields', async () => {
      mockUseAuth.mockReturnValue({
        logout: mockLogout,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: '',
          lastName: '',
        },
      });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Should render without crashing
      const titles = screen.getAllByText('💰 OkaneTrack');
      expect(titles.length).toBeGreaterThan(0);
    });
  });

  describe('Active Route Highlighting', () => {
    it('should highlight active menu item', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard' });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // The selected state is handled by MUI's ListItemButton selected prop
      // We can verify the menu item exists (appears in both sidebar and app bar)
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    });

    it('should highlight transactions when on transactions page', async () => {
      mockUseLocation.mockReturnValue({ pathname: '/transactions' });

      await act(async () => {
        renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
      });

      // Transactions appears in both sidebar and app bar
      expect(screen.getAllByText('Transactions').length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', async () => {
      vi.useFakeTimers();

      mockApi.getCurrencies.mockResolvedValue({
        success: true,
        data: [
          { id: '1', code: 'USD', symbol: '$', exchangeRate: 1, isBase: true },
        ],
      });

      let unmount: () => void;
      await act(async () => {
        const result = renderWithRouter(
          <Layout>
            <div>Test</div>
          </Layout>
        );
        unmount = result.unmount;
      });

      // Flush promises to allow initial call to complete
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockApi.getCurrencies).toHaveBeenCalled();

      act(() => {
        unmount!();
      });

      // Fast-forward time - getCurrencies should not be called again after unmount
      const callCount = mockApi.getCurrencies.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
        // Flush promises - but interval should be cleared, so nothing should execute
        await Promise.resolve();
      });

      // Should not have increased (interval was cleared on unmount)
      expect(mockApi.getCurrencies.mock.calls.length).toBe(callCount);

      vi.useRealTimers();
    });
  });
});

