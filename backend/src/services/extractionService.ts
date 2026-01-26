import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import { DocumentParser } from '../utils/documentParsers.js';
import { SectionDetector } from '../utils/sectionDetector.js';
import { HeuristicExtractor } from '../extractors/heuristicExtractor.js';
import { ExtractionValidator } from '../validators/extractionValidator.js';
import { LLMClient } from './llm/LLMClient.js';
import { LLMFactory } from './llm/LLMFactory.js';
import { LLMMetricsService } from './llmMetricsService.js';
import { PROMPTS, renderPrompt } from '../prompts/index.js';
import { config } from '../config/env.js';

const prisma = new PrismaClient();

export interface ExtractionResult {
  success: boolean;
  cached?: boolean;
  extraction?: any;
  validation?: any;
  error?: string;
}

export class ExtractionService {
  private documentParser: DocumentParser;
  private sectionDetector: SectionDetector;
  private heuristicExtractor: HeuristicExtractor;
  private validator: ExtractionValidator;
  private llmClient: LLMClient;
  private metricsService: LLMMetricsService;

  constructor(modelName?: string) {
    this.documentParser = new DocumentParser();
    this.sectionDetector = new SectionDetector();
    this.heuristicExtractor = new HeuristicExtractor();
    this.validator = new ExtractionValidator();
    this.metricsService = new LLMMetricsService();

    // Create LLM client
    const llmConfig = {
      provider: config.llm.provider,
      model: modelName || config.llm.defaultModel,
      region: config.llm.region,
      maxTokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
    };

    this.llmClient = LLMFactory.createClient(llmConfig);
  }

  /**
   * Stage 1: Parse document to text
   */
  async parseDocument(buffer: Buffer, filename: string) {
    return this.documentParser.parse(buffer, filename);
  }

  /**
   * Stage 2: Heuristic extraction (always runs first)
   */
  async extractHeuristics(text: string, documentType: 'CV' | 'JOB_DESCRIPTION') {
    if (documentType === 'CV') {
      return this.heuristicExtractor.extractCandidateInfo(text);
    } else {
      // For job descriptions, we don't have heuristic extraction yet
      return {
        confidence: 'low' as const,
        fields: {},
      };
    }
  }

