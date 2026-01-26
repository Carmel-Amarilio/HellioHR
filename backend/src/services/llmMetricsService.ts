import { PrismaClient } from '@prisma/client';
import { LLMResponse } from './llm/LLMClient.js';

const prisma = new PrismaClient();

export interface MetricsSummary {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
  byModel: {
    modelName: string;
    calls: number;
    tokens: number;
    cost: number;
    avgLatency: number;
  }[];
}

export class LLMMetricsService {
  /**
   * Record an LLM API call metric
   */
  async recordMetric(data: {
    documentId?: string;
    entityType: 'candidate' | 'position';
    entityId?: string;
    modelName: string;
    promptVersion: string;
    usage: LLMResponse['usage'];
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    estimatedCostUsd: number;
  }): Promise<void> {
    await prisma.llmMetric.create({
      data: {
        documentId: data.documentId,
        entityType: data.entityType,
        entityId: data.entityId,
        modelName: data.modelName,
        promptVersion: data.promptVersion,
        promptTokens: data.usage.promptTokens,
        completionTokens: data.usage.completionTokens,
        totalTokens: data.usage.totalTokens,
        estimatedCostUsd: data.estimatedCostUsd,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage,
      },
    });
  }

  /**
   * Get metrics summary with optional filters
   */
  async getMetricsSummary(filters?: {
    startDate?: Date;
    endDate?: Date;
    modelName?: string;
    entityType?: 'candidate' | 'position';
  }): Promise<MetricsSummary> {
    const where: any = {};

    if (filters?.startDate) {
      where.createdAt = { gte: filters.startDate };
    }

    if (filters?.endDate) {
      where.createdAt = { ...where.createdAt, lte: filters.endDate };
    }

    if (filters?.modelName) {
      where.modelName = filters.modelName;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    const metrics = await prisma.llmMetric.findMany({ where });

    if (metrics.length === 0) {
      return {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        successRate: 0,
        byModel: [],
      };
    }

    const totalCalls = metrics.length;
    const totalTokens = metrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalCost = metrics.reduce((sum, m) => sum + Number(m.estimatedCostUsd ?? 0), 0);
    const averageLatency = metrics.reduce((sum, m) => sum + (m.latencyMs ?? 0), 0) / totalCalls;
    const successCount = metrics.filter(m => m.success).length;
    const successRate = (successCount / totalCalls) * 100;

    // Group by model
    const byModelMap = new Map<string, any>();

    for (const metric of metrics) {
      if (!byModelMap.has(metric.modelName)) {
        byModelMap.set(metric.modelName, {
          modelName: metric.modelName,
          calls: 0,
          tokens: 0,
          cost: 0,
          latencies: [],
        });
      }

      const modelData = byModelMap.get(metric.modelName);
      modelData.calls++;
      modelData.tokens += metric.totalTokens;
      modelData.cost += Number(metric.estimatedCostUsd ?? 0);
      if (metric.latencyMs) {
        modelData.latencies.push(metric.latencyMs);
      }
    }

    const byModel = Array.from(byModelMap.values()).map(data => ({
      modelName: data.modelName,
      calls: data.calls,
      tokens: data.tokens,
      cost: data.cost,
      avgLatency: data.latencies.length > 0
        ? data.latencies.reduce((sum: number, l: number) => sum + l, 0) / data.latencies.length
        : 0,
    }));

    return {
      totalCalls,
      totalTokens,
      totalCost,
      averageLatency,
      successRate,
      byModel,
    };
  }

  /**
   * Get metrics for a specific entity (candidate or position)
   */
  async getEntityMetrics(entityType: 'candidate' | 'position', entityId: string) {
    const metrics = await prisma.llmMetric.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return metrics;
  }

  /**
   * Get metrics for a specific document
   */
  async getDocumentMetrics(documentId: string) {
    const metrics = await prisma.llmMetric.findMany({
      where: {
        documentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return metrics;
  }
}
