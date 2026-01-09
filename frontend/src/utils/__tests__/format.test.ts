import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatDateString,
  formatPercentage,
  getCategoryColor,
  getTransactionTypeColor,
  downloadCSV,
} from '../format';

describe('formatCurrency', () => {
  it('should format positive amount with default currency symbol', () => {
    expect(formatCurrency(1234.56)).toBe('¥1,234.56');
  });

  it('should format negative amount with default currency symbol', () => {
    expect(formatCurrency(-1234.56)).toBe('-¥1,234.56');
  });

  it('should format zero amount', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
  });

  it('should format amount with custom currency symbol', () => {
    expect(formatCurrency(1000, '$')).toBe('$1,000.00');
    expect(formatCurrency(500, '€')).toBe('€500.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('¥1,234,567.89');
  });

  it('should format small decimal amounts', () => {
    expect(formatCurrency(0.01)).toBe('¥0.01');
    expect(formatCurrency(-0.01)).toBe('-¥0.01');
  });

  it('should handle negative zero', () => {
    expect(formatCurrency(-0)).toBe('¥0.00');
  });
});

describe('formatNumber', () => {
  it('should format positive number with 2 decimal places', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });

  it('should format negative number with 2 decimal places', () => {
    expect(formatNumber(-1234.56)).toBe('-1,234.56');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatNumber(1234567.89)).toBe('1,234,567.89');
  });

  it('should format numbers with less than 2 decimal places', () => {
    expect(formatNumber(100)).toBe('100.00');
    expect(formatNumber(5.5)).toBe('5.50');
  });

  it('should format numbers with more than 2 decimal places', () => {
    expect(formatNumber(123.456)).toBe('123.46');
    expect(formatNumber(123.454)).toBe('123.45');
  });
});

describe('formatDateString', () => {
  it('should format valid ISO date string with default format', () => {
    const result = formatDateString('2024-01-15T10:30:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format valid ISO date string with custom format', () => {
    expect(formatDateString('2024-01-15', 'yyyy-MM-dd')).toBe('2024-01-15');
    expect(formatDateString('2024-12-25', 'dd/MM/yyyy')).toBe('25/12/2024');
  });

  it('should return original string for invalid date', () => {
    expect(formatDateString('invalid-date')).toBe('invalid-date');
    expect(formatDateString('not-a-date')).toBe('not-a-date');
  });

  it('should handle empty string', () => {
    expect(formatDateString('')).toBe('');
  });

  it('should format date with different formats', () => {
    const date = '2024-03-15T00:00:00Z';
    expect(formatDateString(date, 'MM/dd/yyyy')).toContain('03/15/2024');
    expect(formatDateString(date, 'dd MMM yyyy')).toContain('15');
  });
});

describe('formatPercentage', () => {
  it('should format positive percentage', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(75.5)).toBe('75.5%');
  });

  it('should format negative percentage', () => {
    expect(formatPercentage(-25)).toBe('-25.0%');
    expect(formatPercentage(-10.5)).toBe('-10.5%');
  });

  it('should format zero percentage', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('should format percentage with many decimal places', () => {
    expect(formatPercentage(33.333333)).toBe('33.3%');
    expect(formatPercentage(66.666666)).toBe('66.7%');
  });

  it('should format large percentages', () => {
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(150)).toBe('150.0%');
  });
});

describe('getCategoryColor', () => {
  it('should return correct color for Expenses', () => {
    expect(getCategoryColor('Expenses')).toBe('#FF9800');
  });

  it('should return correct color for Savings', () => {
    expect(getCategoryColor('Savings')).toBe('#4CAF50');
  });

  it('should return correct color for Investment', () => {
    expect(getCategoryColor('Investment')).toBe('#2196F3');
  });

  it('should return correct color for Emergencies', () => {
    expect(getCategoryColor('Emergencies')).toBe('#F44336');
  });

  it('should return default color for unknown category', () => {
    expect(getCategoryColor('Unknown')).toBe('#9E9E9E');
    expect(getCategoryColor('')).toBe('#9E9E9E');
    expect(getCategoryColor('Food')).toBe('#9E9E9E');
  });

  it('should be case sensitive', () => {
    expect(getCategoryColor('expenses')).toBe('#9E9E9E');
    expect(getCategoryColor('SAVINGS')).toBe('#9E9E9E');
  });
});

describe('getTransactionTypeColor', () => {
  it('should return correct color for EXPENSE', () => {
    expect(getTransactionTypeColor('EXPENSE')).toBe('#F44336');
  });

  it('should return correct color for INCOME', () => {
    expect(getTransactionTypeColor('INCOME')).toBe('#4CAF50');
  });

  it('should return correct color for TRANSFER', () => {
    expect(getTransactionTypeColor('TRANSFER')).toBe('#9C27B0');
  });

  it('should return correct color for REIMBURSEMENT', () => {
    expect(getTransactionTypeColor('REIMBURSEMENT')).toBe('#FFC107');
  });

  it('should return default color for invalid type', () => {
    // TypeScript would prevent this, but runtime could still pass invalid values
    expect(getTransactionTypeColor('INVALID' as any)).toBe('#9E9E9E');
  });
});

describe('downloadCSV', () => {
  let mockLink: HTMLElement;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockAppendChild: ReturnType<typeof vi.fn>;
  let mockRemoveChild: ReturnType<typeof vi.fn>;
  let mockCreateObjectURL: any;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClick = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();

    mockLink = {
      setAttribute: vi.fn(),
      click: mockClick,
      style: {
        visibility: '',
      },
    } as any;

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild as any);
    // Mock URL methods
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should download CSV from string content', () => {
    const content = 'Date,Amount,Description\n2024-01-15,100,Test';
    downloadCSV(content, 'test.csv');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
    expect(mockLink.style.visibility).toBe('hidden');
    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });

  it('should download CSV from Blob content', () => {
    const blob = new Blob(['test content'], { type: 'text/csv' });
    downloadCSV(blob, 'blob-test.csv');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock-url');
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'blob-test.csv');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });

  it('should use default filename when not provided', () => {
    const content = 'test,data';
    downloadCSV(content);

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'transactions.csv');
  });

  it('should create Blob with correct type for string content', () => {
    const content = 'Date,Amount\n2024-01-15,100';
    downloadCSV(content);

    const blobCall = mockCreateObjectURL.mock.calls[0][0];
    expect(blobCall).toBeInstanceOf(Blob);
    expect(blobCall.type).toBe('text/csv;charset=utf-8;');
  });

  it('should handle empty string content', () => {
    downloadCSV('', 'empty.csv');

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });

  it('should handle special characters in filename', () => {
    const content = 'test';
    downloadCSV(content, 'file with spaces.csv');

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'file with spaces.csv');
  });
});

