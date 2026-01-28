#!/usr/bin/env tsx
/**
 * Batch Ingestion Script for Hellio HR Exercise 3
 *
 * Processes all CVs and job descriptions from the data directory.
 * Usage:
 *   npm run ingest              # Process all with mock LLM
 *   npm run ingest -- --real    # Process all with real Bedrock
 *   npm run ingest -- --cvs     # Process CVs only
 *   npm run ingest -- --jobs    # Process job descriptions only
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ExtractionService } from '../src/services/extractionService.js';
import { LLMMetricsService } from '../src/services/llmMetricsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const metricsService = new LLMMetricsService();

// Configuration
const DATA_DIR = path.join(__dirname, '../../data');
const CVS_DIR = path.join(DATA_DIR, 'cvs');
const JOBS_DIR = path.join(DATA_DIR, 'job-descriptions');

interface IngestionStats {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  cached: number;
}

interface IngestionResult {
  file: string;
  status: 'success' | 'failed' | 'skipped' | 'cached';
  error?: string;
  duration?: number;
}

/**
 * Process all CVs in the data/cvs directory
 */
async function processCVs(useLLM: boolean): Promise<{ stats: IngestionStats; results: IngestionResult[] }> {
  console.log('\n' + '='.repeat(60));
  console.log('Processing CVs');
  console.log('='.repeat(60));

  const stats: IngestionStats = { total: 0, succeeded: 0, failed: 0, skipped: 0, cached: 0 };
  const results: IngestionResult[] = [];

  if (!fs.existsSync(CVS_DIR)) {
    console.log('⚠️  CVs directory not found:', CVS_DIR);
    return { stats, results };
  }

  const cvFiles = fs.readdirSync(CVS_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.pdf') || f.endsWith('.docx'));
  stats.total = cvFiles.length;

  console.log(`Found ${cvFiles.length} CV files\n`);

  const service = new ExtractionService();

  for (const file of cvFiles) {
    const filePath = path.join(CVS_DIR, file);
    const startTime = Date.now();

    try {
      // Find document by filePath (stored as 'cvs/filename.txt')
      const document = await prisma.document.findFirst({
        where: {
          filePath: path.join('cvs', file),
          type: 'CV',
        },
        include: { candidate: true },
      });

      if (!document) {
        console.log(`⏭️  ${file}: No candidate record found, skipping`);
        stats.skipped++;
        results.push({ file, status: 'skipped', error: 'No candidate record' });
        continue;
      }

      console.log(`📄 Processing: ${file} (${document.candidate?.name || 'Unknown'})`);

      const result = await service.processCandidateCV(
        document.candidateId!,
        filePath,
        file,
        useLLM
      );

      const duration = Date.now() - startTime;

      if (result.success) {
        if (result.cached) {
          console.log(`  ✓ Cached result (${duration}ms)`);
          stats.cached++;
          results.push({ file, status: 'cached', duration });
        } else {
          const method = result.extraction?.extractionMethod || 'unknown';
          console.log(`  ✓ Extracted successfully using ${method} (${duration}ms)`);
          stats.succeeded++;
          results.push({ file, status: 'success', duration });
        }
      } else {
        console.log(`  ✗ Failed: ${result.error || 'Unknown error'}`);
        stats.failed++;
        results.push({ file, status: 'failed', error: result.error, duration });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Error: ${errorMsg}`);
      stats.failed++;
      results.push({ file, status: 'failed', error: errorMsg, duration });
    }

    console.log(''); // Blank line between files
  }

  return { stats, results };
}

/**
 * Process all job descriptions in the data/job-descriptions directory
 */
async function processJobDescriptions(useLLM: boolean): Promise<{ stats: IngestionStats; results: IngestionResult[] }> {
  console.log('\n' + '='.repeat(60));
  console.log('Processing Job Descriptions');
  console.log('='.repeat(60));

  const stats: IngestionStats = { total: 0, succeeded: 0, failed: 0, skipped: 0, cached: 0 };
  const results: IngestionResult[] = [];

  if (!fs.existsSync(JOBS_DIR)) {
    console.log('⚠️  Job descriptions directory not found:', JOBS_DIR);
    return { stats, results };
  }

  const jobFiles = fs.readdirSync(JOBS_DIR).filter(f => f.endsWith('.txt'));
  stats.total = jobFiles.length;

  console.log(`Found ${jobFiles.length} job description files\n`);

  const service = new ExtractionService();

  for (const file of jobFiles) {
    const filePath = path.join(JOBS_DIR, file);
    const startTime = Date.now();

    try {
      // Find document by filePath (stored as 'job-descriptions/filename.txt')
      const document = await prisma.document.findFirst({
        where: {
          filePath: path.join('job-descriptions', file),
          type: 'JOB_DESCRIPTION',
        },
        include: { position: true },
      });

      if (!document) {
        console.log(`⏭️  ${file}: No position record found, skipping`);
        stats.skipped++;
        results.push({ file, status: 'skipped', error: 'No position record' });
        continue;
      }

      console.log(`📄 Processing: ${file} (${document.position?.title || 'Unknown'})`);

      const result = await service.processPositionJobDescription(
        document.positionId!,
        filePath,
        file,
        useLLM
      );

      const duration = Date.now() - startTime;

      if (result.success) {
        if (result.cached) {
          console.log(`  ✓ Cached result (${duration}ms)`);
          stats.cached++;
          results.push({ file, status: 'cached', duration });
        } else {
          console.log(`  ✓ Extracted successfully (${duration}ms)`);
          stats.succeeded++;
          results.push({ file, status: 'success', duration });
        }
      } else {
        console.log(`  ✗ Failed: ${result.error || 'Unknown error'}`);
        stats.failed++;
        results.push({ file, status: 'failed', error: result.error, duration });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ✗ Error: ${errorMsg}`);
      stats.failed++;
      results.push({ file, status: 'failed', error: errorMsg, duration });
    }

    console.log(''); // Blank line between files
  }

  return { stats, results };
}

/**
 * Print summary statistics
 */
function printSummary(
  cvStats: IngestionStats,
  jobStats: IngestionStats,
  startTime: number
) {
  const totalDuration = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log('Ingestion Summary');
  console.log('='.repeat(60));

  console.log('\n📊 CVs:');
  console.log(`  Total:     ${cvStats.total}`);
  console.log(`  ✓ Success: ${cvStats.succeeded}`);
  console.log(`  ⚡ Cached:  ${cvStats.cached}`);
  console.log(`  ⏭️  Skipped: ${cvStats.skipped}`);
  console.log(`  ✗ Failed:  ${cvStats.failed}`);

  console.log('\n📊 Job Descriptions:');
  console.log(`  Total:     ${jobStats.total}`);
  console.log(`  ✓ Success: ${jobStats.succeeded}`);
  console.log(`  ⚡ Cached:  ${jobStats.cached}`);
  console.log(`  ⏭️  Skipped: ${jobStats.skipped}`);
  console.log(`  ✗ Failed:  ${jobStats.failed}`);

  const totalProcessed = cvStats.total + jobStats.total;
  const totalSucceeded = cvStats.succeeded + jobStats.succeeded;
  const totalCached = cvStats.cached + jobStats.cached;
  const totalFailed = cvStats.failed + jobStats.failed;

  console.log('\n📊 Overall:');
  console.log(`  Total:     ${totalProcessed}`);
  console.log(`  ✓ Success: ${totalSucceeded}`);
  console.log(`  ⚡ Cached:  ${totalCached}`);
  console.log(`  ✗ Failed:  ${totalFailed}`);
  console.log(`  Duration:  ${(totalDuration / 1000).toFixed(2)}s`);
}

/**
 * Print LLM metrics summary
 */
async function printMetrics() {
  const metrics = await metricsService.getMetricsSummary();

  console.log('\n' + '='.repeat(60));
  console.log('LLM Metrics');
  console.log('='.repeat(60));

  console.log(`\n💰 Total Cost: $${metrics.totalCost.toFixed(4)}`);
  console.log(`📊 Total Calls: ${metrics.totalCalls}`);
  console.log(`✓ Success Rate: ${metrics.successRate.toFixed(1)}%`);
  console.log(`⏱️  Avg Latency: ${metrics.averageLatency.toFixed(0)}ms`);
  console.log(`📊 Total Tokens: ${metrics.totalTokens.toLocaleString()}`);

  if (metrics.byModel && metrics.byModel.length > 0) {
    console.log('\n📈 By Model:');
    for (const modelMetrics of metrics.byModel) {
      console.log(`  ${modelMetrics.modelName}:`);
      console.log(`    Calls: ${modelMetrics.calls}`);
      console.log(`    Tokens: ${modelMetrics.tokens.toLocaleString()}`);
      console.log(`    Cost: $${modelMetrics.cost.toFixed(4)}`);
      console.log(`    Avg Latency: ${modelMetrics.avgLatency.toFixed(0)}ms`);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const useLLM = !args.includes('--heuristic-only');
  const processCVsOnly = args.includes('--cvs');
  const processJobsOnly = args.includes('--jobs');

  console.log('\n' + '='.repeat(60));
  console.log('Hellio HR - Batch Document Ingestion');
  console.log('='.repeat(60));
  console.log(`\nMode: ${useLLM ? 'Heuristics + LLM' : 'Heuristics Only'}`);
  console.log(`Data Directory: ${DATA_DIR}`);

  const startTime = Date.now();

  let cvStats: IngestionStats = { total: 0, succeeded: 0, failed: 0, skipped: 0, cached: 0 };
  let jobStats: IngestionStats = { total: 0, succeeded: 0, failed: 0, skipped: 0, cached: 0 };

  try {
    if (!processJobsOnly) {
      const cvResult = await processCVs(useLLM);
      cvStats = cvResult.stats;
    }

    if (!processCVsOnly) {
      const jobResult = await processJobDescriptions(useLLM);
      jobStats = jobResult.stats;
    }

    printSummary(cvStats, jobStats, startTime);

    if (useLLM) {
      await printMetrics();
    }

    console.log('\n✅ Ingestion complete!\n');

    // Exit with error code if any failures
    if (cvStats.failed > 0 || jobStats.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error during ingestion:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
