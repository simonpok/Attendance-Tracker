const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'EMPLOYEE' }, take: 1 });
  console.log(users);
}

main().finally(() => prisma.$disconnect());
