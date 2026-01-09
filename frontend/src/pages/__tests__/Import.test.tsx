import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Import from '../Import';
import api from '../../services/api';
import { Account } from '../../types';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    getAccounts: vi.fn(),
    importCSV: vi.fn(),
    exportCSV: vi.fn(),
  },
}));

// Mock the format utilities
vi.mock('../../utils/format', () => ({
  downloadCSV: vi.fn(),
}));

import { downloadCSV } from '../../utils/format';

const mockApi = api as unknown as {
  getAccounts: ReturnType<typeof vi.fn>;
  importCSV: ReturnType<typeof vi.fn>;
  exportCSV: ReturnType<typeof vi.fn>;
};

const mockDownloadCSV = downloadCSV as ReturnType<typeof vi.fn>;

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Helper to create mock account
const createMockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account-1',
  name: 'Checking Account',
  type: 'CHECKING',
  balance: 1000,
  isActive: true,
  createdAt: new Date().toISOString(),
  currency: {
    id: 'currency-1',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1,
    isBase: true,
  },
  ...overrides,
});

// Helper to create a mock File object
const createMockFile = (name: string, type: string = 'text/csv'): File => {
  const file = new File(['test content'], name, { type });
  return file;
};

// Helper to get the Import Transactions button (not the heading)
const getImportButton = (): HTMLElement => {
  const importButtons = screen.getAllByText('Import Transactions');
  const button = importButtons.find((btn: HTMLElement) => {
    return btn.tagName === 'BUTTON' || btn.closest('button') !== null;
  });
  if (!button) {
    throw new Error('Import Transactions button not found');
  }
  return button as HTMLElement;
};

