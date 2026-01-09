import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Refresh,
} from '@mui/icons-material';
import { DashboardStats, Transaction } from '../types';
import api from '../services/api';
import Loading from '../components/common/Loading';
import { formatCurrency, formatDateString, getCategoryColor } from '../utils/format';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboard();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!stats) return null;

  // Get current month's stats
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const currentMonthStats = stats.monthlyStats.find((stat) => stat.month === currentMonth) || {
    month: currentMonth,
    income: 0,
    expenses: 0,
    net: 0,
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Balance
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(stats.totalBalance, stats.baseCurrency.symbol)}
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Monthly Income
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(
                      currentMonthStats.income,
                      stats.baseCurrency.symbol
                    )}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Monthly Expenses
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {formatCurrency(
                      currentMonthStats.expenses,
                      stats.baseCurrency.symbol
                    )}
                  </Typography>
                </Box>
                <TrendingDown sx={{ fontSize: 60, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Budget Categories */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Budget by Category
              </Typography>
              {stats.balanceByCategory && stats.balanceByCategory.length > 0 ? (
                stats.balanceByCategory.map((category) => (
                  <Box key={category.categoryName} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {category.categoryName} ({category.percentage}%)
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={category.balance >= 0 ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(category.balance, stats.baseCurrency.symbol)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.min(
                            (Math.abs(category.balance) / (category.starting || 1)) * 100,
                            100
                          )}%`,
                          bgcolor: getCategoryColor(category.categoryName),
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No budgets configured for {new Date().getFullYear()}. 
                    <br />
                    Create budgets to track spending by category.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Balance by Currency */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Balance by Currency
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={async () => {
                    try {
                      await api.updateExchangeRates();
                      alert('Exchange rates updated successfully!');
                      loadDashboard();
                    } catch (err: any) {
                      alert(err.response?.data?.message || 'Failed to update exchange rates');
                    }
                  }}
                >
                  Update Rates
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">In {stats.baseCurrency.code}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.balanceByCurrency.map((currency) => (
                      <TableRow key={currency.currencyCode}>
                        <TableCell>
                          <Chip
                            label={currency.currencyCode}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(currency.balance, currency.currencySymbol)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            currency.balanceInBase,
                            stats.baseCurrency.symbol
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Reimbursed & Spending by Expense Type */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
                Year Summary
              </Typography>
              
              {/* Total Reimbursed */}
              <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Total Reimbursed ({new Date().getFullYear()})
                </Typography>
                <Typography variant="h6" fontWeight="medium" color="warning.main">
                  {formatCurrency(stats.totalReimbursed || 0, stats.baseCurrency.symbol)}
                </Typography>
              </Box>

              {/* Spending by Expense Type */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1, display: 'block' }}>
                  Spending by Expense Type ({new Date().getFullYear()})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ py: 0.5 }}>Type</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>
                          Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.spendingByExpenseType && stats.spendingByExpenseType.length > 0 ? (
                        stats.spendingByExpenseType.map((expenseType) => (
                          <TableRow key={expenseType.expenseTypeName}>
                            <TableCell sx={{ py: 0.5 }}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {expenseType.icon && (
                                  <Typography component="span" sx={{ fontSize: '1rem' }}>
                                    {expenseType.icon}
                                  </Typography>
                                )}
                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                  {expenseType.expenseTypeName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontSize: '0.75rem' }}
                                fontWeight="medium"
                              >
                                {formatCurrency(
                                  expenseType.amount,
                                  stats.baseCurrency.symbol
                                )}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} align="center" sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              No expense data available
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Accounts Balance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Account Balances
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">In {stats.baseCurrency.code}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.accounts && stats.accounts.length > 0 ? (
                      stats.accounts
                        .filter((account) => account.isActive)
                        .map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {account.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={account.type}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(account.balance, account.currencySymbol)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                color="primary.main"
                              >
                                {formatCurrency(account.balanceInBase, stats.baseCurrency.symbol)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            No accounts found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Recent Transactions
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.recentTransactions.map((tx: Transaction) => (
                      <TableRow key={tx.id}>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {formatDateString(tx.date, 'MMM dd')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>
                          {tx.description || tx.expenseType?.name}
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
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{ fontSize: '0.75rem' }}
                            fontWeight="bold"
                            color={
                              tx.transactionType.name === 'INCOME' ||
                              tx.transactionType.name === 'REIMBURSEMENT'
                                ? 'success.main'
                                : 'error.main'
                            }
                          >
                            {formatCurrency(tx.amount, tx.currency.symbol)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

