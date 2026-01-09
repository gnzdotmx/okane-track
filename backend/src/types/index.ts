import { Request } from 'express';

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Transaction filters
export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
  categoryId?: string;
  transactionTypeId?: string;
  expenseTypeId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalBalance: number;
  baseCurrency?: {
    code: string;
    symbol: string;
  };
  balanceByCategory: {
    categoryName: string;
    balance: number;
    percentage: number;
  }[];
  balanceByCurrency: {
    currencyCode: string;
    balance: number;
    balanceInBase: number;
  }[];
  accounts: {
    id: string;
    name: string;
    type: string;
    balance: number;
    balanceInBase: number;
    currencyCode: string;
    currencySymbol: string;
    isActive: boolean;
  }[];
  recentTransactions: any[];
  monthlyStats: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
  totalReimbursed: number;
  spendingByExpenseType: {
    expenseTypeName: string;
    amount: number;
    icon?: string;
    color?: string;
  }[];
}

// CSV Import result
export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

// Multi-currency display
export interface MultiCurrencyAmount {
  amount: number;
  currencyCode: string;
  amountInBase: number;
  baseCurrencyCode: string;
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