  /**
   * Stage 3: LLM enrichment (for ambiguous fields and summaries)
   */
  async enrichWithLLM(
    text: string,
    heuristicResult: any,
    documentType: 'CV' | 'JOB_DESCRIPTION'
  ) {
    const promptTemplate = documentType === 'CV'
      ? PROMPTS.CV_EXTRACTION
      : PROMPTS.JOB_DESCRIPTION_EXTRACTION;

    const prompt = renderPrompt(promptTemplate, { text });

    const response = await this.llmClient.generate({
      systemPrompt: promptTemplate.systemPrompt,
      prompt,
    });

    // Parse JSON response (handle markdown code blocks)
    try {
      let jsonText = response.text.trim();

      // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      }

      const extracted = JSON.parse(jsonText);
      return {
        extracted,
        usage: response.usage,
        modelId: response.modelId,
        latencyMs: response.latencyMs,
        promptVersion: promptTemplate.version,
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}\nRaw response: ${response.text.substring(0, 200)}`);
    }
  }

  /**
   * Combine heuristic and LLM results (prefer LLM when available, fall back to heuristics)
   */
  private combineResults(heuristicResult: any, llmResult?: any) {
    if (!llmResult) {
      // No LLM result, use only heuristics
      return {
        name: heuristicResult.fields.name?.value,
        email: heuristicResult.fields.email?.value,
        phone: heuristicResult.fields.phone?.value,
        skills: heuristicResult.fields.skills?.value || [],
        extractedSummary: undefined,
        extractedExperience: heuristicResult.fields.experience?.value,
        extractedEducation: heuristicResult.fields.education?.value,
        extractionMethod: 'heuristic',
      };
    }

    // Combine: prefer LLM for summary and structured data, use heuristics for contact info
    return {
      name: heuristicResult.fields.name?.value,
      email: heuristicResult.fields.email?.value,
      phone: heuristicResult.fields.phone?.value,
      skills: llmResult.extracted.skills || heuristicResult.fields.skills?.value || [],
      extractedSummary: llmResult.extracted.summary,
      extractedExperience: llmResult.extracted.experience || heuristicResult.fields.experience?.value,
      extractedEducation: llmResult.extracted.education || heuristicResult.fields.education?.value,
      extractionMethod: 'hybrid',
    };
  }

  /**
   * Combine results for job description
   */
  private combineJobDescriptionResults(llmResult: any) {
    return {
      extractedSummary: llmResult.extracted.summary,
      extractedRequirements: llmResult.extracted.requirements,
      extractedResponsibilities: llmResult.extracted.responsibilities,
      extractionMethod: 'llm',
    };
  }

  /**
   * Stage 4: Validate and persist extraction
   */
  async persistExtraction(
    documentId: string,
    extraction: any,
    documentType: 'CV' | 'JOB_DESCRIPTION',
    promptVersion?: string
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const now = new Date();

    if (documentType === 'CV' && document.candidateId) {
      // Update candidate with extraction data
      await prisma.candidate.update({
        where: { id: document.candidateId },
        data: {
          // Update contact info if extracted
          ...(extraction.name && { name: extraction.name }),
          ...(extraction.email && { email: extraction.email }),
          ...(extraction.phone && { phone: extraction.phone }),
          ...(extraction.skills && { skills: extraction.skills }),
          // Update extraction fields
          extractedSummary: extraction.extractedSummary,
          extractedExperience: extraction.extractedExperience || null,
          extractedEducation: extraction.extractedEducation || null,
          lastExtractionDate: now,
          extractionMethod: extraction.extractionMethod,
          extractionStatus: 'success',
          extractionPromptVersion: promptVersion,
        },
      });

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'enriched',
          processedAt: now,
        },
      });
    } else if (documentType === 'JOB_DESCRIPTION' && document.positionId) {
      // Update position with extraction data
      await prisma.position.update({
        where: { id: document.positionId },
        data: {
          extractedSummary: extraction.extractedSummary,
          extractedRequirements: extraction.extractedRequirements || null,
          extractedResponsibilities: extraction.extractedResponsibilities || null,
          lastExtractionDate: now,
          extractionMethod: extraction.extractionMethod,
          extractionStatus: 'success',
          extractionPromptVersion: promptVersion,
        },
      });

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'enriched',
          processedAt: now,
        },
      });
    }
  }

  /**
   * Main orchestrator: Full pipeline
   */
  async processDocument(documentId: string, useLLM: boolean = true): Promise<ExtractionResult> {
    try {
      // 1. Load document from DB
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          candidate: true,
          position: true,
        },
      });

      if (!document) {
        return { success: false, error: 'Document not found' };
      }

      const entity = document.candidate || document.position;
      const documentType = document.type as 'CV' | 'JOB_DESCRIPTION';

      // 2. Check idempotency (if extracted <1hr ago and successful, return cached)
      if (entity?.lastExtractionDate && entity?.extractionStatus === 'success') {
        const hoursSinceExtraction = (Date.now() - entity.lastExtractionDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceExtraction < 1) {
          return {
            success: true,
            cached: true,
            extraction: {
              extractedSummary: entity.extractedSummary,
              extractedExperience: 'extractedExperience' in entity ? entity.extractedExperience : undefined,
              extractedEducation: 'extractedEducation' in entity ? entity.extractedEducation : undefined,
              extractedRequirements: 'extractedRequirements' in entity ? entity.extractedRequirements : undefined,
              extractedResponsibilities: 'extractedResponsibilities' in entity ? entity.extractedResponsibilities : undefined,
            },
          };
        }
      }

      // 3. Parse document (if rawText not present)
      let text = document.rawText;
      if (!text) {
        const buffer = await fs.readFile(document.filePath);
        const parsed = await this.parseDocument(buffer, document.fileName);
        text = parsed.text;

        // Save raw text to document
        await prisma.document.update({
          where: { id: documentId },
          data: {
            rawText: text,
            mimeType: parsed.metadata.parseMethod,
            processingStatus: 'extracted',
          },
        });
      }

      // 4. Heuristic extraction
      const heuristicResult = await this.extractHeuristics(text, documentType);

      // 5. LLM enrichment (optional)
      let llmResult;
      let combined;

      if (useLLM) {
        try {
          llmResult = await this.enrichWithLLM(text, heuristicResult, documentType);

          // Record metrics
          const cost = this.llmClient.getCostEstimate(llmResult.usage);
          await this.metricsService.recordMetric({
            documentId,
            entityType: documentType === 'CV' ? 'candidate' : 'position',
            entityId: document.candidateId || document.positionId || undefined,
            modelName: llmResult.modelId,
            promptVersion: llmResult.promptVersion,
            usage: llmResult.usage,
            latencyMs: llmResult.latencyMs,
            success: true,
            estimatedCostUsd: cost,
          });

          // Combine results
          if (documentType === 'CV') {
            combined = this.combineResults(heuristicResult, llmResult);
          } else {
            combined = this.combineJobDescriptionResults(llmResult);
          }
        } catch (error) {
          console.error('LLM enrichment failed:', error);

          // Record failure metric
          await this.metricsService.recordMetric({
            documentId,
            entityType: documentType === 'CV' ? 'candidate' : 'position',
            entityId: document.candidateId || document.positionId || undefined,
            modelName: this.llmClient['config'].model,
            promptVersion: documentType === 'CV' ? PROMPTS.CV_EXTRACTION.version : PROMPTS.JOB_DESCRIPTION_EXTRACTION.version,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latencyMs: 0,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            estimatedCostUsd: 0,
          });

          // Fall back to heuristic-only
          if (documentType === 'CV') {
            combined = this.combineResults(heuristicResult);
          } else {
            return { success: false, error: 'LLM required for job description extraction' };
          }
        }
      } else {
        // Heuristics only
        if (documentType === 'CV') {
          combined = this.combineResults(heuristicResult);
        } else {
          return { success: false, error: 'LLM required for job description extraction' };
        }
      }

      // 6. Validate
      const validation = documentType === 'CV'
        ? this.validator.validateCandidateExtraction(combined)
        : this.validator.validatePositionExtraction(combined);

      if (!validation.valid) {
        console.warn('Validation errors:', validation.errors);
      }

      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings);
      }

      // 7. Persist to DB
      await this.persistExtraction(
        documentId,
        combined,
        documentType,
        llmResult?.promptVersion
      );

      return {
        success: true,
        extraction: combined,
        validation,
      };
    } catch (error) {
      console.error('Extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process a candidate CV from file path
   */
  async processCandidateCV(
    candidateId: string,
    filePath: string,
    fileName: string,
    useLLM: boolean = true
  ): Promise<ExtractionResult> {
    // Create document record
    const document = await prisma.document.create({
      data: {
        type: 'CV',
        fileName,
        filePath,
        candidateId,
        processingStatus: 'pending',
      },
    });

    return this.processDocument(document.id, useLLM);
  }

  /**
   * Process a position job description from file path
   */
  async processPositionJobDescription(
    positionId: string,
    filePath: string,
    fileName: string,
    useLLM: boolean = true
  ): Promise<ExtractionResult> {
    // Create document record
    const document = await prisma.document.create({
      data: {
        type: 'JOB_DESCRIPTION',
        fileName,
        filePath,
        positionId,
        processingStatus: 'pending',
      },
    });

    return this.processDocument(document.id, useLLM);
  }
}
