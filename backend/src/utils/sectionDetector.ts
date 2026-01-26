export interface DetectedSections {
  summary?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  responsibilities?: string;
  requirements?: string;
}

export class SectionDetector {
  /**
   * Detect sections in a CV document
   */
  detectCVSections(text: string): DetectedSections {
    const sections: DetectedSections = {};

    // Split text into lines for processing
    const lines = text.split('\n');

    // Detect summary/objective (usually near the top)
    const summaryMatch = this.extractSection(text, [
      'SUMMARY',
      'OBJECTIVE',
      'PROFILE',
      'ABOUT',
      'PROFESSIONAL SUMMARY',
    ]);
    if (summaryMatch) {
      sections.summary = summaryMatch;
    }

    // Detect skills section
    const skillsMatch = this.extractSection(text, [
      'SKILLS',
      'TECHNICAL SKILLS',
      'CORE COMPETENCIES',
      'TECHNOLOGIES',
    ]);
    if (skillsMatch) {
      sections.skills = this.parseSkillsList(skillsMatch);
    }

    // Detect experience section
    const experienceMatch = this.extractSection(text, [
      'EXPERIENCE',
      'WORK EXPERIENCE',
      'EMPLOYMENT HISTORY',
      'PROFESSIONAL EXPERIENCE',
    ]);
    if (experienceMatch) {
      sections.experience = experienceMatch;
    }

    // Detect education section
    const educationMatch = this.extractSection(text, [
      'EDUCATION',
      'ACADEMIC BACKGROUND',
      'QUALIFICATIONS',
    ]);
    if (educationMatch) {
      sections.education = educationMatch;
    }

    return sections;
  }

  /**
   * Detect sections in a job description document
   */
  detectJobDescriptionSections(text: string): DetectedSections {
    const sections: DetectedSections = {};

    // Detect job summary/description
    const summaryMatch = this.extractSection(text, [
      'JOB DESCRIPTION',
      'ABOUT THE ROLE',
      'POSITION OVERVIEW',
      'SUMMARY',
      'OVERVIEW',
    ]);
    if (summaryMatch) {
      sections.summary = summaryMatch;
    }

    // Detect responsibilities
    const responsibilitiesMatch = this.extractSection(text, [
      'RESPONSIBILITIES',
      'DUTIES',
      'KEY RESPONSIBILITIES',
      'WHAT YOU WILL DO',
      'YOUR RESPONSIBILITIES',
    ]);
    if (responsibilitiesMatch) {
      sections.responsibilities = responsibilitiesMatch;
    }

    // Detect requirements
    const requirementsMatch = this.extractSection(text, [
      'REQUIREMENTS',
      'QUALIFICATIONS',
      'WHAT WE ARE LOOKING FOR',
      'DESIRED SKILLS',
      'REQUIRED SKILLS',
      'PREREQUISITES',
    ]);
    if (requirementsMatch) {
      sections.requirements = requirementsMatch;
    }

    return sections;
  }

  /**
   * Extract a section from text based on header keywords
   */
  private extractSection(text: string, headers: string[]): string | undefined {
    const lines = text.split('\n');
    let sectionStart = -1;
    let sectionEnd = -1;

    // Find section start - look for exact header match (line contains only the header)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      // Check if this line is primarily a header (short line that matches one of our headers)
      if (line.length > 0 && line.length < 50) {
        const matchedHeader = headers.find(header => line === header || line === header + ':');
        if (matchedHeader) {
          sectionStart = i;
          break;
        }
      }
    }

    if (sectionStart === -1) {
      return undefined;
    }

    // Find section end (next header or end of document)
    const commonHeaders = [
      'SUMMARY', 'OBJECTIVE', 'SKILLS', 'EXPERIENCE', 'EDUCATION',
      'RESPONSIBILITIES', 'REQUIREMENTS', 'QUALIFICATIONS', 'CERTIFICATIONS',
      'ACHIEVEMENTS', 'PROJECTS', 'REFERENCES', 'CONTACT', 'JOB DESCRIPTION',
      'ABOUT THE ROLE', 'POSITION OVERVIEW', 'OVERVIEW', 'DUTIES',
      'KEY RESPONSIBILITIES', 'WHAT YOU WILL DO', 'YOUR RESPONSIBILITIES',
      'WHAT WE ARE LOOKING FOR', 'DESIRED SKILLS', 'REQUIRED SKILLS',
      'PREREQUISITES', 'TECHNICAL SKILLS', 'CORE COMPETENCIES',
      'TECHNOLOGIES', 'WORK EXPERIENCE', 'EMPLOYMENT HISTORY',
      'PROFESSIONAL EXPERIENCE', 'ACADEMIC BACKGROUND',
    ];

    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      // Check if this line is a new section header (short line that matches a common header)
      if (line.length > 0 && line.length < 50) {
        const isNewHeader = commonHeaders.some(header =>
          line === header || line === header + ':'
        );
        if (isNewHeader) {
          sectionEnd = i;
          break;
        }
      }
    }

    if (sectionEnd === -1) {
      sectionEnd = lines.length;
    }

    // Extract section content (skip the header line)
    const sectionLines = lines.slice(sectionStart + 1, sectionEnd);
    const content = sectionLines.join('\n').trim();

    return content.length > 0 ? content : undefined;
  }

  /**
   * Parse a skills section into an array of skills
   */
  private parseSkillsList(skillsText: string): string[] {
    const skills: string[] = [];

    // Split by common delimiters
    const delimiters = /[,;•·\n]/;
    const parts = skillsText.split(delimiters);

    for (const part of parts) {
      const skill = part.trim();
      // Filter out empty strings and very long strings (likely not skills)
      if (skill.length > 0 && skill.length < 50) {
        skills.push(skill);
      }
    }

    return skills;
  }
}
