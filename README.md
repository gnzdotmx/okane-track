# OkaneTrack

A comprehensive finance management web application featuring multi-currency support, real-time exchange rates, budget tracking, and advanced analytics.

![OkaneTrack](./imgs/okane-track.gif)

## Features

### Core Features
- **Multi-Currency Support**: Manage accounts in different currencies (JPY, USD, EUR, MXN, etc.) with automatic conversion
- **Real-Time Exchange Rates**: Fetch and display current exchange rates from free APIs
- **Exchange Rate Display**: View current exchange rates in the top navigation bar (auto-refreshes every 5 minutes)
- **Budget Tracking**: Track expenses across 4 categories with customizable percentages.
- **Transaction Management**: Full CRUD operations for transactions with advanced filtering and sorting
- **Transaction Types**: Support for EXPENSE, INCOME, TRANSFER, REIMBURSEMENT, and ACCOUNT_TRANSFER_IN
- **Reimbursable Expenses**: Link reimbursements to original expenses (perfect for business travel expenses)
- **CSV Import/Export**: Import existing data with support for "Reembolsable" column and "Tipo" field, export for backup
- **Account Management**: Create, edit, delete accounts with initial balance tracking
- **Balance Recalculation**: Recalculate account balances from initial balance and transactions
- **Real-time Dashboard**: Live statistics, account balances table, and balance tracking
- **Advanced Charts**: Visual analytics with pie charts, bar charts, and line graphs
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Security Features
- **Secure Authentication**: Token-based authentication for secure access
- **Password Protection**: Encrypted password storage
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: Protection against brute force attacks

## Prerequisites

- Docker Desktop (for Mac/Windows) or Docker Engine (for Linux)
- Docker Compose
- At least 4GB RAM available for Docker
- Ports 3000, 3001, 54320 available

## Quick Start

### Option 1: Using Makefile (Recommended)

```bash
cd /path/to/okane-track

# Start the application (builds and starts all services)
make start

# Stop the application
make stop

# View logs if something goes wrong
make logs
```

### Option 2: Using Docker Compose

```bash
cd /path/to/okane-track

# Start all services (database, backend, frontend)
docker-compose up --build
```

This will:
- Start PostgreSQL database on port 54320
- Build and start backend API on port 3001
- Build and start frontend on port 3000
- Run database setup automatically
- Seed initial data (currencies, categories, expense types, transaction types)

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Initial Setup

### Step 1: Create Your Account

1. Open http://localhost:3000
2. Click **"Sign Up"**
3. Fill in your details:
   - First Name: [Your first name]
   - Last Name: [Your last name]
   - Email: [Your email address]
   - Password: (minimum 8 characters)
4. Click **"Sign Up"**
5. You'll be automatically logged in and redirected to the dashboard

### Step 2: Create an Account

1. Go to **Accounts** page
2. Click **"Add Account"**
3. Create your first account:
   - Name: "Main JPY Account" (or any name you prefer)
   - Type: CHECKING (or SAVINGS, CREDIT_CARD, CASH, INVESTMENT)
   - Currency: Select your currency (JPY, USD, EUR, MXN, etc.)
   - Initial Balance: Enter your starting balance
4. Click **"Create"**

**Account Types Explained:**
- **CHECKING**: Daily use account for regular transactions
- **SAVINGS**: Savings account for planned purchases
- **CREDIT_CARD**: Credit card account
- **CASH**: Physical cash tracking
- **INVESTMENT**: Investment accounts

### Step 3: Set Up Budgets

1. Go to **Dashboard**
2. You'll see 4 budget categories with default percentages:
   - **Expenses (40%)**: Daily expenses
   - **Savings (20%)**: Planned purchases
   - **Investment (20%)**: Long-term growth
   - **Emergencies (20%)**: Unexpected costs

3. **Customize Percentages (Optional)**: You can adjust the budget category percentages to match your financial goals. The percentages must sum to 100%. This can be done through the settings interface in the application.

4. Set starting balances based on your current situation (these can be updated later)

### Step 4: Import Your Data

1. Go to **Import/Export** page
2. Select your account from the dropdown
3. Click **"Choose CSV File"**
4. Select your CSV file (e.g., `transactions.csv`)
5. Click **"Import Transactions"**
6. Review the import results

**CSV Format Support:**
- **Reembolsable Column**: Add "Reembolsable" column with "Si"/"No" values to mark reimbursable expenses
- **Tipo Field**: Use "Tipo" field to specify transaction type (EXPENSE, INCOME, TRANSFER, REIMBURSEMENT, ACCOUNT_TRANSFER_IN)
- Standard columns: Date, Amount, Description, Expense Type, Budget Category

## Using the Application

### Dashboard

The dashboard provides an overview of your finances:

- **Total Balance**: Sum of all accounts converted to base currency
- **Account Balances Table**: Shows balance for each account with currency conversion
- **Balance by Category**: Progress bars showing budget allocation (40/20/20/20)
- **Balance by Currency**: Breakdown by currency with update rates button
- **Recent Transactions**: Last 5 transactions
- **Monthly Income vs Expenses**: Current month summary
- **Year Summary**: Total reimbursed and spending by expense type
- **Budget by Category**: Visual breakdown (shows message if no budgets configured)

### Transactions

Manage all your transactions:

- **Filterable Transaction List**: Search, date range, category, type filters
- **Sortable Columns**: Sort by date, description, type, amount (ascending/descending)
- **Search Functionality**: Search by description
- **Export to CSV**: Download all transactions for backup
- **Edit and Delete**: Full CRUD operations
- **Add Transaction**: Create new transactions with all fields

