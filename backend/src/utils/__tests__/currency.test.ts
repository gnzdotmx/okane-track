// Mock dependencies
const mockCurrencyFindUnique = jest.fn();
const mockCurrencyFindFirst = jest.fn();
const mockCurrencyFindMany = jest.fn();
const mockCurrencyUpdate = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    currency: {
      findUnique: mockCurrencyFindUnique,
      findFirst: mockCurrencyFindFirst,
      findMany: mockCurrencyFindMany,
      update: mockCurrencyUpdate,
    },
  },
}));

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

// Mock global fetch
global.fetch = jest.fn();

import {
  fetchExchangeRates,
  updateExchangeRates,
  convertCurrency,
  convertToBaseCurrency,
  formatCurrency,
  getBaseCurrency,
} from '../currency';

describe('currency utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchExchangeRates', () => {
    it('should fetch exchange rates from exchangerate-api.com successfully', async () => {
      const mockRates = {
        USD: 0.0067,
        EUR: 0.0062,
        GBP: 0.0053,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: mockRates }),
      });

      const result = await fetchExchangeRates('JPY');

      expect(result).toEqual(mockRates);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/JPY'
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Successfully fetched exchange rates from exchangerate-api.com'
      );
    });

    it('should fallback to exchangerate.host when first API fails', async () => {
      const mockRates = {
        USD: 0.0067,
        EUR: 0.0062,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rates: mockRates }),
        });

      const result = await fetchExchangeRates('JPY');

      expect(result).toEqual(mockRates);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      // When response.ok is false, no error is thrown, so no warning is logged
      // The code silently falls through to the fallback
      expect(mockLoggerWarn).not.toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Successfully fetched exchange rates from exchangerate.host'
      );
    });

    it('should fallback to exchangerate.host when first API throws error', async () => {
      const mockRates = {
        USD: 0.0067,
        EUR: 0.0062,
      };

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, rates: mockRates }),
        });

      const result = await fetchExchangeRates('JPY');

      expect(result).toEqual(mockRates);
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Failed to fetch from exchangerate-api.com, trying fallback...',
        expect.any(Error)
      );
    });

    it('should return null when both APIs fail', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const result = await fetchExchangeRates('JPY');

      expect(result).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('All exchange rate API calls failed');
    });

    it('should return null when both APIs throw errors', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchExchangeRates('JPY');

      expect(result).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith('All exchange rate API calls failed');
    });

    it('should return null when first API returns data without rates', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'invalid' }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      const result = await fetchExchangeRates('JPY');

      expect(result).toBeNull();
    });

    it('should return null when fallback API returns data without success flag', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ rates: {} }), // Missing success flag
        });

      const result = await fetchExchangeRates('JPY');

      expect(result).toBeNull();
    });

    it('should use default baseCurrency JPY when not provided', async () => {
      const mockRates = { USD: 0.0067 };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: mockRates }),
      });

      await fetchExchangeRates();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.exchangerate-api.com/v4/latest/JPY'
      );
    });
  });

  describe('updateExchangeRates', () => {
    it('should update exchange rates for all currencies', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      const mockRates = {
        USD: 0.0067,
        EUR: 0.0062,
      };

      const currencies = [
        { id: 'currency-2', code: 'USD', exchangeRate: 0.0065 },
        { id: 'currency-3', code: 'EUR', exchangeRate: 0.0060 },
      ];

      mockCurrencyFindFirst.mockResolvedValue(baseCurrency);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: mockRates }),
      });
      mockCurrencyFindMany.mockResolvedValue(currencies);
      mockCurrencyUpdate.mockResolvedValue({});

      await updateExchangeRates();

      expect(mockCurrencyFindFirst).toHaveBeenCalled();
      expect(mockCurrencyFindMany).toHaveBeenCalledWith({
        where: { isBase: false },
      });
      expect(mockCurrencyUpdate).toHaveBeenCalledTimes(2);
      expect(mockCurrencyUpdate).toHaveBeenCalledWith({
        where: { code: 'USD' },
        data: { exchangeRate: 0.0067 },
      });
      expect(mockCurrencyUpdate).toHaveBeenCalledWith({
        where: { code: 'EUR' },
        data: { exchangeRate: 0.0062 },
      });
    });

    it('should throw error when base currency is not configured', async () => {
      mockCurrencyFindFirst.mockResolvedValue(null);

      await expect(updateExchangeRates()).rejects.toThrow('Base currency not configured');
    });

    it('should return early when exchange rates cannot be fetched', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      mockCurrencyFindFirst.mockResolvedValue(baseCurrency);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: false });

      await updateExchangeRates();

      expect(mockCurrencyFindMany).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Could not fetch exchange rates, keeping existing rates'
      );
    });

    it('should log warning when exchange rate not found for a currency', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      const mockRates = {
        USD: 0.0067,
        // EUR not in rates
      };

      const currencies = [
        { id: 'currency-2', code: 'USD', exchangeRate: 0.0065 },
        { id: 'currency-3', code: 'EUR', exchangeRate: 0.0060 },
      ];

      mockCurrencyFindFirst.mockResolvedValue(baseCurrency);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: mockRates }),
      });
      mockCurrencyFindMany.mockResolvedValue(currencies);
      mockCurrencyUpdate.mockResolvedValue({});

      await updateExchangeRates();

      expect(mockCurrencyUpdate).toHaveBeenCalledTimes(1); // Only USD updated
      expect(mockLoggerWarn).toHaveBeenCalledWith('Exchange rate not found for EUR');
    });

    it('should throw error when database operation fails', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      mockCurrencyFindFirst.mockResolvedValue(baseCurrency);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { USD: 0.0067 } }),
      });
      mockCurrencyFindMany.mockRejectedValue(new Error('Database error'));

      await expect(updateExchangeRates()).rejects.toThrow('Database error');
      expect(mockLoggerError).toHaveBeenCalledWith('Error updating exchange rates:', expect.any(Error));
    });
  });

  describe('convertCurrency', () => {
    it('should return same amount when currencies are the same', async () => {
      const result = await convertCurrency(100, 'USD', 'USD');

      expect(result).toBe(100);
      expect(mockCurrencyFindUnique).not.toHaveBeenCalled();
    });

    it('should convert from base currency to non-base currency', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      const toCurrency = {
        id: 'currency-2',
        code: 'USD',
        symbol: '$',
        isBase: false,
        exchangeRate: 0.0067,
      };

      mockCurrencyFindUnique
        .mockResolvedValueOnce(baseCurrency)
        .mockResolvedValueOnce(toCurrency);

      const result = await convertCurrency(1000, 'JPY', 'USD');

      expect(result).toBe(6.7); // 1000 * 0.0067
    });

    it('should convert from non-base currency to base currency', async () => {
      const fromCurrency = {
        id: 'currency-2',
        code: 'USD',
        symbol: '$',
        isBase: false,
        exchangeRate: 0.0067,
      };

      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      mockCurrencyFindUnique
        .mockResolvedValueOnce(fromCurrency)
        .mockResolvedValueOnce(baseCurrency);

      const result = await convertCurrency(6.7, 'USD', 'JPY');

      expect(result).toBe(1000); // 6.7 / 0.0067
    });

    it('should convert between two non-base currencies', async () => {
      const fromCurrency = {
        id: 'currency-2',
        code: 'USD',
        symbol: '$',
        isBase: false,
        exchangeRate: 0.0067, // 1 USD = 0.0067 JPY
      };

      const toCurrency = {
        id: 'currency-3',
        code: 'EUR',
        symbol: '€',
        isBase: false,
        exchangeRate: 0.0062, // 1 EUR = 0.0062 JPY
      };

      mockCurrencyFindUnique
        .mockResolvedValueOnce(fromCurrency)
        .mockResolvedValueOnce(toCurrency);

      const result = await convertCurrency(100, 'USD', 'EUR');

      // 100 USD -> JPY: 100 / 0.0067 = 14925.37
      // JPY -> EUR: 14925.37 * 0.0062 = 92.54
      expect(result).toBeCloseTo(92.54, 2);
    });

    it('should throw error when from currency is not found', async () => {
      mockCurrencyFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'currency-2',
          code: 'USD',
          symbol: '$',
          isBase: false,
          exchangeRate: 0.0067,
        });

      await expect(convertCurrency(100, 'INVALID', 'USD')).rejects.toThrow('Currency not found');
    });

    it('should throw error when to currency is not found', async () => {
      mockCurrencyFindUnique
        .mockResolvedValueOnce({
          id: 'currency-2',
          code: 'USD',
          symbol: '$',
          isBase: false,
          exchangeRate: 0.0067,
        })
        .mockResolvedValueOnce(null);

      await expect(convertCurrency(100, 'USD', 'INVALID')).rejects.toThrow('Currency not found');
    });
  });

  describe('convertToBaseCurrency', () => {
    it('should return same amount when currency is base currency', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      mockCurrencyFindUnique.mockResolvedValue(baseCurrency);

      const result = await convertToBaseCurrency(100, 'JPY');

      expect(result).toBe(100);
    });

    it('should convert non-base currency to base currency', async () => {
      const currency = {
        id: 'currency-2',
        code: 'USD',
        symbol: '$',
        isBase: false,
        exchangeRate: 0.0067,
      };

      mockCurrencyFindUnique.mockResolvedValue(currency);

      const result = await convertToBaseCurrency(6.7, 'USD');

      expect(result).toBe(1000); // 6.7 / 0.0067
    });

    it('should throw error when currency is not found', async () => {
      mockCurrencyFindUnique.mockResolvedValue(null);

      await expect(convertToBaseCurrency(100, 'INVALID')).rejects.toThrow('Currency not found');
    });
  });

  describe('formatCurrency', () => {
    it('should format positive amount with currency symbol', () => {
      expect(formatCurrency(100.5, 'USD', '$')).toBe('$100.50');
      expect(formatCurrency(1000, 'EUR', '€')).toBe('€1,000.00');
      expect(formatCurrency(1234.56, 'GBP', '£')).toBe('£1,234.56');
    });

    it('should format negative amount with minus sign', () => {
      expect(formatCurrency(-100.5, 'USD', '$')).toBe('-$100.50');
      expect(formatCurrency(-1000, 'EUR', '€')).toBe('-€1,000.00');
    });

    it('should format zero amount', () => {
      expect(formatCurrency(0, 'USD', '$')).toBe('$0.00');
      expect(formatCurrency(-0, 'USD', '$')).toBe('$0.00');
    });

    it('should format small amounts with two decimal places', () => {
      expect(formatCurrency(0.01, 'USD', '$')).toBe('$0.01');
      expect(formatCurrency(0.1, 'USD', '$')).toBe('$0.10');
    });

    it('should format large amounts with thousand separators', () => {
      expect(formatCurrency(1000000, 'USD', '$')).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89, 'EUR', '€')).toBe('€1,234,567.89');
    });

    it('should handle amounts with many decimal places', () => {
      expect(formatCurrency(100.123456, 'USD', '$')).toBe('$100.12');
      expect(formatCurrency(100.999, 'USD', '$')).toBe('$101.00');
    });
  });

  describe('getBaseCurrency', () => {
    it('should return base currency from database', async () => {
      const baseCurrency = {
        id: 'currency-1',
        code: 'JPY',
        symbol: '¥',
        isBase: true,
        exchangeRate: 1,
      };

      mockCurrencyFindFirst.mockResolvedValue(baseCurrency);

      const result = await getBaseCurrency();

      expect(result).toEqual(baseCurrency);
      expect(mockCurrencyFindFirst).toHaveBeenCalledWith({
        where: { isBase: true },
      });
    });

    it('should return null when no base currency is configured', async () => {
      mockCurrencyFindFirst.mockResolvedValue(null);

      const result = await getBaseCurrency();

      expect(result).toBeNull();
    });
  });
});

