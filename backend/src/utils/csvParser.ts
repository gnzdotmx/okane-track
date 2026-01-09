import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { ImportResult, ImportError } from '../types';

export interface ParsedTransaction {
  date: string;
  amount: string;
  type: string;
  description: string;
  sourceDestination?: string;
  reimbursable?: string;
  reimbursementId?: string;
  transactionType?: string;
}

/**
 * Parse CSV content into transactions
 */
export const parseCSV = (content: string): ParsedTransaction[] => {
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error}`);
  }
};

/**
 * Parse CSV format with custom column mapping
 */
export const parseUserCSV = (content: string): ParsedTransaction[] => {
  try {
    const lines = content.split('\n');
    
    if (lines.length < 2) {
      return [];
    }
    
    // Parse header row to find column indices
    const headerLine = lines[0];
    const headerValues: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headerValues.push(current.trim().replace(/"/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    headerValues.push(current.trim().replace(/"/g, ''));
    
    // Support both English and Spanish column names for backward compatibility
    const fechaIndex = headerValues.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'fecha' || lower === 'date';
    });
    const cantidadIndex = headerValues.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'cantidad' || lower === 'amount';
    });
    const tipoIndex = headerValues.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'tipo' || lower === 'type';
    });
    const descripcionIndex = headerValues.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'descripción' || lower === 'descripcion' || lower === 'description';
    });
    const reembolsableIndex = headerValues.findIndex(h => {
      const lower = h.toLowerCase();
      return lower === 'reembolsable' || lower === 'reimbursable';
    });
    
    if (fechaIndex === -1 || cantidadIndex === -1 || tipoIndex === -1) {
      throw new Error('CSV must contain Date (or Fecha), Amount (or Cantidad), and Type (or Tipo) columns');
    }
    
    const dataLines = lines.slice(1).filter(line => line.trim());
    const transactions: ParsedTransaction[] = [];
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      // Parse CSV line - split by comma but respect quoted values
      const values: string[] = [];
      current = '';
      inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      if (values.length < 3) continue; // Skip invalid rows
      
      const fecha = values[fechaIndex]?.replace(/"/g, '').trim();
      const cantidad = values[cantidadIndex]?.replace(/"/g, '').trim();
      const tipo = values[tipoIndex]?.replace(/"/g, '').trim();
      const descripcion = descripcionIndex !== -1 ? values[descripcionIndex]?.replace(/"/g, '').trim() || '' : '';
      const reembolsable = reembolsableIndex !== -1 ? values[reembolsableIndex]?.replace(/"/g, '').trim().toUpperCase() : '';
      
      // Skip header row or invalid rows
      const fechaLower = fecha.toLowerCase();
      if (!fecha || !cantidad || fechaLower === 'fecha' || fechaLower === 'date' || fechaLower.includes('fecha') || fechaLower.includes('date')) {
        continue;
      }
      
      // Skip rows that are just summary calculations
      if (descripcion.toLowerCase().includes('total') || descripcion.toLowerCase().includes('sum')) {
        continue;
      }
      
      // Validate date format (should be YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        continue;
      }
      
      // Determine if reimbursable: check "Reimbursable" column first, fallback to keyword matching
      let isReimbursable = 'NO';
      if (reembolsableIndex !== -1 && reembolsable) {
        // Use the "Reimbursable" column value (support both Spanish and English)
        const reembolsableUpper = reembolsable.toUpperCase();
        isReimbursable = (reembolsableUpper === 'SI' || reembolsableUpper === 'SÍ' || reembolsableUpper === 'YES') ? 'YES' : 'NO';
      } else {
        // Fallback to keyword matching if column doesn't exist
        isReimbursable = isReimbursableExpense(descripcion) ? 'YES' : 'NO';
      }
      
      // Determine transaction type based on Type field
      let transactionType = 'EXPENSE';
      const tipoLower = tipo.toLowerCase();
      
      if (tipoLower === 'ingresos' || tipoLower === 'income') {
        transactionType = 'INCOME';
      } else if (
        tipoLower === 'transfer in' ||
        tipoLower === 'transferencia entrada' ||
        tipoLower === 'transferencia in' ||
        tipoLower === 'account transfer in' ||
        tipoLower === 'inter-account transfer in' ||
        (tipoLower.includes('transfer') && tipoLower.includes('in'))
      ) {
        transactionType = 'ACCOUNT_TRANSFER_IN';
      } else if (
        tipoLower === 'reembolso' ||
        tipoLower === 'reimbursement' ||
        tipoLower.includes('reembolso') ||
        tipoLower.includes('reimbursement')
      ) {
        transactionType = 'REIMBURSEMENT';
      }
      
      transactions.push({
        date: fecha,
        amount: cantidad,
        type: tipo,
        description: descripcion,
        sourceDestination: 'Expenses',
        reimbursable: isReimbursable,
        transactionType: transactionType,
      });
    }
    
    return transactions;
  } catch (error) {
    throw new Error(`Failed to parse user CSV: ${error}`);
  }
};

/**
 * Clean and normalize amount string
 */
export const parseAmount = (amountStr: string): number | null => {
  if (!amountStr) return null;
  
  try {
    // Remove currency symbols and spaces
    let cleaned = amountStr
      .replace(/[¥$€£,\s]/g, '')
      .trim();
    
    // Handle negative amounts
    const isNegative = cleaned.startsWith('-');
    cleaned = cleaned.replace('-', '');
    
    const amount = parseFloat(cleaned);
    
    if (isNaN(amount)) return null;
    
    return isNegative ? -amount : amount;
  } catch {
    return null;
  }
};

/**
 * Validate date string
 */
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Export transactions to CSV
 */
export const exportToCSV = (transactions: any[]): string => {
  const records = transactions.map(t => ({
    Date: t.date,
    Amount: t.amount,
    Type: t.expenseType?.name || '',
    Description: t.description || '',
    'Source/Dest': t.budgetCategory?.name || '',
    Reimbursable: t.isReimbursable ? 'YES' : 'NO',
    'Reimb ID': t.reimbursementId || '',
    'Transaction Type': t.transactionType?.name || '',
  }));

  return stringify(records, {
    header: true,
    quoted: true,
  });
};

/**
 * Determine budget category from transaction type and description
 */
export const inferBudgetCategory = (
  tipo: string,
  descripcion: string,
  amount: number
): string => {
  const desc = descripcion.toLowerCase();
  
  // Income always goes to appropriate categories (will be split later)
  const tipoLower = tipo.toLowerCase();
  if (tipoLower === 'ingresos' || tipoLower === 'income') {
    if (desc.includes('interes') || desc.includes('interest')) {
      return 'Savings';
    }
    return 'Expenses'; // Default for income splitting
  }
  
  // Emergency expenses
  if (tipoLower === 'emergencia' || tipoLower === 'emergency' || desc.includes('emergencia') || desc.includes('emergency') || desc.includes('problema') || desc.includes('problem')) {
    return 'Emergencies';
  }
  
  // Large purchases from savings
  if (amount > 50000) {
    if (desc.includes('travel') || desc.includes('flight') || 
        desc.includes('purchase') || desc.includes('large')) {
      return 'Savings';
    }
  }
  
  // Inter-account transfers - should not count as expenses in reports
  if (tipoLower === 'transferencia entre cuentas' || tipoLower === 'inter-account transfer' || desc.includes('transferencia entre cuentas') || desc.includes('inter-account transfer')) {
    return 'Expenses'; // Category doesn't matter since it will be filtered out
  }
  
  if (tipoLower === 'account transfer' || desc.includes('account transfer')) {
    return 'Expenses';
  }
  
  if (desc.includes('transfer') && !desc.includes('account transfer') && !desc.includes('transferencia entre cuentas') && !desc.includes('inter-account transfer')) {
    return 'Savings';
  }
  
  return 'Expenses';
};

/**
 * Determine if expense is reimbursable
 */
export const isReimbursableExpense = (description: string): boolean => {
  const desc = description.toLowerCase();
  return desc.includes('reimbursable') || 
         desc.includes('reembolsable') ||
         desc.includes('business expense') ||
         desc.includes('work travel');
};

