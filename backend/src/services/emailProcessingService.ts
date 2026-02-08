import { PrismaClient, EmailType } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogEmailProcessingInput {
  gmailMessageId: string;
  subject: string;
  sender: string;
  receivedAt: Date;
  classifiedAs: EmailType;
  processingStatus: 'pending' | 'processed' | 'failed';
  candidateId?: string;
  positionId?: string;
  documentId?: string;
  errorMessage?: string;
}

export interface EmailProcessingLog {
  id: string;
  gmailMessageId: string;
  subject: string;
  sender: string;
  receivedAt: Date;
  classifiedAs: EmailType;
  processingStatus: string;
  candidateId: string | null;
  positionId: string | null;
  documentId: string | null;
  errorMessage: string | null;
  processedAt: Date;
}

/**
 * Log email processing activity (idempotent via gmailMessageId)
 */
export async function logEmailProcessing(
  input: LogEmailProcessingInput
): Promise<EmailProcessingLog> {
  const log = await prisma.emailProcessingLog.upsert({
    where: { gmailMessageId: input.gmailMessageId },
    update: {
      processingStatus: input.processingStatus,
      candidateId: input.candidateId,
      positionId: input.positionId,
      documentId: input.documentId,
      errorMessage: input.errorMessage,
      processedAt: new Date(),
    },
    create: {
      gmailMessageId: input.gmailMessageId,
      subject: input.subject,
      sender: input.sender,
      receivedAt: input.receivedAt,
      classifiedAs: input.classifiedAs,
      processingStatus: input.processingStatus,
      candidateId: input.candidateId,
      positionId: input.positionId,
      documentId: input.documentId,
      errorMessage: input.errorMessage,
    },
  });

  return log;
}

/**
 * Check if an email has already been processed (idempotency check)
 */
export async function isProcessed(gmailMessageId: string): Promise<boolean> {
  const log = await prisma.emailProcessingLog.findUnique({
    where: { gmailMessageId },
  });

  return log !== null && log.processingStatus === 'processed';
}

/**
 * Get processing log by Gmail message ID
 */
export async function getProcessingLog(gmailMessageId: string): Promise<EmailProcessingLog | null> {
  return await prisma.emailProcessingLog.findUnique({
    where: { gmailMessageId },
  });
}

/**
 * Get recent email processing logs
 */
export async function getRecentLogs(limit = 50): Promise<EmailProcessingLog[]> {
  return await prisma.emailProcessingLog.findMany({
    orderBy: { processedAt: 'desc' },
    take: limit,
  });
}

/**
 * Get logs by status
 */
export async function getLogsByStatus(
  status: 'pending' | 'processed' | 'failed'
): Promise<EmailProcessingLog[]> {
  return await prisma.emailProcessingLog.findMany({
    where: { processingStatus: status },
    orderBy: { processedAt: 'desc' },
  });
}
