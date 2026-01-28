import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete llm_metrics that reference non-existent documents
  const result = await prisma.$executeRaw`
    DELETE FROM llm_metrics
    WHERE document_id IS NOT NULL
      AND document_id NOT IN (SELECT id FROM documents)
  `;

  console.log(`Cleaned ${result} orphaned llm_metrics records`);

  await prisma.$disconnect();
}

main();
