import { PrismaClient, Status } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// User data
const users = [
  { email: 'viewer@hellio.hr', password: 'viewer123', role: 'VIEWER' as const },
  { email: 'editor@hellio.hr', password: 'editor123', role: 'EDITOR' as const },
];

// Position data (from positions.json)
const positions = [
  {
    id: 'pos-001',
    title: 'Frontend Developer',
    department: 'Engineering',
    description: 'Build and maintain user interfaces using React and TypeScript.',
  },
  {
    id: 'pos-002',
    title: 'Backend Developer',
    department: 'Engineering',
    description: 'Develop APIs and services using Python and Django.',
  },
  {
    id: 'pos-003',
    title: 'DevOps Engineer',
    department: 'Infrastructure',
    description: 'Manage cloud infrastructure and CI/CD pipelines.',
  },
  {
    id: 'pos-004',
    title: 'Platform Engineer',
    department: 'Infrastructure',
    description: 'Build and maintain internal platforms and developer tools.',
  },
  {
    id: 'pos-005',
    title: 'UX Designer',
    department: 'Design',
    description: 'Create intuitive user experiences and design systems.',
  },
  {
    id: 'pos-006',
    title: 'Machine Learning Engineer',
    department: 'Data Science',
    description: 'Develop and deploy ML models for production systems.',
  },
  {
    id: 'pos-007',
    title: 'Mobile Developer',
    department: 'Engineering',
    description: 'Build cross-platform mobile applications using React Native.',
  },
  {
    id: 'pos-008',
    title: 'Technical Project Manager',
    department: 'Operations',
    description: 'Lead cross-functional teams and manage software delivery.',
  },
];

// Candidate data (from candidates.json)
const candidates = [
  {
    id: 'cand-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    phone: '+1-555-0101',
    skills: ['React', 'TypeScript', 'Node.js'],
    positionIds: ['pos-001'],
    cvUrl: '/cvs/alice-johnson.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-002',
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    phone: '+1-555-0102',
    skills: ['Python', 'Django', 'PostgreSQL'],
    positionIds: ['pos-002'],
    cvUrl: '/cvs/bob-smith.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-003',
    name: 'Carol Davis',
    email: 'carol.davis@email.com',
    phone: '+1-555-0103',
    skills: ['React', 'Python', 'AWS'],
    positionIds: ['pos-001', 'pos-002'],
    cvUrl: '/cvs/carol-davis.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-004',
    name: 'David Chen',
    email: 'david.chen@email.com',
    phone: '+1-555-0104',
    skills: ['Java', 'Spring Boot', 'Kubernetes', 'Docker'],
    positionIds: ['pos-003', 'pos-004'],
    cvUrl: '/cvs/david-chen.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-005',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@email.com',
    phone: '+1-555-0105',
    skills: ['UI/UX Design', 'Figma', 'CSS', 'JavaScript'],
    positionIds: ['pos-005'],
    cvUrl: '/cvs/emily-rodriguez.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-006',
    name: 'Frank Williams',
    email: 'frank.williams@email.com',
    phone: '+1-555-0106',
    skills: ['Go', 'Rust', 'Microservices', 'gRPC'],
    positionIds: ['pos-002', 'pos-004'],
    cvUrl: '/cvs/frank-williams.pdf',
    status: 'INACTIVE' as Status,
  },
  {
    id: 'cand-007',
    name: 'Grace Kim',
    email: 'grace.kim@email.com',
    phone: '+1-555-0107',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'PyTorch'],
    positionIds: ['pos-006'],
    cvUrl: '/cvs/grace-kim.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-008',
    name: 'Henry Patel',
    email: 'henry.patel@email.com',
    phone: '+1-555-0108',
    skills: ['React Native', 'iOS', 'Android', 'TypeScript'],
    positionIds: ['pos-007'],
    cvUrl: '/cvs/henry-patel.pdf',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-009',
    name: 'Isabella Martinez',
    email: 'isabella.martinez@email.com',
    phone: '+1-555-0109',
    skills: ['Project Management', 'Agile', 'Scrum', 'JIRA'],
    positionIds: ['pos-008'],
    cvUrl: '/cvs/isabella-martinez.pdf',
    status: 'ACTIVE' as Status,
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Seed users (idempotent with upsert)
  console.log('Creating users...');
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
    console.log(`  - ${user.email} (password: ${user.password})`);
  }

  // Seed positions (idempotent with upsert)
  console.log('Creating positions...');
  for (const position of positions) {
    await prisma.position.upsert({
      where: { id: position.id },
      update: {
        title: position.title,
        department: position.department,
        description: position.description,
      },
      create: position,
    });
    console.log(`  - ${position.id}: ${position.title}`);
  }

  // Seed candidates (idempotent with upsert)
  console.log('Creating candidates...');
  for (const candidate of candidates) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { positionIds, ...candidateData } = candidate;
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        skills: candidateData.skills,
        cvUrl: candidateData.cvUrl,
        status: candidateData.status,
      },
      create: {
        id: candidateData.id,
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        skills: candidateData.skills,
        cvUrl: candidateData.cvUrl,
        status: candidateData.status,
      },
    });
    console.log(`  - ${candidate.id}: ${candidate.name}`);
  }

  // Seed candidate-position relationships (idempotent)
  console.log('Creating candidate-position relationships...');
  for (const candidate of candidates) {
    for (const positionId of candidate.positionIds) {
      await prisma.candidatePosition.upsert({
        where: {
          candidateId_positionId: {
            candidateId: candidate.id,
            positionId: positionId,
          },
        },
        update: {},
        create: {
          candidateId: candidate.id,
          positionId: positionId,
        },
      });
    }
  }
  console.log('  - All relationships created');

  console.log('\nSeeding completed successfully!');
  console.log('\nDemo accounts:');
  console.log('  - viewer@hellio.hr / viewer123 (viewer role)');
  console.log('  - editor@hellio.hr / editor123 (editor role)');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
