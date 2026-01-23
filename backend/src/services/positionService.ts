import { prisma } from '../config/database.js';
import { Position } from '../types/index.js';

export class PositionService {
  async getAll(): Promise<Position[]> {
    const positions = await prisma.position.findMany({
      include: {
        candidates: {
          select: {
            candidateId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return positions.map((position) => this.toContract(position));
  }

  async getById(id: string): Promise<Position | null> {
    const position = await prisma.position.findUnique({
      where: { id },
      include: {
        candidates: {
          select: {
            candidateId: true,
          },
        },
      },
    });

    if (!position) {
      return null;
    }

    return this.toContract(position);
  }

  async update(id: string, data: Partial<Pick<Position, 'title' | 'department' | 'description'>>): Promise<Position | null> {
    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.position.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.department && { department: data.department }),
        ...(data.description && { description: data.description }),
      },
      include: {
        candidates: {
          select: {
            candidateId: true,
          },
        },
      },
    });

    return this.toContract(updated);
  }

  private toContract(position: {
    id: string;
    title: string;
    department: string;
    description: string;
    candidates: { candidateId: string }[];
  }): Position {
    return {
      id: position.id,
      title: position.title,
      department: position.department,
      description: position.description,
      candidateIds: position.candidates.map((c) => c.candidateId),
    };
  }
}

export const positionService = new PositionService();
