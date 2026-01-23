import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { testUsers } from '../setup.js';
import { config } from '../../src/config/env.js';

describe('POST /api/auth/login', () => {
  it('returns JWT for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.viewer.email,
        password: testUsers.viewer.password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUsers.viewer.email);
    expect(response.body.user.role).toBe('viewer');

    // Verify token is valid JWT
    const decoded = jwt.verify(response.body.token, config.jwtSecret) as { email: string; role: string };
    expect(decoded.email).toBe(testUsers.viewer.email);
    expect(decoded.role).toBe('viewer');
  });

  it('returns JWT for editor with correct role', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.editor.email,
        password: testUsers.editor.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('editor');
  });

  it('returns 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers.viewer.email,
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
    expect(response.body).toHaveProperty('message', 'Invalid credentials');
  });

  it('returns 401 for non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'anypassword',
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });

  it('returns 400 for missing fields', async () => {
    // Missing password
    let response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUsers.viewer.email });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Bad Request');
    expect(response.body).toHaveProperty('message', 'Email and password are required');

    // Missing email
    response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'somepassword' });

    expect(response.status).toBe(400);

    // Empty body
    response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  async function getToken(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    return response.body.token;
  }

  it('returns user with role for valid token', async () => {
    const token = await getToken(testUsers.viewer.email, testUsers.viewer.password);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', testUsers.viewer.email);
    expect(response.body).toHaveProperty('role', 'viewer');
  });

  it('returns correct role for editor', async () => {
    const token = await getToken(testUsers.editor.email, testUsers.editor.password);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('role', 'editor');
  });

  it('returns 401 without token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
    expect(response.body).toHaveProperty('message', 'No token provided');
  });

  it('returns 401 for invalid token format', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidFormat');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'Invalid token format');
  });

  it('returns 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });

  it('returns 401 for expired token', async () => {
    // Create an expired token
    const expiredToken = jwt.sign(
      { userId: 'test', email: testUsers.viewer.email, role: 'viewer' },
      config.jwtSecret,
      { expiresIn: '-1s' }
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message', 'Token expired');
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});
