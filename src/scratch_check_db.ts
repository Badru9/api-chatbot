const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Querying users from database...');
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
    }
  });
  console.log('Users found:', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
