import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  CardActions,
} from '@mui/material';
import { Add, AccountBalance, Edit, Delete, Refresh } from '@mui/icons-material';
import { Account, Currency } from '../types';
import api from '../services/api';
import Loading from '../components/common/Loading';
import { formatCurrency } from '../utils/format';

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Checking Account' },
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'INVESTMENT', label: 'Investment' },
];

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING',
    currencyId: '',
    initialBalance: '0',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsRes, currenciesRes] = await Promise.all([
        api.getAccounts(),
        api.getCurrencies(),
      ]);
      setAccounts(accountsRes.data);
      setCurrencies(currenciesRes.data);
      
      // Set default currency to base currency
      if (currenciesRes.data.length > 0) {
        const baseCurrency = currenciesRes.data.find((c: Currency) => c.isBase) || currenciesRes.data[0];
        setFormData((prev: typeof formData) => ({ ...prev, currencyId: baseCurrency.id }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (account?: Account) => {
    setError('');
    if (account) {
      setEditingId(account.id);
      setFormData({
        name: account.name,
        type: account.type,
        currencyId: account.currency.id,
        initialBalance: account.balance.toString(),
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        type: 'CHECKING',
        currencyId: currencies.find((c: Currency) => c.isBase)?.id || currencies[0]?.id || '',
        initialBalance: '0',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'CHECKING',
      currencyId: currencies.find((c: Currency) => c.isBase)?.id || currencies[0]?.id || '',
      initialBalance: '0',
    });
    setError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Please enter an account name');
      return;
    }
    if (!formData.currencyId) {
      setError('Please select a currency');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (editingId) {
        await api.updateAccount(editingId, {
          name: formData.name.trim(),
          type: formData.type,
        });
      } else {
        await api.createAccount({
          name: formData.name.trim(),
          type: formData.type,
          currencyId: formData.currencyId,
          balance: parseFloat(formData.initialBalance) || 0,
        });
      }
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} account`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteAccount(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleRecalculateBalance = async (id: string, name: string) => {
    const initialBalanceStr = window.prompt(
      `Recalculate balance for "${name}".\n\nEnter the correct initial balance (or leave empty to auto-calculate):`,
      ''
    );
    
    if (initialBalanceStr === null) return; // User cancelled

    try {
      const initialBalance = initialBalanceStr.trim() 
        ? parseFloat(initialBalanceStr.replace(/[¥,]/g, ''))
        : undefined;
      
      const result = await api.recalculateAccountBalance(id, initialBalance);
      alert(`Balance recalculated successfully!\n\nInitial Balance: ${formatCurrency(result.data.initialBalance, '¥')}\nCalculated Balance: ${formatCurrency(result.data.calculatedBalance, '¥')}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to recalculate balance');
    }
  };

  if (loading) return <Loading message="Loading accounts..." />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Accounts & Cards
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add Account
        </Button>
      </Box>

      <Grid container spacing={3}>
        {accounts.map((account: Account) => (
          <Grid item xs={12} md={6} lg={4} key={account.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <AccountBalance color="primary" />
                  <Chip
                    label={account.type}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  {account.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {account.currency.name} ({account.currency.code})
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {formatCurrency(account.balance, account.currency.symbol)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current Balance
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={() => handleRecalculateBalance(account.id, account.name)}
                  aria-label="recalculate balance"
                  title="Recalculate Balance"
                >
                  <Refresh />
                </IconButton>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenDialog(account)}
                  aria-label="edit account"
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(account.id, account.name)}
                  aria-label="delete account"
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {accounts.length === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography textAlign="center" color="text.secondary">
                  No accounts found. Create your first account to get started.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Add/Edit Account Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Account Name"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Main Checking, Savings"
            sx={{ mt: 1 }}
          />
          <TextField
            select
            margin="dense"
            name="type"
            label="Account Type"
            fullWidth
            variant="outlined"
            value={formData.type}
            onChange={handleInputChange}
          >
            {ACCOUNT_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            margin="dense"
            name="currencyId"
            label="Currency"
            fullWidth
            variant="outlined"
            value={formData.currencyId}
            onChange={handleInputChange}
            disabled={!!editingId}
          >
            {currencies.map((currency: Currency) => (
              <MenuItem key={currency.id} value={currency.id}>
                {currency.name} ({currency.code}) {currency.isBase && '- Base'}
              </MenuItem>
            ))}
          </TextField>
          {!editingId && (
            <TextField
              margin="dense"
              name="initialBalance"
              label="Initial Balance"
              type="number"
              fullWidth
              variant="outlined"
              value={formData.initialBalance}
              onChange={handleInputChange}
              inputProps={{ step: '0.01' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {saving ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Account' : 'Create Account')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Accounts;
