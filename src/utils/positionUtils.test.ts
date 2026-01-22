import { describe, it, expect } from 'vitest';
import { getLinkedPositions, getLinkedCandidates } from './positionUtils';
import type { Candidate, Position } from '../types';

describe('getLinkedPositions', () => {
  const mockPositions: Position[] = [
    {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-2'],
    },
    {
      id: 'pos-2',
      title: 'Backend Developer',
      department: 'Engineering',
      description: 'Build scalable APIs',
      candidateIds: ['cand-3'],
    },
    {
      id: 'pos-3',
      title: 'DevOps Engineer',
      department: 'Engineering',
      description: 'Manage infrastructure',
      candidateIds: [],
    },
  ];

  it('should return positions linked to candidate', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-1', 'pos-2'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toContain('pos-1');
    expect(result.map(p => p.id)).toContain('pos-2');
  });

  it('should return empty array when candidate has no linked positions', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: [],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toEqual([]);
  });

  it('should return empty array when positions array is empty', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-1', 'pos-2'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, []);
    expect(result).toEqual([]);
  });

  it('should handle candidate with null positionIds gracefully', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: null as any,
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toEqual([]);
  });

  it('should handle candidate with undefined positionIds gracefully', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: undefined as any,
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toEqual([]);
  });

  it('should return only positions that exist in allPositions array', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-1', 'pos-999', 'pos-888'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pos-1');
  });

  it('should return single position when candidate has one linked position', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-2'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pos-2');
  });

  it('should handle duplicate position IDs in candidate.positionIds', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-1', 'pos-1', 'pos-2'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    // Should still return unique positions (filter doesn't deduplicate)
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toContain('pos-1');
    expect(result.map(p => p.id)).toContain('pos-2');
  });

  it('should preserve order of positions as they appear in allPositions', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript'],
      positionIds: ['pos-3', 'pos-1', 'pos-2'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    };

    const result = getLinkedPositions(candidate, mockPositions);
    expect(result.map(p => p.id)).toEqual(['pos-1', 'pos-2', 'pos-3']);
  });
});

describe('getLinkedCandidates', () => {
  const mockCandidates: Candidate[] = [
    {
      id: 'cand-1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript', 'React'],
      positionIds: ['pos-1'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    },
    {
      id: 'cand-2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '098-765-4321',
      skills: ['Python', 'Django'],
      positionIds: ['pos-1', 'pos-2'],
      cvUrl: 'https://example.com/cv2.pdf',
      status: 'active',
    },
    {
      id: 'cand-3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      phone: '555-555-5555',
      skills: ['Java', 'Spring'],
      positionIds: ['pos-2'],
      cvUrl: 'https://example.com/cv3.pdf',
      status: 'inactive',
    },
  ];

  it('should return candidates linked to position', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-2'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toContain('cand-1');
    expect(result.map(c => c.id)).toContain('cand-2');
  });

  it('should return empty array when position has no linked candidates', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: [],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toEqual([]);
  });

  it('should return empty array when candidates array is empty', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-2'],
    };

    const result = getLinkedCandidates(position, []);
    expect(result).toEqual([]);
  });

  it('should handle position with null candidateIds gracefully', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: null as any,
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toEqual([]);
  });

  it('should handle position with undefined candidateIds gracefully', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: undefined as any,
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toEqual([]);
  });

  it('should return only candidates that exist in allCandidates array', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-999', 'cand-888'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cand-1');
  });

  it('should return single candidate when position has one linked candidate', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-2'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cand-2');
  });

  it('should handle duplicate candidate IDs in position.candidateIds', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-1', 'cand-2'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    // Should still return unique candidates (filter doesn't deduplicate)
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toContain('cand-1');
    expect(result.map(c => c.id)).toContain('cand-2');
  });

  it('should preserve order of candidates as they appear in allCandidates', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-3', 'cand-1', 'cand-2'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result.map(c => c.id)).toEqual(['cand-1', 'cand-2', 'cand-3']);
  });

  it('should include both active and inactive candidates', () => {
    const position: Position = {
      id: 'pos-1',
      title: 'Frontend Developer',
      department: 'Engineering',
      description: 'Build amazing UIs',
      candidateIds: ['cand-1', 'cand-3'],
    };

    const result = getLinkedCandidates(position, mockCandidates);
    expect(result).toHaveLength(2);
    expect(result.find(c => c.id === 'cand-1')?.status).toBe('active');
    expect(result.find(c => c.id === 'cand-3')?.status).toBe('inactive');
  });
});
