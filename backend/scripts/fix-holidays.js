const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.holiday.updateMany({
    where: { type: null },
    data: { type: 'Holiday' }
  });
  console.log('Updated holidays:', updated);

  // Also check all
  const all = await prisma.holiday.findMany();
  console.log('Current holidays in DB:', all);
}

main().catch(console.error).finally(() => prisma.$disconnect());
