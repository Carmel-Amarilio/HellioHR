import { prisma } from '../config/database.js';
import { Candidate } from '../types/index.js';

export class CandidateService {
  async getAll(): Promise<Candidate[]> {
    const candidates = await prisma.candidate.findMany({
      include: {
        positions: {
          select: {
            positionId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return candidates.map((candidate) => this.toContract(candidate));
  }

  async getById(id: string): Promise<Candidate | null> {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        positions: {
          select: {
            positionId: true,
          },
        },
      },
    });

    if (!candidate) {
      return null;
    }

    return this.toContract(candidate);
  }

  async getByIds(ids: string[]): Promise<Candidate[]> {
    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        positions: {
          select: {
            positionId: true,
          },
        },
      },
    });

    return candidates.map((candidate) => this.toContract(candidate));
  }

  private toContract(candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    skills: unknown; // JSON type from Prisma
    cvUrl: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    positions: { positionId: string }[];
  }): Candidate {
    // Parse skills - stored as JSON array in database
    const skills = Array.isArray(candidate.skills)
      ? (candidate.skills as string[])
      : [];

    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      skills,
      positionIds: candidate.positions.map((p) => p.positionId),
      cvUrl: candidate.cvUrl ?? '',
      status: candidate.status.toLowerCase() as 'active' | 'inactive',
    };
  }
}

export const candidateService = new CandidateService();
