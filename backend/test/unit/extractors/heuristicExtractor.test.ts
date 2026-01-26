import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { HeuristicExtractor } from '../../../src/extractors/heuristicExtractor.js';

describe('HeuristicExtractor', () => {
  const extractor = new HeuristicExtractor();

  describe('extractEmail', () => {
    it('should extract valid email addresses', () => {
      const text = 'Contact me at alice.johnson@email.com for more info';
      const email = extractor.extractEmail(text);

      expect(email).toBe('alice.johnson@email.com');
    });

    it('should return null if no email found', () => {
      const text = 'No email address here';
      const email = extractor.extractEmail(text);

      expect(email).toBeNull();
    });

    it('should extract email from CV format', () => {
      const text = 'Email: bob.smith@example.org | Phone: 555-1234';
      const email = extractor.extractEmail(text);

      expect(email).toBe('bob.smith@example.org');
    });
  });

  describe('extractPhone', () => {
    it('should extract phone with +1 prefix', () => {
      const text = 'Phone: +1-555-0101';
      const phone = extractor.extractPhone(text);

      expect(phone).toBe('+1-555-0101');
    });

    it('should extract phone with dots', () => {
      const text = 'Call 555.123.4567';
      const phone = extractor.extractPhone(text);

      expect(phone).toBe('555.123.4567');
    });

    it('should extract phone with parentheses', () => {
      const text = 'Contact: (555) 123-4567';
      const phone = extractor.extractPhone(text);

      expect(phone).toBe('(555) 123-4567');
    });

    it('should return null if no phone found', () => {
      const text = 'No phone number here';
      const phone = extractor.extractPhone(text);

      expect(phone).toBeNull();
    });
  });

  describe('extractSkills', () => {
    it('should extract common technology skills', () => {
      const text = 'Skills: JavaScript, TypeScript, React, Node.js, Docker, Git';
      const skills = extractor.extractSkills(text);

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('React');
      expect(skills).toContain('Node.js');
      expect(skills).toContain('Docker');
      expect(skills).toContain('Git');
    });

    it('should be case-insensitive', () => {
      const text = 'I know javascript, TYPESCRIPT, and react';
      const skills = extractor.extractSkills(text);

      expect(skills).toContain('JavaScript');
      expect(skills).toContain('TypeScript');
      expect(skills).toContain('React');
    });

    it('should accept custom skills list', () => {
      const text = 'Proficient in CustomTool and SpecialFramework';
      const skills = extractor.extractSkills(text, ['CustomTool', 'SpecialFramework']);

      expect(skills).toContain('CustomTool');
      expect(skills).toContain('SpecialFramework');
    });

    it('should return empty array if no skills found', () => {
      const text = 'Just some random text without any skills';
      const skills = extractor.extractSkills(text);

      expect(skills).toEqual([]);
    });
  });

  describe('extractExperience', () => {
    it('should extract experience with company and duration', () => {
      const text = `
Senior Frontend Developer | TechCorp Inc. | 2021 - Present
- Led development of customer-facing dashboard
- Implemented design system
      `;

      const experience = extractor.extractExperience(text);

      expect(experience).toHaveLength(1);
      expect(experience[0].role).toBe('Senior Frontend Developer');
      expect(experience[0].company).toBe('TechCorp Inc.');
      expect(experience[0].duration).toBe('2021 - Present');
      expect(experience[0].achievements).toBeDefined();
      expect(experience[0].achievements?.length).toBeGreaterThan(0);
    });

    it('should extract multiple experience entries', () => {
      const text = `
Senior Developer | Company A | 2020 - Present
- Achievement 1

Junior Developer | Company B | 2018 - 2020
- Achievement 2
      `;

      const experience = extractor.extractExperience(text);

      expect(experience).toHaveLength(2);
      expect(experience[0].company).toBe('Company A');
      expect(experience[1].company).toBe('Company B');
    });

    it('should return empty array if no experience found', () => {
      const text = 'No experience entries here';
      const experience = extractor.extractExperience(text);

      expect(experience).toEqual([]);
    });
  });

  describe('extractEducation', () => {
    it('should extract education entry', () => {
      const text = 'B.S. Computer Science | State University | 2019';

      const education = extractor.extractEducation(text);

      expect(education).toHaveLength(1);
      expect(education[0].degree).toBe('B.S. Computer Science');
      expect(education[0].institution).toBe('State University');
      expect(education[0].year).toBe('2019');
    });

    it('should extract multiple education entries', () => {
      const text = `
M.S. Software Engineering | Tech University | 2021
B.S. Computer Science | State College | 2019
      `;

      const education = extractor.extractEducation(text);

      expect(education).toHaveLength(2);
      expect(education[0].degree).toBe('M.S. Software Engineering');
      expect(education[1].degree).toBe('B.S. Computer Science');
    });

    it('should return empty array if no education found', () => {
      const text = 'No education entries here';
      const education = extractor.extractEducation(text);

      expect(education).toEqual([]);
    });
  });

  describe('extractCandidateInfo', () => {
    it('should extract multiple fields from CV text', () => {
      const text = `
ALICE JOHNSON
Frontend Developer
Email: alice.johnson@email.com | Phone: +1-555-0101

SKILLS
JavaScript, TypeScript, React, Node.js

EXPERIENCE
Senior Developer | TechCorp | 2021 - Present
- Led team

EDUCATION
B.S. Computer Science | University | 2019
      `;

      const result = extractor.extractCandidateInfo(text);

      expect(result.fields.name?.value).toBe('ALICE JOHNSON');
      expect(result.fields.email?.value).toBe('alice.johnson@email.com');
      expect(result.fields.phone?.value).toBe('+1-555-0101');
      expect(result.fields.skills?.value).toContain('JavaScript');
      expect(result.fields.experience?.value).toHaveLength(1);
      // Education might extract from multiple places, so just check it exists
      expect(result.fields.education?.value).toBeDefined();
      expect(result.fields.education?.value.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate high confidence with many fields', () => {
      const text = `
JOHN DOE
Email: john@example.com | Phone: 555-1234
Skills: React, TypeScript
Senior Developer | Company | 2020 - Present
B.S. Computer Science | University | 2019
      `;

      const result = extractor.extractCandidateInfo(text);

      expect(result.confidence).toBe('high');
    });

    it('should calculate medium confidence with fewer fields', () => {
      const text = `
JANE DOE
Email: jane@example.com
Skills: Python
      `;

      const result = extractor.extractCandidateInfo(text);

      expect(result.confidence).toBe('medium');
    });

    it('should calculate low confidence with minimal fields', () => {
      const text = 'Some random text';

      const result = extractor.extractCandidateInfo(text);

      expect(result.confidence).toBe('low');
    });
  });

  describe('integration with real CV files', () => {
    it('should extract information from alice-johnson.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');
      const content = await fs.readFile(filePath, 'utf-8');

      const result = extractor.extractCandidateInfo(content);

      expect(result.fields.name?.value).toBe('ALICE JOHNSON');
      expect(result.fields.email?.value).toBe('alice.johnson@email.com');
      expect(result.fields.phone?.value).toBe('+1-555-0101');
      expect(result.fields.skills?.value).toBeDefined();
      expect(result.fields.skills?.value.length).toBeGreaterThan(5);
      expect(result.fields.experience?.value).toBeDefined();
      expect(result.fields.experience?.value.length).toBeGreaterThan(0);
      expect(result.fields.education?.value).toBeDefined();
      expect(result.confidence).toBe('high');
    });

    it('should extract information from bob-smith.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'bob-smith.txt');
      const content = await fs.readFile(filePath, 'utf-8');

      const result = extractor.extractCandidateInfo(content);

      expect(result.fields.name?.value).toContain('BOB');
      expect(result.fields.email?.value).toContain('@');
      expect(result.fields.skills?.value).toBeDefined();
      expect(result.confidence).toMatch(/high|medium/);
    });

    it('should extract information from carol-davis.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'carol-davis.txt');
      const content = await fs.readFile(filePath, 'utf-8');

      const result = extractor.extractCandidateInfo(content);

      expect(result.fields.name?.value).toContain('CAROL');
      expect(result.fields.email?.value).toContain('@');
      expect(result.fields.skills?.value).toBeDefined();
      expect(result.confidence).toMatch(/high|medium/);
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for 4+ fields with high scores', () => {
      const fields = {
        name: { value: 'John', confidence: 0.9 },
        email: { value: 'john@example.com', confidence: 0.95 },
        phone: { value: '555-1234', confidence: 0.8 },
        skills: { value: ['React'], confidence: 0.85 },
      };

      const confidence = extractor.calculateConfidence(fields);

      expect(confidence).toBe('high');
    });

    it('should return medium confidence for 3 fields', () => {
      const fields = {
        email: { value: 'john@example.com', confidence: 0.95 },
        phone: { value: '555-1234', confidence: 0.8 },
        skills: { value: ['React'], confidence: 0.85 },
      };

      const confidence = extractor.calculateConfidence(fields);

      expect(confidence).toBe('medium');
    });

    it('should return low confidence for few fields', () => {
      const fields = {
        email: { value: 'john@example.com', confidence: 0.95 },
      };

      const confidence = extractor.calculateConfidence(fields);

      expect(confidence).toBe('low');
    });
  });
});
