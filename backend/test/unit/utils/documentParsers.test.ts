import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { DocumentParser } from '../../../src/utils/documentParsers.js';
import { SectionDetector } from '../../../src/utils/sectionDetector.js';

describe('DocumentParser', () => {
  const parser = new DocumentParser();

  describe('parseTXT', () => {
    it('should parse a plain text file', async () => {
      const testText = 'Hello World\nThis is a test document.';
      const buffer = Buffer.from(testText, 'utf-8');

      const result = await parser.parseTXT(buffer);

      expect(result.text).toBe(testText);
      expect(result.metadata.parseMethod).toBe('txt');
      expect(result.metadata.wordCount).toBe(7);
    });

    it('should handle empty text files', async () => {
      const buffer = Buffer.from('', 'utf-8');
      const result = await parser.parseTXT(buffer);

      expect(result.text).toBe('');
      expect(result.metadata.wordCount).toBe(0);
    });
  });

  describe('parse with real CV files', () => {
    it('should parse alice-johnson.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');
      const buffer = await fs.readFile(filePath);

      const result = await parser.parse(buffer, 'alice-johnson.txt');

      expect(result.text).toContain('ALICE JOHNSON');
      expect(result.text).toContain('Frontend Developer');
      expect(result.text).toContain('alice.johnson@email.com');
      expect(result.metadata.parseMethod).toBe('txt');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should parse bob-smith.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'bob-smith.txt');
      const buffer = await fs.readFile(filePath);

      const result = await parser.parse(buffer, 'bob-smith.txt');

      expect(result.text).toContain('BOB SMITH');
      expect(result.metadata.parseMethod).toBe('txt');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('should parse carol-davis.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'carol-davis.txt');
      const buffer = await fs.readFile(filePath);

      const result = await parser.parse(buffer, 'carol-davis.txt');

      expect(result.text).toContain('CAROL DAVIS');
      expect(result.metadata.parseMethod).toBe('txt');
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });
  });

  describe('parse method detection', () => {
    it('should detect PDF files', async () => {
      const buffer = Buffer.from('mock pdf content');
      await expect(parser.parse(buffer, 'document.pdf')).rejects.toThrow();
    });

    it('should detect DOCX files', async () => {
      const buffer = Buffer.from('mock docx content');
      await expect(parser.parse(buffer, 'document.docx')).rejects.toThrow();
    });

    it('should throw error for unsupported file types', async () => {
      const buffer = Buffer.from('test');
      await expect(parser.parse(buffer, 'document.xyz')).rejects.toThrow('Unsupported file type');
    });
  });
});

describe('SectionDetector', () => {
  const detector = new SectionDetector();

  describe('detectCVSections', () => {
    it('should detect summary section', () => {
      const text = `
SUMMARY
Passionate frontend developer with 5+ years of experience.

SKILLS
React, TypeScript
      `;

      const sections = detector.detectCVSections(text);

      expect(sections.summary).toContain('Passionate frontend developer');
      expect(sections.summary).not.toContain('SUMMARY');
    });

    it('should detect skills section and parse as array', () => {
      const text = `
SKILLS
- JavaScript, TypeScript, HTML5
- React, Vue.js
- Git, Docker
      `;

      const sections = detector.detectCVSections(text);

      expect(sections.skills).toBeDefined();
      expect(Array.isArray(sections.skills)).toBe(true);
      expect(sections.skills?.some(s => s.includes('JavaScript'))).toBe(true);
    });

    it('should detect experience section', () => {
      const text = `
EXPERIENCE

Senior Developer | Company | 2021 - Present
- Led team of 5 developers
- Built scalable applications

EDUCATION
      `;

      const sections = detector.detectCVSections(text);

      expect(sections.experience).toContain('Senior Developer');
      expect(sections.experience).toContain('Company');
    });

    it('should detect education section', () => {
      const text = `
EDUCATION
B.S. Computer Science | State University | 2019
      `;

      const sections = detector.detectCVSections(text);

      expect(sections.education).toContain('B.S. Computer Science');
      expect(sections.education).toContain('State University');
    });

    it('should handle missing sections gracefully', () => {
      const text = 'Just some random text without sections';

      const sections = detector.detectCVSections(text);

      expect(sections.summary).toBeUndefined();
      expect(sections.skills).toBeUndefined();
      expect(sections.experience).toBeUndefined();
      expect(sections.education).toBeUndefined();
    });
  });

  describe('detectJobDescriptionSections', () => {
    it('should detect job summary', () => {
      const text = `
JOB DESCRIPTION
We are looking for a talented developer.

RESPONSIBILITIES
      `;

      const sections = detector.detectJobDescriptionSections(text);

      expect(sections.summary).toContain('We are looking for');
    });

    it('should detect responsibilities', () => {
      const text = `
RESPONSIBILITIES
- Design and develop features
- Collaborate with team
- Write tests

REQUIREMENTS
      `;

      const sections = detector.detectJobDescriptionSections(text);

      expect(sections.responsibilities).toContain('Design and develop');
      expect(sections.responsibilities).toContain('Collaborate with team');
    });

    it('should detect requirements', () => {
      const text = `
REQUIREMENTS
- 5+ years experience
- Strong knowledge of React
- Bachelor's degree
      `;

      const sections = detector.detectJobDescriptionSections(text);

      expect(sections.requirements).toContain('5+ years experience');
      expect(sections.requirements).toContain('React');
    });
  });

  describe('integration with real CV file', () => {
    it('should detect all sections from alice-johnson.txt', async () => {
      const filePath = path.join(process.cwd(), '..', 'data', 'cvs', 'alice-johnson.txt');
      const content = await fs.readFile(filePath, 'utf-8');

      const sections = detector.detectCVSections(content);

      expect(sections.summary).toBeDefined();
      expect(sections.summary).toContain('Passionate frontend developer');

      expect(sections.skills).toBeDefined();
      expect(sections.skills?.length).toBeGreaterThan(0);

      expect(sections.experience).toBeDefined();
      expect(sections.experience).toContain('TechCorp Inc.');

      expect(sections.education).toBeDefined();
      expect(sections.education).toContain('B.S. Computer Science');
    });
  });
});
