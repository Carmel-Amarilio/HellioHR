import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { testUsers, testPositions } from '../setup.js';
import { Position } from '../../src/types/index.js';

async function getToken(email: string, password: string): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return response.body.token;
}

describe('GET /api/positions', () => {
  it('returns array of positions with candidateIds[]', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/positions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);

    // Check first position has candidateIds
    const position = response.body.find((p: Position) => p.id === 'pos-001');
    expect(position).toBeDefined();
    expect(position.candidateIds).toEqual(['cand-001']);

    // Check second position has both candidates
    const position2 = response.body.find((p: Position) => p.id === 'pos-002');
    expect(position2.candidateIds).toContain('cand-001');
    expect(position2.candidateIds).toContain('cand-002');
    expect(position2.candidateIds.length).toBe(2);
  });

  it('matches Position interface exactly', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/positions')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);

    const position: Position = response.body[0];

    // Verify all required fields are present
    expect(typeof position.id).toBe('string');
    expect(typeof position.title).toBe('string');
    expect(typeof position.department).toBe('string');
    expect(typeof position.description).toBe('string');
    expect(Array.isArray(position.candidateIds)).toBe(true);

    // Verify no extra fields
    const keys = Object.keys(position);
    expect(keys.sort()).toEqual(['candidateIds', 'department', 'description', 'id', 'title'].sort());
  });

  it('returns 401 without auth', async () => {
    const response = await request(app).get('/api/positions');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });

  it('returns positions for both viewer and editor roles', async () => {
    const viewerToken = await getToken(testUsers.viewer.email, testUsers.viewer.password);
    const editorToken = await getToken(testUsers.editor.email, testUsers.editor.password);

    const viewerResponse = await request(app)
      .get('/api/positions')
      .set('Authorization', `Bearer ${viewerToken}`);

    const editorResponse = await request(app)
      .get('/api/positions')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(viewerResponse.status).toBe(200);
    expect(editorResponse.status).toBe(200);
    expect(viewerResponse.body.length).toBe(editorResponse.body.length);
  });
});

describe('GET /api/positions/:id', () => {
  it('returns single position', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('pos-001');
    expect(response.body.title).toBe(testPositions[0].title);
    expect(response.body.department).toBe(testPositions[0].department);
    expect(response.body.description).toBe(testPositions[0].description);
    expect(response.body.candidateIds).toEqual(['cand-001']);
  });

  it('returns 404 for non-existent ID', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/positions/non-existent')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
    expect(response.body.message).toContain('non-existent');
  });

  it('returns 401 without auth', async () => {
    const response = await request(app).get('/api/positions/pos-001');

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/positions/:id', () => {
  it('returns 403 for viewer role', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .patch('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Forbidden');
    expect(response.body.message).toContain('Editor role required');
  });

  it('returns 200 and updates for editor role', async () => {
    const token = await getToken(testUsers.editor.email, testUsers.editor.password);

    const response = await request(app)
      .patch('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Title');
    expect(response.body.department).toBe(testPositions[0].department); // unchanged
  });

  it('returns 401 without auth', async () => {
    const response = await request(app)
      .patch('/api/positions/pos-001')
      .send({ title: 'New Title' });

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid data (no fields)', async () => {
    const token = await getToken(testUsers.editor.email, testUsers.editor.password);

    const response = await request(app)
      .patch('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
  });

  it('returns 404 for non-existent ID', async () => {
    const token = await getToken(testUsers.editor.email, testUsers.editor.password);

    const response = await request(app)
      .patch('/api/positions/non-existent')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });

    expect(response.status).toBe(404);
  });

  it('persists changes (verify with GET)', async () => {
    const token = await getToken(testUsers.editor.email, testUsers.editor.password);

    // Update
    await request(app)
      .patch('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Persisted Title', department: 'New Dept' });

    // Verify
    const response = await request(app)
      .get('/api/positions/pos-001')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.title).toBe('Persisted Title');
    expect(response.body.department).toBe('New Dept');
  });
});
