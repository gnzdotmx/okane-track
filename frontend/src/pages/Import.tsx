import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  TextField,
  Grid,
  MenuItem,
} from '@mui/material';
import { CloudUpload, FileDownload } from '@mui/icons-material';
import api from '../services/api';
import { Account, ImportResult } from '../types';
import { downloadCSV } from '../utils/format';

const Import: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.getAccounts();
      setAccounts(response.data);
      if (response.data.length > 0) {
        setSelectedAccount(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError('');
        setResult(null);
      } else {
        setError('Please select a CSV file');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file || !selectedAccount) {
      setError('Please select a file and account');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.importCSV(file, selectedAccount);
      setResult(response.data);
      
      if (response.data.success) {
        setFile(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const csvBlob = await api.exportCSV();
      downloadCSV(csvBlob, `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError('Export failed');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Import / Export
      </Typography>

      <Grid container spacing={3}>
        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import Transactions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload your CSV file to import transactions. The file should follow the
                format from your original spreadsheet.
              </Typography>

              <TextField
                select
                fullWidth
                label="Select Account"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                margin="normal"
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.name} ({account.currency.code})
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ my: 3 }}>
                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-upload"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    startIcon={<CloudUpload />}
                  >
                    {file ? file.name : 'Choose CSV File'}
                  </Button>
                </label>
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleImport}
                disabled={!file || !selectedAccount || loading}
                startIcon={<CloudUpload />}
              >
                {loading ? 'Importing...' : 'Import Transactions'}
              </Button>

              {loading && <LinearProgress sx={{ mt: 2 }} />}

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {result && (
                <Alert
                  severity={result.success ? 'success' : 'warning'}
                  sx={{ mt: 2 }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Import Results:
                  </Typography>
                  <Typography variant="body2">
                    Total Records: {result.totalRecords}
                  </Typography>
                  <Typography variant="body2">
                    Successfully Imported: {result.successCount}
                  </Typography>
                  {result.errorCount > 0 && (
                    <Typography variant="body2" color="error">
                      Errors: {result.errorCount}
                    </Typography>
                  )}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Transactions
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Download all your transactions as a CSV file. You can open this file in
                Excel or Google Sheets.
              </Typography>

              <Box sx={{ my: 3, textAlign: 'center', py: 5 }}>
                <FileDownload sx={{ fontSize: 80, color: 'primary.main', opacity: 0.3 }} />
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleExport}
                startIcon={<FileDownload />}
              >
                Export All Transactions
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CSV Format Instructions
              </Typography>
              <Typography variant="body2" paragraph>
                Your CSV file should have the following columns:
              </Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                Date, Amount, Type, Description
              </Box>
              <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                <strong>Optional:</strong> Reimbursable (YES/NO) - If not provided, the system will detect reimbursable expenses from the description.
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Example:</strong>
              </Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                2025-01-05,¥712,Transport,Uber{'\n'}
                2025-01-15,¥29982,Income,Salary{'\n'}
                2025-01-23,¥19900,Education,Audible{'\n'}
                2025-01-25,¥5000,Expense,Business trip,YES
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Import;