describe('Import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAccounts.mockResolvedValue({
      data: [createMockAccount()],
    });
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Import / Export')).toBeInTheDocument();
      });
    });

    it('should render import section', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        // "Import Transactions" appears as both heading and button, so use getAllByText
        expect(screen.getAllByText('Import Transactions').length).toBeGreaterThan(0);
        expect(screen.getByText(/Upload your CSV file to import transactions/i)).toBeInTheDocument();
      });
    });

    it('should render export section', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Export Transactions')).toBeInTheDocument();
        expect(screen.getByText(/Download all your transactions as a CSV file/i)).toBeInTheDocument();
      });
    });

    it('should render instructions section', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('CSV Format Instructions')).toBeInTheDocument();
        expect(screen.getByText(/Your CSV file should have the following columns/i)).toBeInTheDocument();
        expect(screen.getByText('Date, Amount, Type, Description')).toBeInTheDocument();
        // Check for the optional Reimbursable text (text is split across elements with <strong>)
        expect(screen.getByText(/Reimbursable.*YES\/NO/i)).toBeInTheDocument();
        // "Optional:" is in a <strong> tag, so we check for it using a text matcher
        expect(screen.getByText((content: string, element: Element | null) => {
          return element?.tagName === 'STRONG' && content === 'Optional:';
        })).toBeInTheDocument();
      });
    });
  });

  describe('Account Loading', () => {
    it('should load accounts on mount', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(mockApi.getAccounts).toHaveBeenCalled();
      });
    });

    it('should select first account by default', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [
          createMockAccount({ id: 'account-1', name: 'First Account' }),
          createMockAccount({ id: 'account-2', name: 'Second Account' }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        // Material-UI Select displays the selected option text, not the value directly
        const accountSelect = screen.getByLabelText('Select Account');
        expect(accountSelect).toBeInTheDocument();
        // Check that the first account name is displayed
        expect(screen.getByText(/First Account/i)).toBeInTheDocument();
      });
    });

    it('should handle empty accounts list', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        const accountSelect = screen.getByLabelText('Select Account');
        expect(accountSelect).toBeInTheDocument();
        // When no accounts, the select should be empty (no option selected)
        // Material-UI shows placeholder or empty state
      });
    });

    it('should display account options', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [
          createMockAccount({ id: 'account-1', name: 'Checking Account', currency: { code: 'USD', symbol: '$', name: 'US Dollar', id: 'currency-1', exchangeRate: 1, isBase: true } }),
          createMockAccount({ id: 'account-2', name: 'Savings Account', currency: { code: 'EUR', symbol: '€', name: 'Euro', id: 'currency-2', exchangeRate: 0.85, isBase: false } }),
        ],
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        const accountSelect = screen.getByLabelText('Select Account');
        expect(accountSelect).toBeInTheDocument();
      });

      const accountSelect = screen.getByLabelText('Select Account');
      fireEvent.mouseDown(accountSelect);

      await waitFor(() => {
        // Check that both account options are visible in the dropdown menu
        const checkingOption = screen.getByRole('option', { name: /Checking Account \(USD\)/i });
        const savingsOption = screen.getByRole('option', { name: /Savings Account \(EUR\)/i });
        expect(checkingOption).toBeInTheDocument();
        expect(savingsOption).toBeInTheDocument();
      });
    });
  });

  describe('File Selection', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
    });

    it('should allow selecting CSV file', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
        expect(fileInput).toBeDefined();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;

      const csvFile = createMockFile('test.csv');
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });
    });

    it('should reject non-CSV files', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const txtFile = createMockFile('test.txt', 'text/plain');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [txtFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Please select a CSV file')).toBeInTheDocument();
      });
    });

    it('should clear error when valid CSV is selected after invalid file', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const txtFile = createMockFile('test.txt', 'text/plain');
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [txtFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Please select a CSV file')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.queryByText('Please select a CSV file')).not.toBeInTheDocument();
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });
    });
  });

  describe('Import Functionality', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
    });

    it('should disable import button when no file is selected', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        const importButton = getImportButton();
        expect(importButton).toBeDefined();
        expect(importButton).toBeDisabled();
      });
    });

    it('should disable import button when no account is selected', async () => {
      mockApi.getAccounts.mockResolvedValue({
        data: [],
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
        const csvFile = createMockFile('test.csv');
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        // "Import Transactions" appears as both heading and button, get the button specifically
        const importButtons = screen.getAllByText('Import Transactions');
        const importButton = importButtons.find((btn: HTMLElement) => btn.tagName === 'BUTTON' || btn.closest('button'));
        expect(importButton).toBeDefined();
        expect(importButton).toBeDisabled();
      });
    });

    it('should disable button when file or account is missing', async () => {
      // Test that the button is correctly disabled when either file or account is missing
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        // Wait for the component to render
        expect(screen.getByText('Import / Export')).toBeInTheDocument();
      });

      // Initially, button should be disabled (no file, no account selected)
      let importButton = getImportButton();
      expect(importButton).toBeDefined();
      expect(importButton).toBeDisabled();

      // Select an account (but no file is selected)
      const accountSelect = screen.getByLabelText('Select Account');
      fireEvent.mouseDown(accountSelect);

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /Checking Account/i });
        fireEvent.click(option);
      });

      // Wait for account to be selected
      await waitFor(() => {
        expect(screen.getByText(/Checking Account/i)).toBeInTheDocument();
      });

      // Button should still be disabled because no file is selected
      importButton = getImportButton();
      expect(importButton).toBeDisabled();

      // Now select a file
      await waitFor(() => {
        const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
        expect(fileInput).toBeDefined();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      // Wait for file to be selected
      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      // Now button should be enabled (both file and account are selected)
      importButton = getImportButton();
      expect(importButton).not.toBeDisabled();
    });

    it('should import CSV file successfully', async () => {
      const mockResult = {
        success: true,
        totalRecords: 10,
        successCount: 10,
        errorCount: 0,
      };
      mockApi.importCSV.mockResolvedValue({ data: mockResult });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(mockApi.importCSV).toHaveBeenCalledWith(csvFile, 'account-1');
        expect(screen.getByText('Import Results:')).toBeInTheDocument();
        expect(screen.getByText('Total Records: 10')).toBeInTheDocument();
        expect(screen.getByText('Successfully Imported: 10')).toBeInTheDocument();
      });
    });

    it('should clear file after successful import', async () => {
      const mockResult = {
        success: true,
        totalRecords: 10,
        successCount: 10,
        errorCount: 0,
      };
      mockApi.importCSV.mockResolvedValue({ data: mockResult });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        // After successful import, file should be cleared
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });
    });

    it('should show import results with errors', async () => {
      const mockResult = {
        success: false,
        totalRecords: 10,
        successCount: 8,
        errorCount: 2,
      };
      mockApi.importCSV.mockResolvedValue({ data: mockResult });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Import Results:')).toBeInTheDocument();
        expect(screen.getByText('Total Records: 10')).toBeInTheDocument();
        expect(screen.getByText('Successfully Imported: 8')).toBeInTheDocument();
        expect(screen.getByText('Errors: 2')).toBeInTheDocument();
      });
    });

    it('should handle API error during import', async () => {
      mockApi.importCSV.mockRejectedValue({
        response: {
          data: {
            message: 'Import failed: Invalid file format',
          },
        },
      });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Import failed: Invalid file format')).toBeInTheDocument();
      });
    });

    it('should handle generic error during import', async () => {
      mockApi.importCSV.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Import failed')).toBeInTheDocument();
      });
    });

    it('should show loading state during import', async () => {
      mockApi.importCSV.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true, totalRecords: 10, successCount: 10, errorCount: 0 } }), 100))
      );

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      if (importButton) {
        fireEvent.click(importButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument();
        expect(importButton).toBeDisabled();
        // LinearProgress should be visible
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
    });

    it('should export CSV successfully', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' });
      mockApi.exportCSV.mockResolvedValue(mockBlob);

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Export All Transactions')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export All Transactions');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(mockApi.exportCSV).toHaveBeenCalled();
        expect(mockDownloadCSV).toHaveBeenCalledWith(
          mockBlob,
          expect.stringMatching(/transactions_export_\d{4}-\d{2}-\d{2}\.csv/)
        );
      });
    });

    it('should handle export error', async () => {
      mockApi.exportCSV.mockRejectedValue(new Error('Export failed'));

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Export All Transactions')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export All Transactions');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });
    });
  });

  describe('Account Selection', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [
          createMockAccount({ id: 'account-1', name: 'First Account' }),
          createMockAccount({ id: 'account-2', name: 'Second Account' }),
        ],
      });
    });

    it('should allow changing selected account', async () => {
      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        const accountSelect = screen.getByLabelText('Select Account');
        expect(accountSelect).toBeInTheDocument();
        // Check that the first account is displayed
        expect(screen.getByText(/First Account/i)).toBeInTheDocument();
      });

      const accountSelect = screen.getByLabelText('Select Account');
      fireEvent.mouseDown(accountSelect);

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /Second Account/i });
        fireEvent.click(option);
      });

      await waitFor(() => {
        // After selecting, the second account should be displayed
        expect(screen.getByText(/Second Account/i)).toBeInTheDocument();
      });
    });
  });

  describe('Result Display', () => {
    beforeEach(() => {
      mockApi.getAccounts.mockResolvedValue({
        data: [createMockAccount()],
      });
    });

    it('should clear result when new file is selected', async () => {
      const mockResult = {
        success: true,
        totalRecords: 10,
        successCount: 10,
        errorCount: 0,
      };
      mockApi.importCSV.mockResolvedValue({ data: mockResult });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile1 = createMockFile('test1.csv');
      const csvFile2 = createMockFile('test2.csv');

      // Import first file
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile1] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test1.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Import Results:')).toBeInTheDocument();
      });

      // Select new file - should clear result
      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile2] } });
      });

      await waitFor(() => {
        expect(screen.queryByText('Import Results:')).not.toBeInTheDocument();
        expect(screen.getByText('test2.csv')).toBeInTheDocument();
      });
    });

    it('should not show error count when there are no errors', async () => {
      const mockResult = {
        success: true,
        totalRecords: 10,
        successCount: 10,
        errorCount: 0,
      };
      mockApi.importCSV.mockResolvedValue({ data: mockResult });

      await act(async () => {
        renderWithRouter(<Import />);
      });

      await waitFor(() => {
        expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"][id="csv-upload"]') as HTMLInputElement;
      const csvFile = createMockFile('test.csv');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [csvFile] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      const importButton = getImportButton();
      expect(importButton).toBeDefined();
      await act(async () => {
        if (importButton) {
          fireEvent.click(importButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Import Results:')).toBeInTheDocument();
        expect(screen.getByText('Total Records: 10')).toBeInTheDocument();
        expect(screen.getByText('Successfully Imported: 10')).toBeInTheDocument();
        expect(screen.queryByText(/Errors:/i)).not.toBeInTheDocument();
      });
    });
  });
});

