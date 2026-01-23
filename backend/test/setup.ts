import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test users
export const testUsers = {
  viewer: {
    email: 'viewer@test.com',
    password: 'viewerpassword',
    role: 'VIEWER' as const,
  },
  editor: {
    email: 'editor@test.com',
    password: 'editorpassword',
    role: 'EDITOR' as const,
  },
};

// Test positions
export const testPositions = [
  {
    id: 'pos-001',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    description: 'We are looking for an experienced frontend developer.',
  },
  {
    id: 'pos-002',
    title: 'Backend Engineer',
    department: 'Engineering',
    description: 'Join our backend team to build scalable services.',
  },
];

// Test candidates
export const testCandidates = [
  {
    id: 'cand-001',
    name: 'Alice Johnson',
    email: 'alice@test.com',
    phone: '+1-555-0101',
    skills: ['React', 'TypeScript', 'Node.js'],
    cvUrl: '/cvs/alice.pdf',
    status: 'ACTIVE' as const,
  },
  {
    id: 'cand-002',
    name: 'Bob Smith',
    email: 'bob@test.com',
    phone: '+1-555-0102',
    skills: ['Python', 'Django', 'PostgreSQL'],
    cvUrl: '/cvs/bob.pdf',
    status: 'ACTIVE' as const,
  },
];

// Candidate-Position relationships
export const testCandidatePositions = [
  { candidateId: 'cand-001', positionId: 'pos-001' },
  { candidateId: 'cand-001', positionId: 'pos-002' },
  { candidateId: 'cand-002', positionId: 'pos-002' },
];

export async function createTestUsers(): Promise<void> {
  for (const [, userData] of Object.entries(testUsers)) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: { passwordHash, role: userData.role },
      create: {
        email: userData.email,
        passwordHash,
        role: userData.role,
      },
    });
  }
}

export async function createTestPositions(): Promise<void> {
  for (const position of testPositions) {
    await prisma.position.upsert({
      where: { id: position.id },
      update: {},
      create: position,
    });
  }
}

export async function createTestCandidates(): Promise<void> {
  for (const candidate of testCandidates) {
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {},
      create: candidate,
    });
  }
}

export async function createTestCandidatePositions(): Promise<void> {
  for (const cp of testCandidatePositions) {
    await prisma.candidatePosition.upsert({
      where: {
        candidateId_positionId: {
          candidateId: cp.candidateId,
          positionId: cp.positionId,
        },
      },
      update: {},
      create: cp,
    });
  }
}

export async function cleanDatabase(): Promise<void> {
  // Delete in order to respect foreign keys
  await prisma.candidatePosition.deleteMany();
  await prisma.document.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.position.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
  // Create test data
  await createTestUsers();
  await createTestPositions();
  await createTestCandidates();
  await createTestCandidatePositions();
});

export { prisma };
