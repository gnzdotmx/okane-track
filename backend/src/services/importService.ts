import prisma from '../config/database';
import transactionRepository from '../repositories/transactionRepository';
import accountRepository from '../repositories/accountRepository';
import budgetRepository from '../repositories/budgetRepository';
import { convertToBaseCurrency } from '../utils/currency';
import {
  parseUserCSV,
  parseAmount,
  parseDate,
  inferBudgetCategory,
  isReimbursableExpense,
  exportToCSV,
} from '../utils/csvParser';
import { ImportResult, ImportError } from '../types';
import logger from '../config/logger';

export class ImportService {
  async importCSV(userId: string, fileContent: string, accountId?: string): Promise<ImportResult> {
    const errors: ImportError[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      const parsedTransactions = parseUserCSV(fileContent);
      const totalRecords = parsedTransactions.length;

      logger.info(`Importing ${totalRecords} transactions for user ${userId}`);

      // Check if CSV contains account information
      const hasAccountInfo = parsedTransactions.some(tx => tx.accountId || tx.accountName);
      
      // Get all accounts for the user if CSV has account info, otherwise get the specified account
      const [allAccounts, defaultAccount, currencies, expenseTypes, transactionTypes, budgetCategories] =
        await Promise.all([
          hasAccountInfo ? accountRepository.findAllByUser(userId) : Promise.resolve([]),
          accountId ? accountRepository.findById(accountId, userId) : Promise.resolve(null),
          accountRepository.getCurrencies(),
          accountRepository.getExpenseTypes(),
          accountRepository.getTransactionTypes(),
          budgetRepository.getBudgetCategories(),
        ]);

      // If accountId was provided but account not found, throw error
      if (accountId && !defaultAccount) {
        throw new Error('Account not found');
      }

      // Create account lookup maps (by ID and by name)
      const accountMapById = new Map(allAccounts.map((a: any) => [a.id, a]));
      const accountMapByName = new Map(allAccounts.map((a: any) => [a.name.toLowerCase(), a]));

      // If no account info in CSV and no default account provided, throw error
      if (!hasAccountInfo && !defaultAccount) {
        throw new Error('Account ID is required when CSV does not contain account information');
      }

      // Create maps for quick lookup
      const currencyMap = new Map(currencies.map((c: any) => [c.code, c.id]));
      const expenseTypeMap = new Map(expenseTypes.map((e: any) => [e.name, e.id]));
      const transactionTypeMap = new Map(transactionTypes.map((t: any) => [t.name, t.id]));
      const budgetCategoryMap = new Map(budgetCategories.map((b: any) => [b.name, b.id]));

      const transactionsToCreate: any[] = [];

      for (let i = 0; i < parsedTransactions.length; i++) {
        const tx = parsedTransactions[i];

        try {
          // Determine account for this transaction
          let account = null;
          if (tx.accountId) {
            // Look up by account ID from CSV
            account = accountMapById.get(tx.accountId);
            // If account ID not found, try falling back to account name
            if (!account && tx.accountName) {
              account = accountMapByName.get(tx.accountName.toLowerCase());
              if (account) {
                logger.warn(`Account ID ${tx.accountId} not found, but found account by name: ${tx.accountName}`);
              }
            }
            if (!account) {
              errors.push({
                row: i + 1,
                field: 'account',
                message: `Account ID "${tx.accountId}" not found${tx.accountName ? ` and account name "${tx.accountName}" not found` : ''}. Please ensure the account exists in your account list.`,
              });
              errorCount++;
              continue;
            }
          } else if (tx.accountName) {
            // Look up by account name from CSV
            account = accountMapByName.get(tx.accountName.toLowerCase());
            if (!account) {
              errors.push({
                row: i + 1,
                field: 'account',
                message: `Account name "${tx.accountName}" not found. Please ensure the account exists in your account list.`,
              });
              errorCount++;
              continue;
            }
          } else {
            // Use default account (provided as parameter or from first transaction)
            account = defaultAccount;
            if (!account) {
              errors.push({
                row: i + 1,
                field: 'account',
                message: 'Account information is required in CSV or as parameter',
              });
              errorCount++;
              continue;
            }
          }

          const amount = parseAmount(tx.amount);
          if (!amount || amount <= 0) {
            errors.push({
              row: i + 1,
              field: 'amount',
              message: `Invalid amount: ${tx.amount}`,
            });
            errorCount++;
            continue;
          }

          const date = parseDate(tx.date);
          if (!date) {
            errors.push({
              row: i + 1,
              field: 'date',
              message: `Invalid date: ${tx.date}`,
            });
            errorCount++;
            continue;
          }

          // Get expense type
          const expenseTypeId = expenseTypeMap.get(tx.type);

          // Determine transaction type
          // Use transactionType from CSV parser if available (it handles detection based on Tipo field)
          let transactionTypeName = tx.transactionType || 'EXPENSE';
          
          // Fallback: if transactionType wasn't set by parser, determine from type field
          if (!tx.transactionType) {
            const tipoLower = tx.type.toLowerCase();
            if (tx.type === 'Ingresos' || tx.type === 'Income') {
              transactionTypeName = 'INCOME';
            } else if (
              tipoLower === 'transfer in' ||
              tipoLower === 'transferencia entrada' ||
              tipoLower === 'transferencia in' ||
              tipoLower === 'inter-account transfer in' ||
              tipoLower === 'account transfer in' ||
              (tipoLower.includes('transfer') && tipoLower.includes('in'))
            ) {
              transactionTypeName = 'ACCOUNT_TRANSFER_IN';
            } else if (
              tipoLower === 'reembolso' ||
              tipoLower === 'reimbursement' ||
              tipoLower.includes('reembolso') ||
              tipoLower.includes('reimbursement')
            ) {
              transactionTypeName = 'REIMBURSEMENT';
            }
          } else {
            transactionTypeName = tx.transactionType;
          }

          const transactionTypeId = transactionTypeMap.get(transactionTypeName);
          if (!transactionTypeId) {
            errors.push({
              row: i + 1,
              field: 'transactionType',
              message: `Unknown transaction type: ${transactionTypeName}`,
            });
            errorCount++;
            continue;
          }

          // Use exported Source/Dest (budget category) if available, otherwise infer
          const categoryName = tx.sourceDestination || inferBudgetCategory(tx.type, tx.description, amount);
          const budgetCategoryId = budgetCategoryMap.get(categoryName);
          if (!budgetCategoryId) {
            errors.push({
              row: i + 1,
              field: 'category',
              message: `Unknown budget category: ${categoryName}`,
            });
            errorCount++;
            continue;
          }

          const isReimbursable = tx.reimbursable === 'YES' || 
                                 (tx.reimbursable === undefined && isReimbursableExpense(tx.description));
          // Use exported reimbursement ID if available, otherwise generate new one
          const reimbursementId = tx.reimbursementId || (isReimbursable
            ? `REIMB-${date.toISOString().slice(0, 7)}-${i.toString().padStart(3, '0')}`
            : undefined);

          transactionsToCreate.push({
            userId,
            accountId: account.id,
            currencyId: account.currencyId,
            date,
            amount,
            description: tx.description,
            expenseTypeId,
            transactionTypeId,
            budgetCategoryId,
            isReimbursable,
            reimbursementId,
          });

          successCount++;
        } catch (error: any) {
          errors.push({
            row: i + 1,
            message: error.message || 'Unknown error processing transaction',
          });
          errorCount++;
        }
      }

      if (transactionsToCreate.length > 0) {
        await transactionRepository.createMany(transactionsToCreate);
        logger.info(`Successfully imported ${successCount} transactions`);

        // Update balances for all affected accounts
        const affectedAccountIds = new Set(transactionsToCreate.map((tx) => tx.accountId));
        for (const accId of affectedAccountIds) {
          await this.updateAccountBalanceAfterImport(accId, userId);
        }
        
        const affectedCategories = new Set(
          transactionsToCreate.map((tx) => tx.budgetCategoryId)
        );
        for (const categoryId of affectedCategories) {
          await this.updateBudgetBalanceAfterImport(categoryId, userId);
        }
      }

      await prisma.importHistory.create({
        data: {
          userId,
          fileName: 'CSV Import',
          recordCount: totalRecords,
          successCount,
          errorCount,
          errors: JSON.stringify(errors),
        },
      });

      return {
        success: errorCount === 0,
        totalRecords,
        successCount,
        errorCount,
        errors,
      };
    } catch (error: any) {
      logger.error('Import failed:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  async exportCSV(userId: string, filters?: any): Promise<string> {
    const transactions = await transactionRepository.findAll(userId, filters);
    return exportToCSV(transactions);
  }

  async getImportHistory(userId: string) {
    return await prisma.importHistory.findMany({
      where: { userId },
      orderBy: { importedAt: 'desc' },
      take: 10,
    });
  }

  private async updateAccountBalanceAfterImport(accountId: string, userId: string) {
    const account = await accountRepository.findById(accountId, userId);
    if (!account) return;

    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      include: { transactionType: true },
    });

    let initialBalance = (account as any).initialBalance;
    
    if (!initialBalance || initialBalance === 0) {
      let transactionSum = 0;
      for (const tx of transactions) {
        if (
          tx.transactionType.name === 'INCOME' ||
          tx.transactionType.name === 'REIMBURSEMENT' ||
          tx.transactionType.name === 'ACCOUNT_TRANSFER_IN'
        ) {
          transactionSum += tx.amount;
        } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
          transactionSum -= tx.amount;
        }
      }

      if (account.balance !== 0 && transactions.length > 0) {
        initialBalance = account.balance - transactionSum;
        try {
          await prisma.account.update({
            where: { id: accountId },
            data: { initialBalance: initialBalance } as any,
          });
          logger.info(`Set initialBalance for account ${accountId}: ${initialBalance}`);
        } catch (error) {
          logger.warn(`Could not update initialBalance (field may not exist): ${error}`);
        }
      } else {
        initialBalance = 0;
      }
    }

