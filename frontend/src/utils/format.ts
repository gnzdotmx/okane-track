import { format as formatDate, parseISO } from 'date-fns';

export const formatCurrency = (
  amount: number,
  currencySymbol: string = '¥'
): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol}${formatted}`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDateString = (dateString: string, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    const date = parseISO(dateString);
    return formatDate(date, formatStr);
  } catch {
    return dateString;
  }
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const getCategoryColor = (categoryName: string): string => {
  const colors: { [key: string]: string } = {
    Expenses: '#FF9800',
    Savings: '#4CAF50',
    Investment: '#2196F3',
    Emergencies: '#F44336',
  };

  return colors[categoryName] || '#9E9E9E';
};

export const getTransactionTypeColor = (
  typeName: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REIMBURSEMENT'
): string => {
  const colors = {
    EXPENSE: '#F44336',
    INCOME: '#4CAF50',
    TRANSFER: '#9C27B0',
    REIMBURSEMENT: '#FFC107',
  };

  return colors[typeName] || '#9E9E9E';
};

export const downloadCSV = (content: string | Blob, filename: string = 'transactions.csv') => {
  const blob = typeof content === 'string' 
    ? new Blob([content], { type: 'text/csv;charset=utf-8;' })
    : content;
    
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

