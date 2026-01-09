import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create currencies
  const currencies = await Promise.all([
    prisma.currency.upsert({
      where: { code: 'JPY' },
      update: {},
      create: {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        exchangeRate: 1.0,
        isBase: true,
      },
    }),
    prisma.currency.upsert({
      where: { code: 'USD' },
      update: {},
      create: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchangeRate: 0.0067, // Example rate: 1 JPY = 0.0067 USD
        isBase: false,
      },
    }),
    prisma.currency.upsert({
      where: { code: 'EUR' },
      update: {},
      create: {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchangeRate: 0.0062, // Example rate
        isBase: false,
      },
    }),
    prisma.currency.upsert({
      where: { code: 'MXN' },
      update: {},
      create: {
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: '$',
        exchangeRate: 0.12, // Example rate
        isBase: false,
      },
    }),
  ]);

  console.log('Created currencies:', currencies.length);

  // Create budget categories
  const budgetCategories = await Promise.all([
    prisma.budgetCategory.upsert({
      where: { name: 'Expenses' },
      update: {},
      create: {
        name: 'Expenses',
        percentage: 40,
        description: 'Day-to-day expenses (transport, food, utilities, subscriptions)',
      },
    }),
    prisma.budgetCategory.upsert({
      where: { name: 'Savings' },
      update: {},
      create: {
        name: 'Savings',
        percentage: 20,
        description: 'Planned purchases, building reserves, large items',
      },
    }),
    prisma.budgetCategory.upsert({
      where: { name: 'Investment' },
      update: {},
      create: {
        name: 'Investment',
        percentage: 20,
        description: 'Long-term growth, education, business investments',
      },
    }),
    prisma.budgetCategory.upsert({
      where: { name: 'Emergencies' },
      update: {},
      create: {
        name: 'Emergencies',
        percentage: 20,
        description: 'Unexpected expenses, true emergencies only',
      },
    }),
  ]);

  console.log('Created budget categories:', budgetCategories.length);

  // Create transaction types
  const transactionTypes = await Promise.all([
    prisma.transactionType.upsert({
      where: { name: 'EXPENSE' },
      update: {},
      create: {
        name: 'EXPENSE',
        description: 'Money going out to external party',
      },
    }),
    prisma.transactionType.upsert({
      where: { name: 'INCOME' },
      update: {},
      create: {
        name: 'INCOME',
        description: 'Money coming in (salary, cashback, interest, refunds)',
      },
    }),
    prisma.transactionType.upsert({
      where: { name: 'TRANSFER' },
      update: {},
      create: {
        name: 'TRANSFER',
        description: 'Moving money between your own accounts',
      },
    }),
    prisma.transactionType.upsert({
      where: { name: 'REIMBURSEMENT' },
      update: {},
      create: {
        name: 'REIMBURSEMENT',
        description: 'Money returning from reimbursable expense',
      },
    }),
    prisma.transactionType.upsert({
      where: { name: 'ACCOUNT_TRANSFER_IN' },
      update: {},
      create: {
        name: 'ACCOUNT_TRANSFER_IN',
        description: 'Money received as transfer from another account (not counted as income)',
      },
    }),
  ]);

  console.log('Created transaction types:', transactionTypes.length);

  // Create expense types
  const expenseTypes = await Promise.all([
    prisma.expenseType.upsert({
      where: { name: 'Transport' },
      update: {},
      create: { name: 'Transport', icon: '', color: '#4CAF50' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Food' },
      update: {},
      create: { name: 'Food', icon: '', color: '#FF9800' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Internet' },
      update: {},
      create: { name: 'Internet', icon: '', color: '#2196F3' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Electricity' },
      update: {},
      create: { name: 'Electricity', icon: '', color: '#FFC107' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Health' },
      update: {},
      create: { name: 'Health', icon: '', color: '#F44336' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Education' },
      update: {},
      create: { name: 'Education', icon: '', color: '#9C27B0' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Emergency' },
      update: {},
      create: { name: 'Emergency', icon: '', color: '#E91E63' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Investment' },
      update: {},
      create: { name: 'Investment', icon: '', color: '#00BCD4' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Savings' },
      update: {},
      create: { name: 'Savings', icon: '', color: '#8BC34A' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Rent' },
      update: {},
      create: { name: 'Rent', icon: '', color: '#795548' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Freetime' },
      update: {},
      create: { name: 'Freetime', icon: '', color: '#607D8B' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics', icon: '', color: '#3F51B5' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Personal' },
      update: {},
      create: { name: 'Personal', icon: '', color: '#673AB7' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Cash' },
      update: {},
      create: { name: 'Cash', icon: '', color: '#009688' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Social' },
      update: {},
      create: { name: 'Social', icon: '', color: '#FF5722' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Income' },
      update: {},
      create: { name: 'Income', icon: '', color: '#4CAF50' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Account Transfer' },
      update: {},
      create: { name: 'Account Transfer', icon: '', color: '#9E9E9E' },
    }),
    prisma.expenseType.upsert({
      where: { name: 'Inter-Account Transfer' },
      update: {},
      create: { name: 'Inter-Account Transfer', icon: '', color: '#757575' },
    }),
  ]);

  console.log('Created expense types:', expenseTypes.length);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

