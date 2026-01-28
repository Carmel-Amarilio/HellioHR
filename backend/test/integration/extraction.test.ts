import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { ExtractionService } from '../../src/services/extractionService.js';

const prisma = new PrismaClient();

describe('ExtractionService Integration', () => {
  let testCandidateId: string;
  let testPositionId: string;

  beforeEach(async () => {
    // Clean up any existing test data first
    await prisma.document.deleteMany({
      where: {
        OR: [
          { candidateId: { contains: 'test-cand-extraction' } },
          { positionId: { contains: 'test-pos-extraction' } },
        ],
      },
    });

    await prisma.candidate.deleteMany({
      where: { id: { contains: 'test-cand-extraction' } },
    });

    await prisma.position.deleteMany({
      where: { id: { contains: 'test-pos-extraction' } },
    });

    // Create test candidate with unique ID to avoid conflicts
    const uniqueSuffix = Date.now();
    const candidate = await prisma.candidate.create({
      data: {
        id: `test-cand-extraction-${uniqueSuffix}`,
        name: 'Test Candidate',
        email: `test-${uniqueSuffix}@extraction.com`,
        phone: '555-0000',
        skills: [],
        status: 'ACTIVE',
      },
    });
    testCandidateId = candidate.id;

    // Create test position
    const position = await prisma.position.create({
      data: {
        id: `test-pos-extraction-${uniqueSuffix}`,
        title: 'Test Position',
        department: 'Engineering',
        description: 'Test position for extraction',
      },
    });
    testPositionId = position.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('CV Extraction', () => {
    it('should extract from CV with heuristics only', async () => {
      const service = new ExtractionService();
      const cvPath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');

      const result = await service.processCandidateCV(
        testCandidateId,
        cvPath,
        'alice-johnson.txt',
        false // heuristics only
      );

      expect(result.success).toBe(true);
      expect(result.extraction).toBeDefined();
      expect(result.extraction.email).toBe('alice.johnson@email.com');
      expect(result.extraction.phone).toBe('+1-555-0101');
      expect(result.extraction.skills).toBeDefined();
      expect(result.extraction.skills.length).toBeGreaterThan(0);
      expect(result.extraction.extractionMethod).toBe('heuristic');

      // Verify data was persisted
      const candidate = await prisma.candidate.findUnique({
        where: { id: testCandidateId },
      });

      expect(candidate?.email).toBe('alice.johnson@email.com');
      expect(candidate?.extractionStatus).toBe('success');
      expect(candidate?.extractionMethod).toBe('heuristic');
    }, 30000);

    it('should extract from CV with mock LLM enrichment', async () => {
      // Update candidate to allow re-extraction
      await prisma.candidate.update({
        where: { id: testCandidateId },
        data: {
          lastExtractionDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      });

      const service = new ExtractionService();
      const cvPath = path.join(process.cwd(), '..', 'data', 'cvs', 'bob-smith.txt');

      const result = await service.processCandidateCV(
        testCandidateId,
        cvPath,
        'bob-smith.txt',
        true // with LLM
      );

      expect(result.success).toBe(true);
      expect(result.extraction).toBeDefined();
      expect(result.extraction.extractedSummary).toBeDefined();
      expect(result.extraction.extractedSummary.length).toBeGreaterThan(0);
      expect(result.extraction.extractionMethod).toBe('hybrid');

      // Verify data was persisted
      const candidate = await prisma.candidate.findUnique({
        where: { id: testCandidateId },
      });

      expect(candidate?.extractedSummary).toBeDefined();
      expect(candidate?.extractionStatus).toBe('success');
      expect(candidate?.extractionMethod).toBe('hybrid');
      expect(candidate?.extractionPromptVersion).toBe('cv-v1.0');
    }, 30000);

    it('should return cached result if extracted recently', async () => {
      const service = new ExtractionService();
      const cvPath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');

      // First extraction (create the document and extract)
      await service.processCandidateCV(
        testCandidateId,
        cvPath,
        'alice-johnson.txt',
        true
      );

      // Get the created document
      const document = await prisma.document.findFirst({
        where: { candidateId: testCandidateId },
        orderBy: { createdAt: 'desc' },
      });

      expect(document).toBeDefined();

      // Second extraction immediately (should be cached)
      const result2 = await service.processDocument(
        document!.id,
        true
      );

      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
    }, 30000);

    it('should record LLM metrics', async () => {
      // Update candidate to allow re-extraction
      await prisma.candidate.update({
        where: { id: testCandidateId },
        data: {
          lastExtractionDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });

      const service = new ExtractionService();
      const cvPath = path.join(process.cwd(), '..', 'data', 'cvs', 'carol-davis.txt');

      const result = await service.processCandidateCV(
        testCandidateId,
        cvPath,
        'carol-davis.txt',
        true
      );

      expect(result.success).toBe(true);

      // Check that metrics were recorded
      const metrics = await prisma.llmMetric.findMany({
        where: {
          entityType: 'candidate',
          entityId: testCandidateId,
        },
      });

      expect(metrics.length).toBeGreaterThan(0);

      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.modelName).toBe('amazon.nova-lite-v1:0');
      expect(latestMetric.promptVersion).toBe('cv-v1.0');
      expect(latestMetric.promptTokens).toBeGreaterThan(0);
      expect(latestMetric.completionTokens).toBeGreaterThan(0);
      expect(latestMetric.success).toBe(true);
      expect(Number(latestMetric.estimatedCostUsd)).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Job Description Extraction', () => {
    it('should extract from job description with LLM', async () => {
      const service = new ExtractionService();
      const jdPath = path.join(process.cwd(), '..', 'data', 'job-descriptions', 'frontend-developer.txt');

      const result = await service.processPositionJobDescription(
        testPositionId,
        jdPath,
        'frontend-developer.txt',
        true
      );

      expect(result.success).toBe(true);
      expect(result.extraction).toBeDefined();
      expect(result.extraction.extractedSummary).toBeDefined();
      expect(result.extraction.extractedRequirements).toBeDefined();
      expect(result.extraction.extractedResponsibilities).toBeDefined();
      expect(result.extraction.extractionMethod).toBe('llm');

      // Verify data was persisted
      const position = await prisma.position.findUnique({
        where: { id: testPositionId },
      });

      expect(position?.extractedSummary).toBeDefined();
      expect(position?.extractionStatus).toBe('success');
      expect(position?.extractionMethod).toBe('llm');
    }, 30000);

    it('should fail job description extraction without LLM', async () => {
      const service = new ExtractionService();
      const jdPath = path.join(process.cwd(), '..', 'data', 'job-descriptions', 'backend-developer.txt');

      const result = await service.processPositionJobDescription(
        testPositionId,
        jdPath,
        'backend-developer.txt',
        false // no LLM
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM required');
    }, 30000);
  });

  describe('Document Parsing', () => {
    it('should parse and store raw text', async () => {
      const service = new ExtractionService();
      const cvPath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');

      // Create a new document
      const document = await prisma.document.create({
        data: {
          type: 'CV',
          fileName: 'test-parse.txt',
          filePath: cvPath,
          candidateId: testCandidateId,
          processingStatus: 'pending',
        },
      });

      const result = await service.processDocument(document.id, false);

      expect(result.success).toBe(true);

      // Verify raw text was stored
      const updatedDoc = await prisma.document.findUnique({
        where: { id: document.id },
      });

      expect(updatedDoc?.rawText).toBeDefined();
      expect(updatedDoc?.rawText?.length).toBeGreaterThan(0);
      expect(updatedDoc?.processingStatus).toBe('enriched');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle non-existent document', async () => {
      const service = new ExtractionService();

      const result = await service.processDocument('non-existent-id', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document not found');
    });

    it('should handle invalid file path', async () => {
      const service = new ExtractionService();

      const result = await service.processCandidateCV(
        testCandidateId,
        '/invalid/path/file.txt',
        'invalid.txt',
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
