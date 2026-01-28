import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.document.findMany({
    select: {
      id: true,
      fileName: true,
      filePath: true,
      type: true,
      candidateId: true,
      positionId: true,
    },
  });

  console.log('Documents in database:');
  console.log(JSON.stringify(docs, null, 2));

  await prisma.$disconnect();
}

main();
