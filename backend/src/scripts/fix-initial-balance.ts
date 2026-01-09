/**
 * Script to fix initialBalance for existing accounts
 * Run this if accounts were created before the initialBalance field was added
 */
import prisma from '../config/database';

export async function fixInitialBalances() {
  console.log('Checking accounts...');

  const accounts = await prisma.account.findMany({
    include: {
      transactions: {
        include: {
          transactionType: true,
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  });

  for (const account of accounts) {
    const currentInitialBalance = (account as any).initialBalance || 0;
    
    if (currentInitialBalance === 0 && account.balance !== 0) {
      let transactionSum = 0;
      for (const tx of account.transactions) {
        if (tx.transactionType.name === 'INCOME' || tx.transactionType.name === 'REIMBURSEMENT') {
          transactionSum += tx.amount;
        } else if (tx.transactionType.name === 'EXPENSE' || tx.transactionType.name === 'TRANSFER') {
          transactionSum -= tx.amount;
        }
      }
      
      const calculatedInitialBalance = account.balance - transactionSum;
      
      console.log(`\nAccount: ${account.name}`);
      console.log(`   Current balance: ${account.balance}`);
      console.log(`   Transaction sum: ${transactionSum}`);
      console.log(`   Calculated initial balance: ${calculatedInitialBalance}`);
      
      // Update the initialBalance
      await prisma.account.update({
        where: { id: account.id },
        data: { initialBalance: calculatedInitialBalance },
      });
      
      console.log(`   Updated initialBalance to ${calculatedInitialBalance}`);
    } else {
      console.log(`\n✓ Account: ${account.name} - initialBalance already set: ${currentInitialBalance}`);
    }
  }

  console.log('\nDone!');
  await prisma.$disconnect();
}

fixInitialBalances().catch(console.error);

