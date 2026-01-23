import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { testUsers, testCandidates } from '../setup.js';

async function getToken(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return response.body.token;
}

describe('GET /api/compare/:id1/:id2', () => {
  it('returns both candidates', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/compare/cand-001/cand-002')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('candidates');
    expect(Array.isArray(response.body.candidates)).toBe(true);
    expect(response.body.candidates.length).toBe(2);

    // Verify both candidates are returned in order
    expect(response.body.candidates[0].id).toBe('cand-001');
    expect(response.body.candidates[0].name).toBe(testCandidates[0].name);

    expect(response.body.candidates[1].id).toBe('cand-002');
    expect(response.body.candidates[1].name).toBe(testCandidates[1].name);
  });

  it('returns 404 if either candidate not found', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    // First candidate doesn't exist
    let response = await request(app)
      .get('/api/compare/non-existent/cand-002')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body.message).toContain('non-existent');

    // Second candidate doesn't exist
    response = await request(app)
      .get('/api/compare/cand-001/non-existent')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('non-existent');

    // Both don't exist
    response = await request(app)
      .get('/api/compare/fake-001/fake-002')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('fake-001');
    expect(response.body.message).toContain('fake-002');
  });

  it('handles comparing same ID gracefully', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/compare/cand-001/cand-001')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.candidates.length).toBe(2);
    // Both should be the same candidate
    expect(response.body.candidates[0].id).toBe('cand-001');
    expect(response.body.candidates[1].id).toBe('cand-001');
  });

  it('returns 401 without auth', async () => {
    const response = await request(app).get('/api/compare/cand-001/cand-002');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });

  it('returns candidates with all required fields', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/compare/cand-001/cand-002')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    for (const candidate of response.body.candidates) {
      // Verify all required Candidate fields
      expect(candidate).toHaveProperty('id');
      expect(candidate).toHaveProperty('name');
      expect(candidate).toHaveProperty('email');
      expect(candidate).toHaveProperty('phone');
      expect(candidate).toHaveProperty('skills');
      expect(candidate).toHaveProperty('positionIds');
      expect(candidate).toHaveProperty('cvUrl');
      expect(candidate).toHaveProperty('status');
    }
  });
});
