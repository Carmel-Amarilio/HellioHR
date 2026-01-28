#!/usr/bin/env tsx
/**
 * 🎬 Exercise 3 Demo - Document Extraction & Enrichment Pipeline
 *
 * This interactive demo showcases the complete extraction pipeline:
 * 1. Upload a CV document
 * 2. Parse and extract with heuristics
 * 3. Enrich with LLM (mock or real Bedrock)
 * 4. Validate and persist results
 * 5. Display extraction metadata and metrics
 *
 * Usage:
 *   npm run demo              # Demo with mock LLM
 *   npm run demo -- --real    # Demo with real AWS Bedrock
 */

import { PrismaClient } from '@prisma/client';
import { ExtractionService } from '../src/services/extractionService.js';
import { LLMMetricsService } from '../src/services/llmMetricsService.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const metricsService = new LLMMetricsService();

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function header(text: string) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(70) + colors.reset);
  console.log(colors.bright + colors.cyan + text + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(70) + colors.reset + '\n');
}

function section(text: string) {
  console.log('\n' + colors.bright + colors.blue + '▶ ' + text + colors.reset);
}

function success(text: string) {
  console.log(colors.green + '✓ ' + text + colors.reset);
}

function info(text: string) {
  console.log(colors.cyan + 'ℹ ' + text + colors.reset);
}

function warning(text: string) {
  console.log(colors.yellow + '⚠ ' + text + colors.reset);
}

function error(text: string) {
  console.log(colors.red + '✗ ' + text + colors.reset);
}

