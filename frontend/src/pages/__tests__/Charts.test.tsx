import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Charts from '../Charts';
import api from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getChartData: vi.fn(),
  },
}));

// Mock the format utilities
vi.mock('../../utils/format', () => ({
  formatCurrency: vi.fn((amount: number, symbol: string = '$') => `${symbol}${amount.toFixed(2)}`),
}));

// Mock the Loading component
vi.mock('../../components/common/Loading', () => ({
  default: ({ message }: { message: string }) => <div>Loading: {message}</div>,
}));

// Mock recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey, nameKey, label, children }: any) => (
    <div data-testid="pie" data-data={JSON.stringify(data)} data-datakey={dataKey} data-namekey={nameKey}>
      {label && <span data-testid="pie-label">Label: {label({ label: 'Test', percentage: 10 })}</span>}
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => <div data-testid="pie-cell" data-fill={fill} />,
  BarChart: ({ children, data }: { children: React.ReactNode; data: any[] }) => (
    <div data-testid="bar-chart" data-data={JSON.stringify(data)}>{children}</div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <div data-testid="bar" data-datakey={dataKey} data-fill={fill} />
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data: any[] }) => (
    <div data-testid="line-chart" data-data={JSON.stringify(data)}>{children}</div>
  ),
  Line: ({ dataKey, stroke, name }: { dataKey: string; stroke: string; name: string }) => (
    <div data-testid="line" data-datakey={dataKey} data-stroke={stroke} data-name={name} />
  ),
  XAxis: ({ dataKey, tickFormatter }: { dataKey?: string; tickFormatter?: (value: any) => string }) => (
    <div data-testid="x-axis" data-datakey={dataKey}>
      {tickFormatter && <span data-testid="x-axis-formatter">{tickFormatter('2024-01')}</span>}
    </div>
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ formatter, labelFormatter }: { formatter?: (value: any) => string; labelFormatter?: (label: any) => string }) => (
    <div data-testid="tooltip">
      {formatter && <span data-testid="tooltip-formatter">{formatter(100)}</span>}
      {labelFormatter && <span data-testid="tooltip-label-formatter">{labelFormatter('2024-01')}</span>}
    </div>
  ),
  Legend: () => <div data-testid="legend" />,
}));

