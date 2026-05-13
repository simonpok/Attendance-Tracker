import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const payments = await prisma.salaryPayment.findMany({
    include: { user: true }
  });
  console.log('Salary Payments:', JSON.stringify(payments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