### Accounts

Manage your accounts:

- **View All Accounts**: See all accounts with balances
- **Create Accounts**: Add new accounts in different currencies
- **Edit Accounts**: Update account details
- **Delete Accounts**: Remove accounts
- **Recalculate Balance**: Recalculate balance from initial balance and transactions if something seems off
- **See Balance Per Account**: View balance in original currency and base currency

### Charts

Visualize your financial data:

- **Budget Distribution**: Pie chart showing 40/20/20/20 allocation
- **Expenses by Type**: Bar chart with expense categories
- **Monthly Trends**: Line chart showing income vs expenses over time

### Import/Export

Import and export your data:

- **Import CSV Files**: Upload and parse CSV files
- **Export Transactions**: Download all transactions as CSV for backup
- **View Import History**: See past imports with success/error counts
- **Import Errors**: Review any errors from imports

## Multi-Currency Handling

The application automatically converts amounts between currencies:
- Each transaction is stored in its original currency
- Dashboard shows balances in base currency (JPY by default)
- Individual accounts show balances in their own currency
- Exchange rates are stored in the database and can be updated from real-time APIs

### Real-Time Exchange Rates

- **Automatic Updates**: Exchange rates displayed in top bar auto-refresh every 5 minutes
- **Manual Update**: Click "Update Rates" button in Dashboard to fetch latest rates
- **API Sources**: Uses exchangerate-api.com (primary) and exchangerate.host (fallback)
- **No API Key Required**: Both services are free and don't require API keys

## Transaction Types

The system supports 5 transaction types:

1. **EXPENSE**: Money going out to external party (counted as expense)
2. **INCOME**: Money coming in (salary, cashback, interest, refunds) - counted as income
3. **TRANSFER**: Moving money between your own accounts (not counted as income/expense)
4. **REIMBURSEMENT**: Money returning from reimbursable expense (increases balance, not counted as income)
5. **ACCOUNT_TRANSFER_IN**: Money received as transfer from another account (increases balance, not counted as income)

**Special Types:**
- **REIMBURSEMENT** and **ACCOUNT_TRANSFER_IN** increase account balance but are excluded from income calculations in dashboard and budget reports
- **TRANSFER** moves money between accounts without affecting income/expense totals

## CSV Import Format

### Supported Columns

- **Date**: Transaction date (YYYY-MM-DD or similar formats)
- **Amount**: Transaction amount (with or without currency symbol)
- **Description**: Transaction description
- **Tipo**: Transaction type (EXPENSE, INCOME, TRANSFER, REIMBURSEMENT, ACCOUNT_TRANSFER_IN)
- **Reembolsable**: "Si"/"Sí"/"Yes" to mark as reimbursable, "No" otherwise
- **Expense Type**: Category like "Transporte", "Comida", etc.
- **Budget Category**: Expenses, Savings, Investment, Emergencies

### CSV Import Features

- **Automatic Type Detection**: If "Tipo" column is missing, system infers from description
- **Reimbursable Detection**: Uses "Reembolsable" column if present, otherwise keyword matching
- **Balance Calculation**: Automatically updates account balance from initial balance
- **Error Handling**: Shows detailed import results with success/error counts

## Key Features Explained

### Initial Balance Tracking

- When creating an account, set the initial balance
- System tracks `initialBalance` separately from current `balance`
- Balance is calculated as: `initialBalance + sum of all transactions`
- Use "Recalculate Balance" if balance seems incorrect

### Reimbursable Expenses

1. Mark an expense as reimbursable (via CSV "Reembolsable" column or checkbox)
2. When reimbursement is received, create a REIMBURSEMENT transaction
3. Link it to the original expense using `linkedTransactionId`
4. Net effect: Expense is tracked but doesn't affect net worth when reimbursed

### Account Transfer Types

- **Account Transfer**: Special expense type for transfers to another account for daily expenses (not counted as expense in reports)
- **ACCOUNT_TRANSFER_IN**: Money received from another account (not counted as income)
- Use these types to track inter-account transfers without affecting income/expense calculations

## Troubleshooting

### Can't Access http://localhost:3000?

1. Check if containers are running:
   ```bash
   docker ps
   ```
   You should see 1 container: `finance_frontend`.

2. Or using Makefile:
   ```bash
   make status
   ```

3. If containers aren't running, start them:
   ```bash
   make start
   # or
   docker-compose up
   ```

### Application Not Loading?

1. Check if all services are running:
   ```bash
   make status
   ```

2. View logs to see what's wrong:
   ```bash
   make logs
   # or for specific service
   make logs-backend
   make logs-frontend
   make logs-db
   ```

3. Try restarting the services:
   ```bash
   make restart
   ```

### Import Failed?

- Verify account is selected
- Check CSV file exists and is valid
- View backend logs: `make logs-backend`
- Verify CSV format matches expected format (see CSV Import Format section)
- Check import history for error details

### Database Issues

If you're experiencing database problems:

1. Stop all containers:
   ```bash
   make stop
   # or
   docker-compose down
   ```

2. Remove database volume and start fresh (WARNING: This deletes all data):
   ```bash
   make clean-db
   ```

3. Start the application again:
   ```bash
   make start
   ```

### Permission Denied (Docker)

If you get permission errors:

```bash
# Make entrypoint executable
chmod +x backend/docker-entrypoint.sh
```


## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Docker logs using `make logs` or `docker logs [container-name]`
3. Check that all prerequisites are installed correctly
4. Verify that ports 3000, 3001, and 54320 are not in use by other applications

---