    let balance = initialBalance;
    for (const tx of transactions) {
      if (
        tx.transactionType.name === 'INCOME' ||
        tx.transactionType.name === 'REIMBURSEMENT' ||
        tx.transactionType.name === 'ACCOUNT_TRANSFER_IN'
      ) {
        balance += tx.amount;
      } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
        balance -= tx.amount;
      }
    }

    await accountRepository.updateBalance(accountId, balance);
    logger.info(`Updated account balance for ${accountId}: ${balance} (initial: ${initialBalance}, transactions: ${transactions.length})`);
  }

  private async updateBudgetBalanceAfterImport(categoryId: string, userId: string) {
    const currentYear = new Date().getFullYear();
    const budget = await budgetRepository.findByUserCategoryAndYear(userId, categoryId, currentYear);
    
    if (!budget) return;

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        budgetCategoryId: categoryId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { transactionType: true, currency: true, expenseType: true },
    });

    let balance = budget.startingBalance;
    for (const tx of transactions) {
      const isInterAccountTransfer = tx.expenseType?.name === 'Transferencia Entre Cuentas' || tx.expenseType?.name === 'Inter-Account Transfer';
      if (isInterAccountTransfer) {
        continue;
      }

      const isAccountTransferIn = tx.transactionType.name === 'ACCOUNT_TRANSFER_IN';
      const isReimbursement = tx.transactionType.name === 'REIMBURSEMENT';
      if (isAccountTransferIn || isReimbursement) {
        continue;
      }

      const amountInBase = await convertToBaseCurrency(tx.amount, tx.currency.code);
      
      if (tx.transactionType.name === 'INCOME') {
        balance += amountInBase;
      } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
        balance -= amountInBase;
      }
    }

    await budgetRepository.updateBalance(budget.id, balance);
    logger.info(`Updated budget balance for category ${categoryId}: ${balance}`);
  }
}

export default new ImportService();

