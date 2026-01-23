import { PrismaClient, Status, DocumentType } from '@prisma/client';
import bcrypt from 'bcrypt';
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Path to data folder - check Docker path first, then local
const DOCKER_DATA_DIR = '/app/data';
const LOCAL_DATA_DIR = path.join(__dirname, '../../..', 'data');
const DATA_DIR = fs.existsSync(DOCKER_DATA_DIR) ? DOCKER_DATA_DIR : LOCAL_DATA_DIR;

// User data (fixed accounts)
const users = [
  { email: 'viewer@hellio.hr', password: 'viewer123', role: 'VIEWER' as const },
  { email: 'editor@hellio.hr', password: 'editor123', role: 'EDITOR' as const },
];

// Candidate data with CV file mappings
const candidates = [
  {
    id: 'cand-001',
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    phone: '+1-555-0101',
    skills: ['React', 'TypeScript', 'Node.js'],
    positionIds: ['pos-001'],
    cvFile: 'alice-johnson.txt',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-002',
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    phone: '+1-555-0102',
    skills: ['Python', 'Django', 'PostgreSQL'],
    positionIds: ['pos-002'],
    cvFile: 'bob-smith.txt',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-003',
    name: 'Carol Davis',
    email: 'carol.davis@email.com',
    phone: '+1-555-0103',
    skills: ['React', 'Python', 'AWS'],
    positionIds: ['pos-001', 'pos-002'],
    cvFile: 'carol-davis.txt',
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-004',
    name: 'David Chen',
    email: 'david.chen@email.com',
    phone: '+1-555-0104',
    skills: ['Java', 'Spring Boot', 'Kubernetes', 'Docker'],
    positionIds: ['pos-003', 'pos-004'],
    cvFile: null, // No CV uploaded yet
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-005',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@email.com',
    phone: '+1-555-0105',
    skills: ['UI/UX Design', 'Figma', 'CSS', 'JavaScript'],
    positionIds: ['pos-005'],
    cvFile: null,
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-006',
    name: 'Frank Williams',
    email: 'frank.williams@email.com',
    phone: '+1-555-0106',
    skills: ['Go', 'Rust', 'Microservices', 'gRPC'],
    positionIds: ['pos-002', 'pos-004'],
    cvFile: null,
    status: 'INACTIVE' as Status,
  },
  {
    id: 'cand-007',
    name: 'Grace Kim',
    email: 'grace.kim@email.com',
    phone: '+1-555-0107',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'PyTorch'],
    positionIds: ['pos-006'],
    cvFile: null,
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-008',
    name: 'Henry Patel',
    email: 'henry.patel@email.com',
    phone: '+1-555-0108',
    skills: ['React Native', 'iOS', 'Android', 'TypeScript'],
    positionIds: ['pos-007'],
    cvFile: null,
    status: 'ACTIVE' as Status,
  },
  {
    id: 'cand-009',
    name: 'Isabella Martinez',
    email: 'isabella.martinez@email.com',
    phone: '+1-555-0109',
    skills: ['Project Management', 'Agile', 'Scrum', 'JIRA'],
    positionIds: ['pos-008'],
    cvFile: null,
    status: 'ACTIVE' as Status,
  },
];

interface PositionRow {
  id: string;
  title: string;
  department: string;
  description: string;
}

