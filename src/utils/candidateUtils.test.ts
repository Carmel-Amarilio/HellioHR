import { describe, it, expect } from 'vitest';
import { filterCandidatesBySearch, sortCandidatesByName } from './candidateUtils';
import type { Candidate } from '../types';

describe('filterCandidatesBySearch', () => {
  const mockCandidates: Candidate[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '123-456-7890',
      skills: ['JavaScript', 'React', 'TypeScript'],
      positionIds: ['pos-1'],
      cvUrl: 'https://example.com/cv1.pdf',
      status: 'active',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '098-765-4321',
      skills: ['Python', 'Django', 'PostgreSQL'],
      positionIds: ['pos-2'],
      cvUrl: 'https://example.com/cv2.pdf',
      status: 'active',
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob.wilson@test.org',
      phone: '555-555-5555',
      skills: ['Java', 'Spring Boot'],
      positionIds: [],
      cvUrl: 'https://example.com/cv3.pdf',
      status: 'inactive',
    },
  ];

  it('should return all candidates when search term is empty', () => {
    const result = filterCandidatesBySearch(mockCandidates, '');
    expect(result).toEqual(mockCandidates);
  });

  it('should return all candidates when search term is only whitespace', () => {
    const result = filterCandidatesBySearch(mockCandidates, '   ');
    expect(result).toEqual(mockCandidates);
  });

  it('should filter by name (case insensitive)', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'john');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by name with uppercase search term', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'JANE');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should filter by partial name match', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'Wil');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('should filter by email (case insensitive)', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'test.org');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('should filter by email with uppercase search term', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'JANE.SMITH');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should filter by skill (case insensitive)', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'javascript');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by partial skill match', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'type');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by skill with uppercase search term', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'PYTHON');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should return multiple matches when search term appears in multiple candidates', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'example.com');
    expect(result).toHaveLength(2);
    expect(result.map(c => c.id)).toContain('1');
    expect(result.map(c => c.id)).toContain('2');
  });

  it('should return empty array when no matches found', () => {
    const result = filterCandidatesBySearch(mockCandidates, 'nonexistent');
    expect(result).toEqual([]);
  });

  it('should handle search with leading and trailing whitespace', () => {
    const result = filterCandidatesBySearch(mockCandidates, '  john  ');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  // Edge case: Candidate with null/undefined name
  it('should handle candidate with null name gracefully', () => {
    const candidatesWithNullName: Candidate[] = [
      {
        id: '4',
        name: null as any,
        email: 'null.name@example.com',
        phone: '111-111-1111',
        skills: ['HTML'],
        positionIds: [],
        cvUrl: 'https://example.com/cv4.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullName, 'john');
    expect(result).toEqual([]);
  });

  it('should match by email when name is null', () => {
    const candidatesWithNullName: Candidate[] = [
      {
        id: '4',
        name: null as any,
        email: 'null.name@example.com',
        phone: '111-111-1111',
        skills: ['HTML'],
        positionIds: [],
        cvUrl: 'https://example.com/cv4.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullName, 'null.name');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  // Edge case: Candidate with null/undefined email
  it('should handle candidate with null email gracefully', () => {
    const candidatesWithNullEmail: Candidate[] = [
      {
        id: '5',
        name: 'Alice Brown',
        email: null as any,
        phone: '222-222-2222',
        skills: ['CSS'],
        positionIds: [],
        cvUrl: 'https://example.com/cv5.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullEmail, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('5');
  });

  // Edge case: Candidate with null/undefined skills
  it('should handle candidate with null skills gracefully', () => {
    const candidatesWithNullSkills: Candidate[] = [
      {
        id: '6',
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        phone: '333-333-3333',
        skills: null as any,
        positionIds: [],
        cvUrl: 'https://example.com/cv6.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullSkills, 'charlie');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('6');
  });

  it('should not crash when searching for skill in candidate with null skills', () => {
    const candidatesWithNullSkills: Candidate[] = [
      {
        id: '6',
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        phone: '333-333-3333',
        skills: null as any,
        positionIds: [],
        cvUrl: 'https://example.com/cv6.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullSkills, 'javascript');
    expect(result).toEqual([]);
  });

  // Edge case: Empty skills array
  it('should handle candidate with empty skills array', () => {
    const candidatesWithEmptySkills: Candidate[] = [
      {
        id: '7',
        name: 'Diana Evans',
        email: 'diana@example.com',
        phone: '444-444-4444',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv7.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithEmptySkills, 'diana');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('7');
  });

  // Edge case: Skills array with null values
  it('should handle skills array containing null values', () => {
    const candidatesWithNullInSkills: Candidate[] = [
      {
        id: '8',
        name: 'Eve Foster',
        email: 'eve@example.com',
        phone: '555-555-5555',
        skills: ['React', null as any, 'Node.js'],
        positionIds: [],
        cvUrl: 'https://example.com/cv8.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithNullInSkills, 'react');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('8');
  });

  // Edge case: Special characters in search
  it('should handle special characters in search term', () => {
    const candidatesWithSpecialChars: Candidate[] = [
      {
        id: '9',
        name: "O'Brien",
        email: 'obrien@example.com',
        phone: '666-666-6666',
        skills: ['C++', 'C#'],
        positionIds: [],
        cvUrl: 'https://example.com/cv9.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithSpecialChars, "o'brien");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('9');
  });

  it('should handle special characters in skill search', () => {
    const candidatesWithSpecialChars: Candidate[] = [
      {
        id: '9',
        name: "O'Brien",
        email: 'obrien@example.com',
        phone: '666-666-6666',
        skills: ['C++', 'C#'],
        positionIds: [],
        cvUrl: 'https://example.com/cv9.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesWithSpecialChars, 'c++');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('9');
  });

  // Edge case: Empty candidates array
  it('should return empty array when candidates array is empty', () => {
    const result = filterCandidatesBySearch([], 'test');
    expect(result).toEqual([]);
  });

  // Edge case: All fields null
  it('should handle candidate with all searchable fields null', () => {
    const candidatesAllNull: Candidate[] = [
      {
        id: '10',
        name: null as any,
        email: null as any,
        phone: '777-777-7777',
        skills: null as any,
        positionIds: [],
        cvUrl: 'https://example.com/cv10.pdf',
        status: 'active',
      },
    ];

    const result = filterCandidatesBySearch(candidatesAllNull, 'test');
    expect(result).toEqual([]);
  });
});

describe('sortCandidatesByName', () => {
  it('should sort candidates alphabetically by name', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'Charlie',
        email: 'charlie@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
      {
        id: '2',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '222-222-2222',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv2.pdf',
        status: 'active',
      },
      {
        id: '3',
        name: 'Bob',
        email: 'bob@example.com',
        phone: '333-333-3333',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv3.pdf',
        status: 'active',
      },
    ];

    const result = sortCandidatesByName(candidates);
    expect(result.map(c => c.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('should not mutate the original array', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'Charlie',
        email: 'charlie@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
      {
        id: '2',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '222-222-2222',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv2.pdf',
        status: 'active',
      },
    ];

    const original = [...candidates];
    sortCandidatesByName(candidates);
    expect(candidates).toEqual(original);
  });

  it('should handle empty array', () => {
    const result = sortCandidatesByName([]);
    expect(result).toEqual([]);
  });

  it('should handle single candidate', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
    ];

    const result = sortCandidatesByName(candidates);
    expect(result).toEqual(candidates);
  });

  it('should handle candidates with null names', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'Charlie',
        email: 'charlie@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
      {
        id: '2',
        name: null as any,
        email: 'null@example.com',
        phone: '222-222-2222',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv2.pdf',
        status: 'active',
      },
      {
        id: '3',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '333-333-3333',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv3.pdf',
        status: 'active',
      },
    ];

    const result = sortCandidatesByName(candidates);
    // Null should be treated as empty string and come first
    expect(result[0].id).toBe('2');
    expect(result[1].name).toBe('Alice');
    expect(result[2].name).toBe('Charlie');
  });

  it('should handle candidates with case-insensitive sorting', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'charlie',
        email: 'charlie@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
      {
        id: '2',
        name: 'Alice',
        email: 'alice@example.com',
        phone: '222-222-2222',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv2.pdf',
        status: 'active',
      },
      {
        id: '3',
        name: 'BOB',
        email: 'bob@example.com',
        phone: '333-333-3333',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv3.pdf',
        status: 'active',
      },
    ];

    const result = sortCandidatesByName(candidates);
    expect(result.map(c => c.name)).toEqual(['Alice', 'BOB', 'charlie']);
  });

  it('should handle candidates with identical names', () => {
    const candidates: Candidate[] = [
      {
        id: '1',
        name: 'Alice',
        email: 'alice1@example.com',
        phone: '111-111-1111',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv1.pdf',
        status: 'active',
      },
      {
        id: '2',
        name: 'Alice',
        email: 'alice2@example.com',
        phone: '222-222-2222',
        skills: [],
        positionIds: [],
        cvUrl: 'https://example.com/cv2.pdf',
        status: 'active',
      },
    ];

    const result = sortCandidatesByName(candidates);
    // Both should be present, order between identical names is not guaranteed
    expect(result).toHaveLength(2);
    expect(result.every(c => c.name === 'Alice')).toBe(true);
  });
});
