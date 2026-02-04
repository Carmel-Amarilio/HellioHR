/**
 * Batch Embedding Generation Script
 *
 * Generates embeddings for all existing candidates and positions
 * Includes:
 * - Progress logging (X/Y processed)
 * - Error recovery (continues on individual failures)
 * - Batching to manage AWS Bedrock rate limits
 * - Verification counts after completion
 *
 * Usage:
 *   npx ts-node scripts/generate-embeddings.ts
 */

import { prisma } from '../src/config/database.js';
import { config } from '../src/config/env.js';
import { vectorStore } from '../src/services/embeddings/VectorStoreService.js';
import { embeddingPipeline } from '../src/services/embeddings/EmbeddingPipelineService.js';

const BATCH_SIZE = 5; // Process 5 at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 2000; // 2 second delay between batches

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateCandidateEmbeddings(): Promise<void> {
  console.log('\n=== Generating Candidate Embeddings ===');

  try {
    const candidates = await prisma.candidate.findMany({
      select: { id: true },
    });

    console.log(`Found ${candidates.length} candidates`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((c) => embeddingPipeline.embedCandidate(c.id))
      );

      // Count results
      for (const result of results) {
        processed++;
        if (result.status === 'fulfilled') {
          succeeded++;
        } else {
          failed++;
          console.error(`  Failed: ${result.reason}`);
        }
      }

      console.log(
        `Progress: ${processed}/${candidates.length} candidates (${succeeded} succeeded, ${failed} failed)`
      );

      // Delay before next batch
      if (i + BATCH_SIZE < candidates.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`\nCandidate embedding complete: ${succeeded} succeeded, ${failed} failed`);
  } catch (error) {
    console.error(`Error generating candidate embeddings: ${error}`);
  }
}

async function generatePositionEmbeddings(): Promise<void> {
  console.log('\n=== Generating Position Embeddings ===');

  try {
    const positions = await prisma.position.findMany({
      select: { id: true },
    });

    console.log(`Found ${positions.length} positions`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < positions.length; i += BATCH_SIZE) {
      const batch = positions.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map((p) => embeddingPipeline.embedPosition(p.id))
      );

      // Count results
      for (const result of results) {
        processed++;
        if (result.status === 'fulfilled') {
          succeeded++;
        } else {
          failed++;
          console.error(`  Failed: ${result.reason}`);
        }
      }

      console.log(
        `Progress: ${processed}/${positions.length} positions (${succeeded} succeeded, ${failed} failed)`
      );

      // Delay before next batch
      if (i + BATCH_SIZE < positions.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`\nPosition embedding complete: ${succeeded} succeeded, ${failed} failed`);
  } catch (error) {
    console.error(`Error generating position embeddings: ${error}`);
  }
}

async function verifyEmbeddings(): Promise<void> {
  console.log('\n=== Verification ===');

  try {
    // Count candidates and positions in MySQL
    const candidateCount = await prisma.candidate.count();
    const positionCount = await prisma.position.count();

    console.log(`MySQL: ${candidateCount} candidates, ${positionCount} positions`);

    // Note: We can't query PostgreSQL directly from this script easily
    // User can verify manually with:
    // psql hellio_vectors -U hellio -c "SELECT COUNT(*) FROM candidate_embeddings;"
    // psql hellio_vectors -U hellio -c "SELECT COUNT(*) FROM position_embeddings;"

    console.log(
      '\nTo verify PostgreSQL embeddings, run:\n' +
        'psql $VECTOR_DATABASE_URL -c "SELECT COUNT(*) FROM candidate_embeddings;"\n' +
        'psql $VECTOR_DATABASE_URL -c "SELECT COUNT(*) FROM position_embeddings;"\n'
    );
  } catch (error) {
    console.error(`Error during verification: ${error}`);
  }
}

async function main(): Promise<void> {
  try {
    console.log('Starting embedding generation...');
    console.log(`Config: model=${config.embeddings.model}, version=${config.embeddings.version}`);

    if (!config.embeddings.enabled) {
      console.warn('Warning: EMBEDDINGS_ENABLED is false. Set to true to generate embeddings.');
      return;
    }

    // Initialize vector store
    await vectorStore.initialize();

    // Generate embeddings
    await generateCandidateEmbeddings();
    await generatePositionEmbeddings();

    // Verify
    await verifyEmbeddings();

    console.log('\n✓ Embedding generation complete');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await vectorStore.close();
    await prisma.$disconnect();
  }
}

main();
