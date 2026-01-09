export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT';
  balance: number;
  currency: Currency;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  percentage: number;
  description?: string;
}

export interface Budget {
  id: string;
  category: BudgetCategory;
  startingBalance: number;
  allocatedAmount: number;
  currentBalance: number;
  year: number;
}

export interface ExpenseType {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface TransactionType {
  id: string;
  name: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REIMBURSEMENT' | 'ACCOUNT_TRANSFER_IN';
  description?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description?: string;
  isReimbursable: boolean;
  reimbursementId?: string;
  notes?: string;
  account: Account;
  currency: Currency;
  expenseType?: ExpenseType;
  transactionType: TransactionType;
  budgetCategory: BudgetCategory;
  linkedTransaction?: Transaction;
  createdAt: string;
}

export interface DashboardStats {
  totalBalance: number;
  baseCurrency: {
    code: string;
    symbol: string;
  };
  balanceByCategory: {
    categoryName: string;
    balance: number;
    percentage: number;
    allocated: number;
    starting: number;
  }[];
  balanceByCurrency: {
    currencyCode: string;
    currencySymbol: string;
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
  recentTransactions: Transaction[];
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

export interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: {
    row: number;
    field?: string;
    message: string;
  }[];
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  transactionTypeId?: string;
  expenseTypeId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}

