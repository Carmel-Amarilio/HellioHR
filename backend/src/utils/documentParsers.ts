import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    parseMethod: 'pdf' | 'docx' | 'txt';
  };
}

export class DocumentParser {
  /**
   * Parse a PDF file and extract text
   */
  async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);
      const wordCount = data.text.split(/\s+/).filter((word: string) => word.length > 0).length;

      return {
        text: data.text,
        metadata: {
          pageCount: data.numpages,
          wordCount,
          parseMethod: 'pdf',
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a DOCX file and extract text
   */
  async parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

      return {
        text,
        metadata: {
          wordCount,
          parseMethod: 'docx',
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a plain text file
   */
  async parseTXT(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const text = buffer.toString('utf-8');
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

      return {
        text,
        metadata: {
          wordCount,
          parseMethod: 'txt',
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a document based on its filename extension
   */
  async parse(buffer: Buffer, filename: string): Promise<ParsedDocument> {
    const extension = filename.toLowerCase().split('.').pop();

    switch (extension) {
      case 'pdf':
        return this.parsePDF(buffer);
      case 'docx':
      case 'doc':
        return this.parseDOCX(buffer);
      case 'txt':
        return this.parseTXT(buffer);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }
}
