import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { testUsers, testCandidates } from '../setup.js';
import { Candidate } from '../../src/types/index.js';

async function getToken(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return response.body.token;
}

describe('GET /api/candidates', () => {
  it('returns array of candidates with positionIds[]', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    // Check first candidate has positionIds
    const candidate = response.body.find((c: Candidate) => c.id === 'cand-001');
    expect(candidate).toBeDefined();
    expect(candidate.positionIds).toContain('pos-001');
    expect(candidate.positionIds).toContain('pos-002');
    expect(candidate.positionIds.length).toBe(2);

    // Check second candidate
    const candidate2 = response.body.find((c: Candidate) => c.id === 'cand-002');
    expect(candidate2.positionIds).toEqual(['pos-002']);
  });

  it('matches Candidate interface exactly', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const candidate: Candidate = response.body[0];

    // Verify all required fields are present and typed correctly
    expect(typeof candidate.id).toBe('string');
    expect(typeof candidate.name).toBe('string');
    expect(typeof candidate.email).toBe('string');
    expect(typeof candidate.phone).toBe('string');
    expect(Array.isArray(candidate.skills)).toBe(true);
    expect(Array.isArray(candidate.positionIds)).toBe(true);
    expect(typeof candidate.cvUrl).toBe('string');
    expect(typeof candidate.status).toBe('string');

    // Verify no extra fields
    const keys = Object.keys(candidate);
    expect(keys.sort()).toEqual(['cvUrl', 'email', 'id', 'name', 'phone', 'positionIds', 'skills', 'status'].sort());
  });

  it('skills[] is array of strings', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const candidate = response.body.find((c: Candidate) => c.id === 'cand-001');
    expect(Array.isArray(candidate.skills)).toBe(true);
    expect(candidate.skills.every((s: unknown) => typeof s === 'string')).toBe(true);
    expect(candidate.skills).toEqual(testCandidates[0].skills);
  });

  it('status is "active" or "inactive" (lowercase)', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    for (const candidate of response.body) {
      expect(['active', 'inactive']).toContain(candidate.status);
      // Verify it's lowercase (not 'ACTIVE' or 'INACTIVE')
      expect(candidate.status).toBe(candidate.status.toLowerCase());
    }
  });

  it('returns 401 without auth', async () => {
    const response = await request(app).get('/api/candidates');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });
});

describe('GET /api/candidates/:id', () => {
  it('returns single candidate', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates/cand-001')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('cand-001');
    expect(response.body.name).toBe(testCandidates[0].name);
    expect(response.body.email).toBe(testCandidates[0].email);
    expect(response.body.phone).toBe(testCandidates[0].phone);
    expect(response.body.skills).toEqual(testCandidates[0].skills);
    expect(response.body.cvUrl).toBe(testCandidates[0].cvUrl);
    expect(response.body.status).toBe('active');
    expect(response.body.positionIds).toContain('pos-001');
    expect(response.body.positionIds).toContain('pos-002');
  });

  it('returns 404 for non-existent ID', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/candidates/non-existent')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body.message).toContain('non-existent');
  });

  it('returns 401 without auth', async () => {
    const response = await request(app).get('/api/candidates/cand-001');

    expect(response.status).toBe(401);
  });
});