const mockApi = api as unknown as {
  getChartData: ReturnType<typeof vi.fn>;
};

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Charts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      mockApi.getChartData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 100))
      );

      await act(async () => {
        renderWithRouter(<Charts />);
      });

      expect(screen.getByText(/Loading: Loading charts.../i)).toBeInTheDocument();
    });

    it('should not show loading when data is loaded', async () => {
      mockApi.getChartData.mockResolvedValue({ data: [] });

      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading: Loading charts.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      mockApi.getChartData.mockImplementation((type: string) => {
        if (type === 'category') {
          return Promise.resolve({
            data: [
              { label: 'Food', value: 1000, percentage: 30 },
              { label: 'Transport', value: 500, percentage: 15 },
            ],
          });
        }
        if (type === 'expense') {
          return Promise.resolve({
            data: [
              { label: 'Groceries', value: 800 },
              { label: 'Gas', value: 200 },
            ],
          });
        }
        if (type === 'monthly') {
          return Promise.resolve({
            data: [
              { month: '2024-01', income: 5000, expenses: 3000, net: 2000 },
              { month: '2024-02', income: 4500, expenses: 3500, net: 1000 },
            ],
          });
        }
        return Promise.resolve({ data: [] });
      });
    });

    it('should render page title', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Analytics & Charts')).toBeInTheDocument();
      });
    });

    it('should render all three chart cards', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
        expect(screen.getByText('Expenses by Type')).toBeInTheDocument();
        expect(screen.getByText('Monthly Income vs Expenses')).toBeInTheDocument();
      });
    });

    it('should render pie chart for budget distribution', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        expect(screen.getByTestId('pie')).toBeInTheDocument();
      });
    });

    it('should render bar chart for expenses by type', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('bar')).toBeInTheDocument();
      });
    });

    it('should render line chart for monthly income vs expenses', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        const lines = screen.getAllByTestId('line');
        expect(lines.length).toBe(3); // income, expenses, net
      });
    });

    it('should render chart data correctly', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const pie = screen.getByTestId('pie');
        const pieData = JSON.parse(pie.getAttribute('data-data') || '[]');
        expect(pieData).toHaveLength(2);
        expect(pieData[0]).toEqual({ label: 'Food', value: 1000, percentage: 30 });

        const barChart = screen.getByTestId('bar-chart');
        const barData = JSON.parse(barChart.getAttribute('data-data') || '[]');
        expect(barData).toHaveLength(2);
        expect(barData[0]).toEqual({ label: 'Groceries', value: 800 });

        const lineChart = screen.getByTestId('line-chart');
        const lineData = JSON.parse(lineChart.getAttribute('data-data') || '[]');
        expect(lineData).toHaveLength(2);
        expect(lineData[0]).toEqual({ month: '2024-01', income: 5000, expenses: 3000, net: 2000 });
      });
    });

    it('should render pie chart cells with colors', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const cells = screen.getAllByTestId('pie-cell');
        expect(cells.length).toBe(2); // Two categories
        expect(cells[0].getAttribute('data-fill')).toBe('#FF9800');
        expect(cells[1].getAttribute('data-fill')).toBe('#4CAF50');
      });
    });

    it('should render line chart with correct data keys', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const lines = screen.getAllByTestId('line');
        expect(lines[0].getAttribute('data-datakey')).toBe('income');
        expect(lines[0].getAttribute('data-stroke')).toBe('#4CAF50');
        expect(lines[0].getAttribute('data-name')).toBe('Income');

        expect(lines[1].getAttribute('data-datakey')).toBe('expenses');
        expect(lines[1].getAttribute('data-stroke')).toBe('#F44336');
        expect(lines[1].getAttribute('data-name')).toBe('Expenses');

        expect(lines[2].getAttribute('data-datakey')).toBe('net');
        expect(lines[2].getAttribute('data-stroke')).toBe('#2196F3');
        expect(lines[2].getAttribute('data-name')).toBe('Net');
      });
    });

    it('should render bar chart with correct fill color', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const bar = screen.getByTestId('bar');
        expect(bar.getAttribute('data-datakey')).toBe('value');
        expect(bar.getAttribute('data-fill')).toBe('#FF9800');
      });
    });
  });

  describe('Empty Data', () => {
    beforeEach(() => {
      mockApi.getChartData.mockResolvedValue({ data: [] });
    });

    it('should render charts with empty data', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
        expect(screen.getByText('Expenses by Type')).toBeInTheDocument();
        expect(screen.getByText('Monthly Income vs Expenses')).toBeInTheDocument();
      });

      await waitFor(() => {
        const pie = screen.getByTestId('pie');
        const pieData = JSON.parse(pie.getAttribute('data-data') || '[]');
        expect(pieData).toHaveLength(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.getChartData.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Loading: Loading charts.../i)).not.toBeInTheDocument();
      });

      // Component should still render (with empty data)
      expect(screen.getByText('Analytics & Charts')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should call getChartData with correct types', async () => {
      mockApi.getChartData.mockResolvedValue({ data: [] });

      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        expect(mockApi.getChartData).toHaveBeenCalledWith('category');
        expect(mockApi.getChartData).toHaveBeenCalledWith('expense');
        expect(mockApi.getChartData).toHaveBeenCalledWith('monthly');
        expect(mockApi.getChartData).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Chart Components', () => {
    beforeEach(() => {
      mockApi.getChartData.mockImplementation((type: string) => {
        if (type === 'category') {
          return Promise.resolve({
            data: [{ label: 'Food', value: 1000, percentage: 30 }],
          });
        }
        if (type === 'expense') {
          return Promise.resolve({
            data: [{ label: 'Groceries', value: 800 }],
          });
        }
        if (type === 'monthly') {
          return Promise.resolve({
            data: [{ month: '2024-01', income: 5000, expenses: 3000, net: 2000 }],
          });
        }
        return Promise.resolve({ data: [] });
      });
    });

    it('should render ResponsiveContainer for all charts', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const containers = screen.getAllByTestId('responsive-container');
        expect(containers.length).toBe(3); // One for each chart
      });
    });

    it('should render CartesianGrid for bar and line charts', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const grids = screen.getAllByTestId('cartesian-grid');
        expect(grids.length).toBe(2); // Bar chart and line chart
      });
    });

    it('should render XAxis and YAxis for bar and line charts', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const xAxes = screen.getAllByTestId('x-axis');
        const yAxes = screen.getAllByTestId('y-axis');
        expect(xAxes.length).toBe(2); // Bar chart and line chart
        expect(yAxes.length).toBe(2); // Bar chart and line chart
      });
    });

    it('should render Tooltip for all charts', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const tooltips = screen.getAllByTestId('tooltip');
        expect(tooltips.length).toBe(3); // One for each chart
      });
    });

    it('should render Legend for pie and line charts', async () => {
      await act(async () => {
        renderWithRouter(<Charts />);
      });

      await waitFor(() => {
        const legends = screen.getAllByTestId('legend');
        expect(legends.length).toBe(2); // Pie chart and line chart
      });
    });
  });
});

