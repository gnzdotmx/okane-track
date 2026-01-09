import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Edit, Delete, Add, FileDownload, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { Transaction, Account, ExpenseType, TransactionType, BudgetCategory } from '../types';
import api from '../services/api';
import Loading from '../components/common/Loading';
import { formatCurrency, formatDateString, downloadCSV } from '../utils/format';

interface TransactionFormData {
  date: string;
  amount: string;
  description: string;
  accountId: string;
  currencyId: string;
  transactionTypeId: string;
  budgetCategoryId: string;
  expenseTypeId: string;
  isReimbursable: boolean;
  notes: string;
}

const initialFormData: TransactionFormData = {
  date: new Date().toISOString().split('T')[0],
  amount: '',
  description: '',
  accountId: '',
  currencyId: '',
  transactionTypeId: '',
  budgetCategoryId: '',
  expenseTypeId: '',
  isReimbursable: false,
  notes: '',
};

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<keyof Transaction | 'account' | 'category' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    categoryId: '',
    transactionTypeId: '',
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  useEffect(() => {
    loadTransactions();
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadReferenceData = async () => {
    try {
      const [accountsRes, typesRes, categoriesRes, expenseTypesRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactionTypes(),
        api.getBudgetCategories(),
        api.getExpenseTypes(),
      ]);
      setAccounts(accountsRes.data);
      setTransactionTypes(typesRes.data);
      setBudgetCategories(categoriesRes.data);
      setExpenseTypes(expenseTypesRes.data);

      // Set defaults
      if (accountsRes.data.length > 0) {
        const defaultAccount = accountsRes.data[0];
        setFormData((prev: TransactionFormData) => ({
          ...prev,
          accountId: defaultAccount.id,
          currencyId: defaultAccount.currency.id,
        }));
      }
    } catch (err) {
      console.error('Failed to load reference data:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.getTransactions(filters);
      setTransactions(response.data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csvBlob = await api.exportCSV(filters);
      downloadCSV(csvBlob, `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.deleteTransaction(id);
      loadTransactions();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleOpenDialog = (transaction?: Transaction) => {
    setError('');
    if (transaction) {
      setEditingId(transaction.id);
      setFormData({
        date: transaction.date.split('T')[0],
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        accountId: transaction.account.id,
        currencyId: transaction.currency.id,
        transactionTypeId: transaction.transactionType.id,
        budgetCategoryId: transaction.budgetCategory.id,
        expenseTypeId: transaction.expenseType?.id || '',
        isReimbursable: transaction.isReimbursable,
        notes: transaction.notes || '',
      });
    } else {
      setEditingId(null);
      // Reset to defaults
      const defaultAccount = accounts[0];
      setFormData({
        ...initialFormData,
        accountId: defaultAccount?.id || '',
        currencyId: defaultAccount?.currency.id || '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: TransactionFormData) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // When account changes, update currency
    if (name === 'accountId') {
      const account = accounts.find((a: Account) => a.id === value);
      if (account) {
        setFormData((prev: TransactionFormData) => ({
          ...prev,
          accountId: value,
          currencyId: account.currency.id,
        }));
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.accountId) {
      setError('Please select an account');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.transactionTypeId) {
      setError('Please select a transaction type');
      return;
    }
    if (!formData.budgetCategoryId) {
      setError('Please select a budget category');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        accountId: formData.accountId,
        currencyId: formData.currencyId,
        date: formData.date,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        transactionTypeId: formData.transactionTypeId,
        budgetCategoryId: formData.budgetCategoryId,
        expenseTypeId: formData.expenseTypeId || undefined,
        isReimbursable: formData.isReimbursable,
        notes: formData.notes || undefined,
      };

      if (editingId) {
        await api.updateTransaction(editingId, payload);
      } else {
        await api.createTransaction(payload);
      }

      handleCloseDialog();
      loadTransactions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleSort = (column: keyof Transaction | 'account' | 'category' | 'type') => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0); // Reset to first page when sorting changes
  };

  const sortTransactions = (txs: Transaction[]): Transaction[] => {
    return [...txs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'description':
          aValue = (a.description || a.expenseType?.name || '').toLowerCase();
          bValue = (b.description || b.expenseType?.name || '').toLowerCase();
          break;
        case 'type':
          aValue = a.transactionType.name;
          bValue = b.transactionType.name;
          break;
        case 'category':
          aValue = a.budgetCategory.name.toLowerCase();
          bValue = b.budgetCategory.name.toLowerCase();
          break;
        case 'account':
          aValue = a.account.name.toLowerCase();
          bValue = b.account.name.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  if (loading && transactions.length === 0) return <Loading message="Loading transactions..." />;

  const sortedTransactions = sortTransactions(transactions);
  const paginatedTransactions = sortedTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const SortIcon = ({ column }: { column: keyof Transaction | 'account' | 'category' | 'type' }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpward sx={{ fontSize: 16, ml: 0.5 }} />
    ) : (
      <ArrowDownward sx={{ fontSize: 16, ml: 0.5 }} />
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <h2 style={{ margin: 0 }}>Transactions</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            Total: {transactions.length} transactions
          </p>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() =>
                setFilters({
                  search: '',
                  startDate: '',
                  endDate: '',
                  categoryId: '',
                  transactionTypeId: '',
                })
              }
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                onClick={() => handleSort('date')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center">
                  Date
                  <SortIcon column="date" />
                </Box>
              </TableCell>
              <TableCell
                onClick={() => handleSort('description')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center">
                  Description
                  <SortIcon column="description" />
                </Box>
              </TableCell>
              <TableCell
                onClick={() => handleSort('type')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center">
                  Type
                  <SortIcon column="type" />
                </Box>
              </TableCell>
              <TableCell
                onClick={() => handleSort('category')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center">
                  Category
                  <SortIcon column="category" />
                </Box>
              </TableCell>
              <TableCell
                onClick={() => handleSort('account')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center">
                  Account
                  <SortIcon column="account" />
                </Box>
              </TableCell>
              <TableCell
                align="right"
                onClick={() => handleSort('amount')}
                sx={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { backgroundColor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="flex-end">
                  Amount
                  <SortIcon column="amount" />
                </Box>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((tx) => (
              <TableRow key={tx.id} hover>
                <TableCell>{formatDateString(tx.date, 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  {tx.description || tx.expenseType?.name || '-'}
                  {tx.isReimbursable && (
                    <Chip
                      label="Reimbursable"
                      size="small"
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={tx.transactionType.name}
                    size="small"
                    color={
                      tx.transactionType.name === 'INCOME'
                        ? 'success'
                        : tx.transactionType.name === 'EXPENSE'
                        ? 'error'
                        : tx.transactionType.name === 'REIMBURSEMENT'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{tx.budgetCategory.name}</TableCell>
                <TableCell>{tx.account.name}</TableCell>
                <TableCell align="right">
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color:
                        tx.transactionType.name === 'INCOME' ||
                        tx.transactionType.name === 'REIMBURSEMENT'
                          ? 'success.main'
                          : 'error.main',
                    }}
                  >
                    {tx.transactionType.name === 'INCOME' ||
                    tx.transactionType.name === 'REIMBURSEMENT'
                      ? '+'
                      : '-'}
                    {formatCurrency(tx.amount, tx.currency.symbol)}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(tx)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(tx.id)}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {paginatedTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No transactions found. Add your first transaction to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={sortedTransactions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="date"
                label="Date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="amount"
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                name="accountId"
                label="Account"
                value={formData.accountId}
                onChange={handleInputChange}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} ({account.currency.code})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                name="transactionTypeId"
                label="Transaction Type"
                value={formData.transactionTypeId}
                onChange={handleInputChange}
              >
                {transactionTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                name="budgetCategoryId"
                label="Budget Category"
                value={formData.budgetCategoryId}
                onChange={handleInputChange}
              >
                {budgetCategories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                name="expenseTypeId"
                label="Expense Type (Optional)"
                value={formData.expenseTypeId}
                onChange={handleInputChange}
              >
                <MenuItem value="">None</MenuItem>
                {expenseTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="description"
                label="Description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Notes (Optional)"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isReimbursable"
                    checked={formData.isReimbursable}
                    onChange={handleInputChange}
                  />
                }
                label="This expense is reimbursable"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transactions;
