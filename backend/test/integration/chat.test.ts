import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { prisma } from '../../src/config/database.js';

async function getToken(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return response.body.token;
}

describe('Chat API', () => {
  beforeAll(async () => {
    // Wait for database connection and ensure seed data is ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify test users exist
    const users = await prisma.user.findMany();
    if (users.length === 0) {
      console.warn('Warning: No users found in database. Tests may fail.');
    }

    // Ensure test data exists
    const candidate = await prisma.candidate.findFirst();
    if (!candidate) {
      await prisma.candidate.create({
        data: {
          id: 'test-chat-cand-001',
          name: 'Chat Test Candidate',
          email: 'chattest@example.com',
          phone: '555-1111',
          skills: ['JavaScript', 'React'],
          status: 'ACTIVE',
        },
      });
    }
  });

  describe('POST /api/chat', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ question: 'List all candidates' });

      expect(res.status).toBe(401);
    });

    it('should accept authenticated requests from viewer', async () => {
      const token = await getToken('viewer@test.com', 'viewerpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'How many candidates are there?' });

      expect(res.status).not.toBe(401);
    }, 60000);

    it('should reject requests without question', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject non-string questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('string');
    });

    it('should reject empty questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should process valid candidate questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'List all candidates' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
      expect(res.body.trace).toBeDefined();
      expect(res.body.totalMetrics).toBeDefined();
    }, 60000);

    it('should process valid position questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'How many positions are open?' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
      expect(res.body.trace).toBeDefined();
    }, 60000);

    it('should include trace with SQL and execution details', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'List all departments' });

      expect(res.status).toBe(200);
      expect(res.body.trace.question).toBeDefined();
      expect(res.body.trace.sqlGeneration).toBeDefined();
      expect(res.body.trace.sqlGeneration.sql).toBeDefined();
      expect(res.body.trace.sqlGeneration.validation).toBeDefined();
      expect(res.body.trace.sqlExecution).toBeDefined();
      expect(res.body.trace.sqlExecution.rowCount).toBeDefined();
      expect(res.body.trace.answerGeneration).toBeDefined();
    }, 60000);

    it('should include total metrics', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'How many candidates are active?' });

      expect(res.status).toBe(200);
      expect(res.body.totalMetrics).toBeDefined();
      expect(res.body.totalMetrics.totalTokens).toBeGreaterThan(0);
      expect(res.body.totalMetrics.totalCostUsd).toBeGreaterThanOrEqual(0);
      expect(res.body.totalMetrics.totalLatencyMs).toBeGreaterThan(0);
      expect(res.body.totalMetrics.llmCalls).toBe(2);
    }, 60000);

    it('should reject irrelevant questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'What is the weather today?' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.suggestion).toBeDefined();
    });

    it('should suggest clarification for ambiguous questions', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'How many are there?' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.suggestion).toBeDefined();
    });

    it('should support optional modelName parameter', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: 'List all candidates',
          modelName: 'amazon.nova-lite-v1:0',
        });

      expect(res.status).toBe(200);
      if (res.body.trace?.sqlGeneration?.metrics) {
        expect(res.body.trace.sqlGeneration.metrics.modelName).toContain('nova');
      }
    }, 60000);

    it('should handle questions with no results', async () => {
      const token = await getToken('editor@test.com', 'editorpassword');
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ question: 'Find candidates with extremely rare skill XYZABC999' });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
      expect(res.body.trace.sqlExecution.rowCount).toBe(0);
    }, 60000);
  });
});