function readPositionsFromExcel(): PositionRow[] {
  const excelPath = path.join(DATA_DIR, 'positions.xlsx');

  if (!fs.existsSync(excelPath)) {
    console.warn(`Warning: ${excelPath} not found, using default positions`);
    return [
      { id: 'pos-001', title: 'Frontend Developer', department: 'Engineering', description: 'Build and maintain user interfaces using React and TypeScript.' },
      { id: 'pos-002', title: 'Backend Developer', department: 'Engineering', description: 'Develop APIs and services using Python and Django.' },
      { id: 'pos-003', title: 'DevOps Engineer', department: 'Infrastructure', description: 'Manage cloud infrastructure and CI/CD pipelines.' },
    ];
  }

  console.log(`Reading positions from: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<PositionRow>(worksheet);

  console.log(`  Found ${rows.length} positions in Excel file`);
  return rows;
}

function readJobDescriptions(): Map<string, string> {
  const jobDescDir = path.join(DATA_DIR, 'job-descriptions');
  const descriptions = new Map<string, string>();

  if (!fs.existsSync(jobDescDir)) {
    console.warn(`Warning: ${jobDescDir} not found`);
    return descriptions;
  }

  const files = fs.readdirSync(jobDescDir).filter(f => f.endsWith('.txt'));
  console.log(`Reading ${files.length} job description files...`);

  for (const file of files) {
    const content = fs.readFileSync(path.join(jobDescDir, file), 'utf-8');
    const baseName = file.replace('.txt', '');
    descriptions.set(baseName, content);
    console.log(`  - Loaded: ${file}`);
  }

  return descriptions;
}

function getCvFiles(): string[] {
  const cvsDir = path.join(DATA_DIR, 'cvs');

  if (!fs.existsSync(cvsDir)) {
    console.warn(`Warning: ${cvsDir} not found`);
    return [];
  }

  return fs.readdirSync(cvsDir);
}

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Hellio HR Database Seeding');
  console.log('='.repeat(50));
  console.log(`Data directory: ${DATA_DIR}\n`);

  // Read data from files
  const positions = readPositionsFromExcel();
  const jobDescriptions = readJobDescriptions();
  const cvFiles = getCvFiles();

  console.log(`\nFound ${cvFiles.length} CV files: ${cvFiles.join(', ')}\n`);

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
    console.log(`  - ${user.email} (${user.role})`);
  }

  // Seed positions from Excel (idempotent with upsert)
  console.log('\nCreating positions from Excel...');
  for (const position of positions) {
    await prisma.position.upsert({
      where: { id: position.id },
      update: {
        title: position.title,
        department: position.department,
        description: position.description,
      },
      create: {
        id: position.id,
        title: position.title,
        department: position.department,
        description: position.description,
      },
    });
    console.log(`  - ${position.id}: ${position.title} (${position.department})`);
  }

  // Seed candidates (idempotent with upsert)
  console.log('\nCreating candidates...');
  for (const candidate of candidates) {
    const cvUrl = candidate.cvFile ? `/api/documents/cv/${candidate.cvFile}` : null;

    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        cvUrl: cvUrl,
        status: candidate.status,
      },
      create: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        skills: candidate.skills,
        cvUrl: cvUrl,
        status: candidate.status,
      },
    });
    console.log(`  - ${candidate.id}: ${candidate.name}${cvUrl ? ' (has CV)' : ''}`);
  }

  // Seed candidate-position relationships (idempotent)
  console.log('\nCreating candidate-position relationships...');
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

  // Seed document references for CVs
  console.log('\nCreating document records for CVs...');
  for (const candidate of candidates) {
    if (candidate.cvFile && cvFiles.includes(candidate.cvFile)) {
      await prisma.document.upsert({
        where: { id: `doc-cv-${candidate.id}` },
        update: {
          fileName: candidate.cvFile,
          filePath: path.join('cvs', candidate.cvFile),
        },
        create: {
          id: `doc-cv-${candidate.id}`,
          type: DocumentType.CV,
          fileName: candidate.cvFile,
          filePath: path.join('cvs', candidate.cvFile),
          candidateId: candidate.id,
        },
      });
      console.log(`  - ${candidate.cvFile} -> ${candidate.name}`);
    }
  }

  // Seed document references for job descriptions
  console.log('\nCreating document records for job descriptions...');
  for (const [name, _content] of jobDescriptions) {
    const fileName = `${name}.txt`;
    await prisma.document.upsert({
      where: { id: `doc-jd-${name}` },
      update: {
        fileName: fileName,
        filePath: path.join('job-descriptions', fileName),
      },
      create: {
        id: `doc-jd-${name}`,
        type: DocumentType.JOB_DESCRIPTION,
        fileName: fileName,
        filePath: path.join('job-descriptions', fileName),
      },
    });
    console.log(`  - ${fileName}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Seeding completed successfully!');
  console.log('='.repeat(50));
  console.log('\nDemo accounts:');
  console.log('  - viewer@hellio.hr / viewer123 (read-only)');
  console.log('  - editor@hellio.hr / editor123 (can edit positions)');
  console.log('\nData sources:');
  console.log(`  - Positions: data/positions.xlsx (${positions.length} records)`);
  console.log(`  - CVs: data/cvs/ (${cvFiles.length} files)`);
  console.log(`  - Job Descriptions: data/job-descriptions/ (${jobDescriptions.size} files)`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
