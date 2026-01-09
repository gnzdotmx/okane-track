import {
  parseCSV,
  parseUserCSV,
  parseAmount,
  parseDate,
  exportToCSV,
  inferBudgetCategory,
  isReimbursableExpense,
  ParsedTransaction,
} from '../csvParser';

describe('csvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `date,amount,type,description
2024-01-15,100.50,EXPENSE,Grocery shopping
2024-01-16,200.75,INCOME,Salary`;

      const result = parseCSV(csvContent);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-15',
        amount: '100.50',
        type: 'EXPENSE',
        description: 'Grocery shopping',
      });
      expect(result[1]).toEqual({
        date: '2024-01-16',
        amount: '200.75',
        type: 'INCOME',
        description: 'Salary',
      });
    });

    it('should skip empty lines', () => {
      const csvContent = `date,amount,type,description
2024-01-15,100.50,EXPENSE,Grocery shopping

2024-01-16,200.75,INCOME,Salary`;

      const result = parseCSV(csvContent);

      expect(result).toHaveLength(2);
    });

    it('should trim whitespace from values', () => {
      const csvContent = `date,amount,type,description
  2024-01-15  ,  100.50  ,  EXPENSE  ,  Grocery shopping  `;

      const result = parseCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].amount).toBe('100.50');
      expect(result[0].type).toBe('EXPENSE');
      expect(result[0].description).toBe('Grocery shopping');
    });

    it('should handle BOM (Byte Order Mark)', () => {
      const csvContent = `\ufeffdate,amount,type,description
2024-01-15,100.50,EXPENSE,Grocery shopping`;

      const result = parseCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should throw error for invalid CSV', () => {
      const invalidCsv = 'invalid,csv,content\nunclosed"quote';

      expect(() => parseCSV(invalidCsv)).toThrow('Failed to parse CSV');
    });

    it('should handle quoted values with commas', () => {
      const csvContent = `date,amount,type,description
2024-01-15,100.50,EXPENSE,"Grocery, shopping"`;

      const result = parseCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Grocery, shopping');
    });
  });

  describe('parseUserCSV', () => {
    it('should parse CSV with Spanish headers', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.50,Gastos,Grocery shopping`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2024-01-15',
        amount: '100.50',
        type: 'Gastos',
        description: 'Grocery shopping',
        sourceDestination: 'Expenses',
        reimbursable: 'NO',
        transactionType: 'EXPENSE',
      });
    });

    it('should handle descripcion without accent', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripcion
2024-01-15,100.50,Gastos,Grocery shopping`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Grocery shopping');
    });

    it('should parse CSV with English headers', () => {
      const csvContent = `Date,Amount,Type,Description
2024-01-15,100.50,Expense,Grocery shopping`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2024-01-15',
        amount: '100.50',
        type: 'Expense',
        description: 'Grocery shopping',
        sourceDestination: 'Expenses',
        reimbursable: 'NO',
        transactionType: 'EXPENSE',
      });
    });

    it('should parse CSV with mixed English/Spanish headers', () => {
      const csvContent = `Date,Cantidad,Type,Descripción
2024-01-15,100.50,Expense,Grocery shopping`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].amount).toBe('100.50');
    });

    it('should return empty array for content with less than 2 lines', () => {
      expect(parseUserCSV('')).toEqual([]);
      expect(parseUserCSV('Fecha,Cantidad,Tipo')).toEqual([]);
    });

    it('should throw error if required columns are missing', () => {
      const csvContent = `Fecha,Cantidad
2024-01-15,100.50`;

      expect(() => parseUserCSV(csvContent)).toThrow(
        'CSV must contain Date (or Fecha), Amount (or Cantidad), and Type (or Tipo) columns'
      );
    });

    it('should skip rows with invalid date format', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024/01/15,100.50,Gastos,Invalid date
2024-01-16,200.75,Gastos,Valid date`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-16');
    });

    it('should skip rows that are header duplicates', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.50,Gastos,Valid row`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should skip rows with total or sum in description', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.50,Gastos,Total expenses
2024-01-16,200.75,Gastos,Sum of all
2024-01-17,50.25,Gastos,Valid transaction`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-17');
    });

    it('should handle quoted values in CSV', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
"2024-01-15","100.50","Gastos","Grocery, shopping"`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Grocery, shopping');
    });

    it('should detect INCOME transaction type', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,1000.00,Ingresos,Salary`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].transactionType).toBe('INCOME');
    });

    it('should detect ACCOUNT_TRANSFER_IN transaction type', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,500.00,Transfer In,Transfer from savings
2024-01-16,300.00,Transferencia Entrada,Transfer from checking
2024-01-17,200.00,Account Transfer In,Transfer from account`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(3);
      expect(result[0].transactionType).toBe('ACCOUNT_TRANSFER_IN');
      expect(result[1].transactionType).toBe('ACCOUNT_TRANSFER_IN');
      expect(result[2].transactionType).toBe('ACCOUNT_TRANSFER_IN');
    });

    it('should detect REIMBURSEMENT transaction type', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.00,Reembolso,Reimbursement
2024-01-16,200.00,Reimbursement,Work expense`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(2);
      expect(result[0].transactionType).toBe('REIMBURSEMENT');
      expect(result[1].transactionType).toBe('REIMBURSEMENT');
    });

    it('should handle Reembolsable column with SI value', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción,Reembolsable
2024-01-15,100.50,Gastos,Business expense,SI`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].reimbursable).toBe('YES');
    });

    it('should handle Reembolsable column with SÍ value', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción,Reembolsable
2024-01-15,100.50,Gastos,Business expense,SÍ`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].reimbursable).toBe('YES');
    });

    it('should handle Reembolsable column with YES value', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción,Reembolsable
2024-01-15,100.50,Gastos,Business expense,YES`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].reimbursable).toBe('YES');
    });

    it('should handle Reimbursable column with English headers', () => {
      const csvContent = `Date,Amount,Type,Description,Reimbursable
2024-01-15,100.50,Expense,Business expense,YES`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].reimbursable).toBe('YES');
    });

    it('should fallback to keyword matching when Reembolsable column is missing', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.50,Gastos,Reimbursable business expense`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].reimbursable).toBe('YES');
    });

    it('should skip rows with less than 3 values', () => {
      const csvContent = `Fecha,Cantidad,Tipo,Descripción
2024-01-15,100.50
2024-01-16,200.75,Gastos,Valid row`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-16');
    });

    it('should handle missing Descripción column', () => {
      const csvContent = `Fecha,Cantidad,Tipo
2024-01-15,100.50,Gastos`;

      const result = parseUserCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('');
    });

    it('should throw error for invalid CSV format', () => {
      const invalidCsv = 'invalid,csv,format\nunclosed"quote';

      expect(() => parseUserCSV(invalidCsv)).toThrow('Failed to parse user CSV');
    });
  });

  describe('parseAmount', () => {
    it('should parse simple numeric amount', () => {
      expect(parseAmount('100.50')).toBe(100.5);
      expect(parseAmount('200')).toBe(200);
    });

    it('should remove currency symbols', () => {
      expect(parseAmount('$100.50')).toBe(100.5);
      expect(parseAmount('€200.75')).toBe(200.75);
      expect(parseAmount('£150.25')).toBe(150.25);
      expect(parseAmount('¥1000')).toBe(1000);
    });

    it('should remove commas and spaces', () => {
      expect(parseAmount('1,000.50')).toBe(1000.5);
      expect(parseAmount('1 000.50')).toBe(1000.5);
      expect(parseAmount('1, 000.50')).toBe(1000.5);
    });

    it('should handle negative amounts', () => {
      expect(parseAmount('-100.50')).toBe(-100.5);
      expect(parseAmount('-$200.75')).toBe(-200.75);
    });

    it('should return null for empty string', () => {
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('   ')).toBeNull();
    });

    it('should return null for invalid amount', () => {
      expect(parseAmount('abc')).toBeNull();
      expect(parseAmount('not a number')).toBeNull();
    });

    it('should handle amounts with multiple negative signs', () => {
      expect(parseAmount('--100.50')).toBe(100.5); // Only first negative is considered
    });

    it('should handle decimal amounts', () => {
      expect(parseAmount('100.99')).toBe(100.99);
      expect(parseAmount('0.01')).toBe(0.01);
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const date = parseDate('2024-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0); // January is 0
      expect(date?.getDate()).toBe(15);
    });

    it('should parse ISO date string', () => {
      const date = parseDate('2024-01-15T10:30:00Z');
      expect(date).toBeInstanceOf(Date);
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('   ')).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('invalid date')).toBeNull();
      expect(parseDate('2024-13-45')).toBeNull(); // Invalid month/day
    });

    it('should handle various date formats', () => {
      expect(parseDate('2024/01/15')).toBeInstanceOf(Date);
      expect(parseDate('01/15/2024')).toBeInstanceOf(Date);
    });
  });

  describe('exportToCSV', () => {
    it('should export transactions to CSV format', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 100.5,
          expenseType: { name: 'Food' },
          description: 'Grocery shopping',
          budgetCategory: { name: 'Expenses' },
          isReimbursable: false,
          reimbursementId: '',
          transactionType: { name: 'EXPENSE' },
        },
        {
          date: '2024-01-16',
          amount: 200.75,
          expenseType: { name: 'Transport' },
          description: 'Bus ticket',
          budgetCategory: { name: 'Expenses' },
          isReimbursable: true,
          reimbursementId: 'REIMB-123',
          transactionType: { name: 'EXPENSE' },
        },
      ];

      const result = exportToCSV(transactions);

      expect(result).toContain('Date');
      expect(result).toContain('Amount');
      expect(result).toContain('Type');
      expect(result).toContain('Description');
      expect(result).toContain('2024-01-15');
      expect(result).toContain('2024-01-16');
      expect(result).toContain('Food');
      expect(result).toContain('Transport');
      expect(result).toContain('YES');
      expect(result).toContain('NO');
    });

    it('should handle missing optional fields', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 100.5,
          description: 'Transaction',
        },
      ];

      const result = exportToCSV(transactions);

      expect(result).toContain('2024-01-15');
      expect(result).toContain('100.5');
    });

    it('should handle empty transactions array', () => {
      const result = exportToCSV([]);

      // csv-stringify returns empty string when there are no records, even with header: true
      expect(result).toBe('');
    });

    it('should quote values with commas', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: 100.5,
          description: 'Grocery, shopping',
          expenseType: { name: 'Food' },
          budgetCategory: { name: 'Expenses' },
          isReimbursable: false,
          reimbursementId: '',
          transactionType: { name: 'EXPENSE' },
        },
      ];

      const result = exportToCSV(transactions);

      expect(result).toContain('Grocery, shopping');
    });
  });

  describe('inferBudgetCategory', () => {
    it('should return Savings for income with interest', () => {
      expect(inferBudgetCategory('Ingresos', 'Interest payment', 1000)).toBe('Savings');
      expect(inferBudgetCategory('Ingresos', 'Interes bancario', 1000)).toBe('Savings');
    });

    it('should return Expenses for income without interest', () => {
      expect(inferBudgetCategory('Ingresos', 'Salary payment', 1000)).toBe('Expenses');
    });

    it('should return Emergencies for emergency expenses', () => {
      expect(inferBudgetCategory('Emergencia', 'Emergency repair', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Gastos', 'Emergencia médica', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Gastos', 'Problema con el auto', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Emergency', 'Emergency repair', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Expense', 'Emergency repair', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Expense', 'emergency medical', 500)).toBe('Emergencies');
      expect(inferBudgetCategory('Expense', 'problem with car', 500)).toBe('Emergencies');
    });

    it('should return Savings for large travel purchases', () => {
      expect(inferBudgetCategory('Gastos', 'Travel to Europe', 60000)).toBe('Savings');
      expect(inferBudgetCategory('Gastos', 'Flight tickets', 55000)).toBe('Savings');
      expect(inferBudgetCategory('Gastos', 'Large purchase', 51000)).toBe('Savings');
    });

    it('should return Expenses for Transferencia Entre Cuentas', () => {
      expect(inferBudgetCategory('Transferencia Entre Cuentas', 'Transfer', 1000)).toBe('Expenses');
      expect(inferBudgetCategory('Gastos', 'Transferencia entre cuentas', 1000)).toBe('Expenses');
      expect(inferBudgetCategory('Inter-Account Transfer', 'Transfer', 1000)).toBe('Expenses');
      expect(inferBudgetCategory('Expense', 'Inter-Account Transfer', 1000)).toBe('Expenses');
    });

    it('should return Expenses for Account Transfer', () => {
      expect(inferBudgetCategory('Account Transfer', 'Transfer', 1000)).toBe('Expenses');
      expect(inferBudgetCategory('Gastos', 'Account transfer between accounts', 1000)).toBe('Expenses');
    });

    it('should return Savings for other transfers', () => {
      expect(inferBudgetCategory('Gastos', 'Transfer to savings', 1000)).toBe('Savings');
      expect(inferBudgetCategory('Gastos', 'Money transfer', 1000)).toBe('Savings');
    });

    it('should return Expenses as default', () => {
      expect(inferBudgetCategory('Gastos', 'Regular expense', 100)).toBe('Expenses');
      expect(inferBudgetCategory('Gastos', 'Grocery shopping', 50)).toBe('Expenses');
    });

    it('should not return Savings for small amounts even with travel keywords', () => {
      expect(inferBudgetCategory('Gastos', 'Travel expense', 1000)).toBe('Expenses');
    });
  });

  describe('isReimbursableExpense', () => {
    it('should return true for reimbursable keywords', () => {
      expect(isReimbursableExpense('Reimbursable expense')).toBe(true);
      expect(isReimbursableExpense('Reembolsable business expense')).toBe(true);
      expect(isReimbursableExpense('Business expense reimbursable')).toBe(true);
      expect(isReimbursableExpense('Work travel expense')).toBe(true);
    });

    it('should return false for non-reimbursable expenses', () => {
      expect(isReimbursableExpense('Grocery shopping')).toBe(false);
      expect(isReimbursableExpense('Personal expense')).toBe(false);
      expect(isReimbursableExpense('Regular purchase')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isReimbursableExpense('REIMBURSABLE EXPENSE')).toBe(true);
      expect(isReimbursableExpense('ReEmBoLsAbLe')).toBe(true);
      expect(isReimbursableExpense('BUSINESS EXPENSE')).toBe(true);
    });

    it('should match partial words', () => {
      expect(isReimbursableExpense('This is a reimbursable transaction')).toBe(true);
      expect(isReimbursableExpense('Work travel to conference')).toBe(true);
    });
  });
});

