import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Fetch real-time exchange rates from free API
 * Uses exchangerate-api.com (free tier, no API key required for basic usage)
 * Fallback to exchangerate.host if first fails
 */
export const fetchExchangeRates = async (baseCurrency: string = 'JPY'): Promise<Record<string, number> | null> => {
  // Try exchangerate-api.com first (more reliable)
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (response.ok) {
      const data = await response.json();
      if (data.rates) {
        logger.info(`Successfully fetched exchange rates from exchangerate-api.com`);
        return data.rates;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch from exchangerate-api.com, trying fallback...', error);
  }

  // Fallback to exchangerate.host
  try {
    const response = await fetch(`https://api.exchangerate.host/latest?base=${baseCurrency}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.rates) {
        logger.info(`Successfully fetched exchange rates from exchangerate.host`);
        return data.rates;
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch from exchangerate.host', error);
  }

  logger.error('All exchange rate API calls failed');
  return null;
};

/**
 * Update exchange rates for all currencies from API
 */
export const updateExchangeRates = async (): Promise<void> => {
  try {
    const baseCurrency = await getBaseCurrency();
    if (!baseCurrency) {
      throw new Error('Base currency not configured');
    }

    const rates = await fetchExchangeRates(baseCurrency.code);
    if (!rates) {
      logger.warn('Could not fetch exchange rates, keeping existing rates');
      return;
    }

    const currencies = await prisma.currency.findMany({
      where: { isBase: false },
    });

    for (const currency of currencies) {
      const rate = rates[currency.code];
      if (rate) {
        await prisma.currency.update({
          where: { code: currency.code },
          data: { exchangeRate: rate },
        });
        logger.info(`Updated exchange rate for ${currency.code}: ${rate}`);
      } else {
        logger.warn(`Exchange rate not found for ${currency.code}`);
      }
    }
  } catch (error) {
    logger.error('Error updating exchange rates:', error);
    throw error;
  }
};

/**
 * Convert amount from one currency to another
 */
export const convertCurrency = async (
  amount: number,
  fromCurrencyCode: string,
  toCurrencyCode: string
): Promise<number> => {
  if (fromCurrencyCode === toCurrencyCode) {
    return amount;
  }

  // Get currencies with their exchange rates
  const [fromCurrency, toCurrency] = await Promise.all([
    prisma.currency.findUnique({ where: { code: fromCurrencyCode } }),
    prisma.currency.findUnique({ where: { code: toCurrencyCode } }),
  ]);

  if (!fromCurrency || !toCurrency) {
    throw new Error('Currency not found');
  }

  if (fromCurrency.isBase) {
    return amount * toCurrency.exchangeRate;
  }

  if (toCurrency.isBase) {
    return amount / fromCurrency.exchangeRate;
  }

  const amountInBase = amount / fromCurrency.exchangeRate;
  return amountInBase * toCurrency.exchangeRate;
};

/**
 * Convert amount to base currency
 */
export const convertToBaseCurrency = async (
  amount: number,
  currencyCode: string
): Promise<number> => {
  const currency = await prisma.currency.findUnique({
    where: { code: currencyCode },
  });

  if (!currency) {
    throw new Error('Currency not found');
  }

  if (currency.isBase) {
    return amount;
  }

  return amount / currency.exchangeRate;
};

/**
 * Format amount with currency symbol
 */
export const formatCurrency = (
  amount: number,
  currencyCode: string,
  currencySymbol: string
): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol}${formatted}`;
};

/**
 * Get base currency
 */
export const getBaseCurrency = async () => {
  return await prisma.currency.findFirst({
    where: { isBase: true },
  });
};