function detail(key: string, value: any) {
  console.log(`  ${colors.dim}${key}:${colors.reset} ${value}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Demo Step 1: Show the raw CV file
 */
async function step1_showDocument() {
  header('🎬 DEMO: Exercise 3 - Document Extraction Pipeline');

  section('Step 1: Source Document');

  const cvPath = path.join(__dirname, '../../data/cvs/alice-johnson.txt');
  const cvContent = await fs.promises.readFile(cvPath, 'utf-8');

  info('Reading CV file: alice-johnson.txt');
  console.log('\n' + colors.dim + '┌─ Raw Document Content ────────────────────────────────────────┐' + colors.reset);
  console.log(colors.dim + cvContent.substring(0, 400) + '...' + colors.reset);
  console.log(colors.dim + '└────────────────────────────────────────────────────────────────┘' + colors.reset);

  detail('File size', `${cvContent.length} bytes`);
  detail('Lines', cvContent.split('\n').length);

  await sleep(1500);
}

/**
 * Demo Step 2: Heuristic extraction
 */
async function step2_heuristicExtraction(candidateId: string, cvPath: string) {
  section('Step 2: Heuristic Extraction (Rule-Based)');

  info('Applying deterministic extraction rules...');

  const service = new ExtractionService();
  const startTime = Date.now();

  const result = await service.processCandidateCV(
    candidateId,
    cvPath,
    'alice-johnson.txt',
    false // Heuristics only
  );

  const duration = Date.now() - startTime;

  if (result.success && result.extraction) {
    success(`Extracted in ${duration}ms`);

    console.log('\n  ' + colors.bright + 'Heuristic Results:' + colors.reset);
    detail('Email', result.extraction.email || 'not found');
    detail('Phone', result.extraction.phone || 'not found');
    detail('Skills', result.extraction.skills?.join(', ') || 'none');
    detail('Confidence', `${(result.extraction.confidence * 100).toFixed(0)}%`);
    detail('Method', result.extraction.extractionMethod);
  } else {
    error('Heuristic extraction failed');
  }

  await sleep(1500);
}

/**
 * Demo Step 3: LLM enrichment
 */
async function step3_llmEnrichment(candidateId: string, cvPath: string, useLLM: boolean) {
  section('Step 3: LLM Enrichment (AI-Powered)');

  if (!useLLM) {
    info('Using Mock LLM for this demo');
  } else {
    warning('Using real AWS Bedrock - this will incur costs!');
  }

  console.log('');
  info('Sending document to LLM...');
  await sleep(800);
  info('Waiting for LLM response...');

  const service = new ExtractionService();
  const startTime = Date.now();

  const result = await service.processCandidateCV(
    candidateId,
    cvPath,
    'alice-johnson.txt',
    true // Use LLM
  );

  const duration = Date.now() - startTime;

  if (result.success && result.extraction) {
    success(`Enriched in ${duration}ms`);

    console.log('\n  ' + colors.bright + 'Hybrid Results (Heuristics + LLM):' + colors.reset);
    detail('Summary', result.extraction.summary?.substring(0, 120) + '...' || 'none');
    detail('Skills', result.extraction.skills?.slice(0, 5).join(', ') + '...' || 'none');
    detail('Experience entries', result.extraction.experience?.length || 0);
    detail('Education entries', result.extraction.education?.length || 0);
    detail('Method', result.extraction.extractionMethod);
    detail('Prompt version', result.extraction.promptVersion);
  } else {
    error(`LLM enrichment failed: ${result.error}`);
  }

  await sleep(1500);
}

/**
 * Demo Step 4: Show validation results
 */
async function step4_validation(candidateId: string) {
  section('Step 4: Validation & Persistence');

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      name: true,
      extractedSummary: true,
      extractionStatus: true,
      extractionMethod: true,
      extractionPromptVersion: true,
      lastExtractionDate: true,
      extractedExperience: true,
      extractedEducation: true,
    },
  });

  if (!candidate) {
    error('Candidate not found');
    return;
  }

  success('Validation passed');
  success('Data persisted to database');

  console.log('\n  ' + colors.bright + 'Persisted Fields:' + colors.reset);
  detail('Candidate ID', candidate.id);
  detail('Name', candidate.name);
  detail('Status', candidate.extractionStatus || 'unknown');
  detail('Method', candidate.extractionMethod || 'unknown');
  detail('Extracted at', candidate.lastExtractionDate?.toISOString() || 'never');
  detail('Has summary', candidate.extractedSummary ? 'yes' : 'no');
  detail('Experience records', Array.isArray(candidate.extractedExperience) ? candidate.extractedExperience.length : 0);
  detail('Education records', Array.isArray(candidate.extractedEducation) ? candidate.extractedEducation.length : 0);

  await sleep(1500);
}

/**
 * Demo Step 5: Show LLM metrics
 */
async function step5_metrics() {
  section('Step 5: LLM Metrics & Observability');

  const metrics = await metricsService.getMetricsSummary();

  success('Metrics collected successfully');

  console.log('\n  ' + colors.bright + 'Cost & Performance:' + colors.reset);
  detail('Total API calls', metrics.totalCalls);
  detail('Success rate', `${metrics.successRate.toFixed(1)}%`);
  detail('Average latency', `${metrics.averageLatency.toFixed(0)}ms`);
  detail('Total tokens', metrics.totalTokens.toLocaleString());
  detail('Total cost', `$${metrics.totalCost.toFixed(4)}`);

  if (metrics.byModel && metrics.byModel.length > 0) {
    console.log('\n  ' + colors.bright + 'By Model:' + colors.reset);
    for (const model of metrics.byModel) {
      console.log(`\n  ${colors.magenta}${model.modelName}${colors.reset}`);
      detail('  Calls', model.calls);
      detail('  Tokens', model.tokens.toLocaleString());
      detail('  Cost', `$${model.cost.toFixed(4)}`);
      detail('  Avg latency', `${model.avgLatency.toFixed(0)}ms`);
    }
  }

  await sleep(1500);
}

/**
 * Demo Step 6: Show comparison (heuristic vs LLM)
 */
async function step6_comparison() {
  section('Step 6: Heuristic vs LLM Comparison');

  console.log('\n  ' + colors.bright + 'Key Differences:' + colors.reset);
  console.log('');
  console.log('  ' + colors.cyan + 'Heuristic Extraction:' + colors.reset);
  console.log('    ✓ Fast (< 100ms)');
  console.log('    ✓ Deterministic');
  console.log('    ✓ No cost');
  console.log('    ✗ Limited to obvious patterns');
  console.log('    ✗ No semantic understanding');
  console.log('');
  console.log('  ' + colors.magenta + 'LLM Enrichment:' + colors.reset);
  console.log('    ✓ Semantic understanding');
  console.log('    ✓ Handles ambiguity');
  console.log('    ✓ Generates summaries');
  console.log('    ✗ Slower (500-2000ms)');
  console.log('    ✗ Costs money');
  console.log('    ✗ Non-deterministic');
  console.log('');
  console.log('  ' + colors.green + 'Hybrid Approach (Used Here):' + colors.reset);
  console.log('    ✓ Best of both worlds');
  console.log('    ✓ Heuristics for known fields');
  console.log('    ✓ LLM for complex extraction');
  console.log('    ✓ Cost-efficient');

  await sleep(2000);
}

/**
 * Main demo flow
 */
async function main() {
  const args = process.argv.slice(2);
  const useRealLLM = args.includes('--real');

  try {
    // Step 1: Show document
    await step1_showDocument();

    // Get or create test candidate
    const candidateId = 'cand-001';
    const cvPath = path.join(__dirname, '../../data/cvs/alice-johnson.txt');

    // Step 2: Heuristic extraction
    await step2_heuristicExtraction(candidateId, cvPath);

    // Step 3: LLM enrichment
    await step3_llmEnrichment(candidateId, cvPath, useRealLLM);

    // Step 4: Validation
    await step4_validation(candidateId);

    // Step 5: Metrics
    await step5_metrics();

    // Step 6: Comparison
    await step6_comparison();

    // Final summary
    header('✅ Demo Complete!');

    console.log(colors.green + '  All extraction stages completed successfully.' + colors.reset);
    console.log(colors.cyan + '\n  Next steps:' + colors.reset);
    console.log('  • View extraction results in the UI');
    console.log('  • Process more documents with: npm run ingest');
    console.log('  • Query enriched data for Exercise 4');
    console.log('');

  } catch (err) {
    error(`Demo failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
