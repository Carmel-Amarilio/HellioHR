export interface ExperienceEntry {
  company?: string;
  role?: string;
  duration?: string;
  achievements?: string[];
}

export interface EducationEntry {
  degree?: string;
  institution?: string;
  year?: string;
}

export interface HeuristicResult {
  confidence: 'high' | 'medium' | 'low';
  fields: {
    name?: { value: string; confidence: number };
    email?: { value: string; confidence: number };
    phone?: { value: string; confidence: number };
    skills?: { value: string[]; confidence: number };
    experience?: { value: ExperienceEntry[]; confidence: number };
    education?: { value: EducationEntry[]; confidence: number };
  };
}

export class HeuristicExtractor {
  /**
   * Extract email address from text
   */
  extractEmail(text: string): string | null {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailPattern);
    return match ? match[0] : null;
  }

  /**
   * Extract phone number from text
   */
  extractPhone(text: string): string | null {
    // Matches various formats: +1-555-0101, (555) 555-5555, 555.555.5555, etc.
    const phonePatterns = [
      /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,  // (555) 123-4567
      /\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{4}/,  // +1-555-0101
      /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,  // 555-123-4567 or 555.123.4567
    ];

    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  /**
   * Extract skills from text using a known skills list
   */
  extractSkills(text: string, knownSkills: string[] = []): string[] {
    const detectedSkills: Set<string> = new Set();

    // Default technology keywords to look for
    const defaultSkills = [
      // Languages
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Ruby', 'PHP',
      'Swift', 'Kotlin', 'Rust', 'Scala', 'HTML5', 'CSS3', 'SQL',
      // Frameworks & Libraries
      'React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express', 'Django',
      'Flask', 'Spring', 'ASP.NET', 'Laravel', 'Rails',
      // Tools & Platforms
      'Git', 'Docker', 'Kubernetes', 'Jenkins', 'AWS', 'Azure', 'GCP',
      'Linux', 'Webpack', 'Vite', 'Jest', 'Cypress', 'Selenium',
      // Databases
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
      // Methodologies
      'Agile', 'Scrum', 'CI/CD', 'TDD', 'DevOps',
      // APIs
      'REST', 'GraphQL', 'gRPC',
    ];

    const allSkills = [...defaultSkills, ...knownSkills];

    // Case-insensitive search for each skill
    for (const skill of allSkills) {
      const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (pattern.test(text)) {
        detectedSkills.add(skill);
      }
    }

    return Array.from(detectedSkills);
  }

  /**
   * Extract experience entries from text
   */
  extractExperience(text: string): ExperienceEntry[] {
    const entries: ExperienceEntry[] = [];

    // Pattern to match: Job Title | Company | Duration
    // Example: "Senior Frontend Developer | TechCorp Inc. | 2021 - Present"
    const experiencePattern = /^(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gm;

    let match;
    while ((match = experiencePattern.exec(text)) !== null) {
      const role = match[1]?.trim();
      const company = match[2]?.trim();
      const duration = match[3]?.trim();

      // Extract achievements (lines starting with - or • after the job line)
      const achievements: string[] = [];
      const jobPosition = match.index + match[0].length;
      const remainingText = text.slice(jobPosition);
      const lines = remainingText.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^[-•]\s*(.+)/)) {
          achievements.push(trimmedLine.replace(/^[-•]\s*/, ''));
        } else if (trimmedLine.length > 0 && !trimmedLine.match(/^[A-Z\s]+$/)) {
          // Stop if we hit a non-bullet line that's not a header
          continue;
        } else if (trimmedLine.match(/^[A-Z\s]+$/) && trimmedLine.length < 50) {
          // Stop if we hit another section header
          break;
        }
      }

      entries.push({
        role,
        company,
        duration,
        achievements: achievements.length > 0 ? achievements : undefined,
      });
    }

    return entries;
  }

  /**
   * Extract education entries from text
   */
  extractEducation(text: string): EducationEntry[] {
    const entries: EducationEntry[] = [];

    // Pattern to match: Degree | Institution | Year
    // Example: "B.S. Computer Science | State University | 2019"
    const educationPattern = /^(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{4})/gm;

    let match;
    while ((match = educationPattern.exec(text)) !== null) {
      entries.push({
        degree: match[1]?.trim(),
        institution: match[2]?.trim(),
        year: match[3]?.trim(),
      });
    }

    return entries;
  }

  /**
   * Extract candidate information from CV text
   */
  extractCandidateInfo(text: string): HeuristicResult {
    const fields: HeuristicResult['fields'] = {};

    // Extract name (first non-empty line, usually the candidate's name)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Name is likely the first line if it's short and doesn't contain @, http, etc.
      if (firstLine.length < 50 && !firstLine.includes('@') && !firstLine.includes('http')) {
        fields.name = { value: firstLine, confidence: 0.7 };
      }
    }

    // Extract email
    const email = this.extractEmail(text);
    if (email) {
      fields.email = { value: email, confidence: 0.95 };
    }

    // Extract phone
    const phone = this.extractPhone(text);
    if (phone) {
      fields.phone = { value: phone, confidence: 0.8 };
    }

    // Extract skills
    const skills = this.extractSkills(text);
    if (skills.length > 0) {
      fields.skills = { value: skills, confidence: 0.85 };
    }

    // Extract experience
    const experience = this.extractExperience(text);
    if (experience.length > 0) {
      fields.experience = { value: experience, confidence: 0.7 };
    }

    // Extract education
    const education = this.extractEducation(text);
    if (education.length > 0) {
      fields.education = { value: education, confidence: 0.8 };
    }

    // Calculate overall confidence
    const confidence = this.calculateConfidence(fields);

    return { confidence, fields };
  }

  /**
   * Calculate overall confidence based on extracted fields
   */
  calculateConfidence(fields: HeuristicResult['fields']): 'high' | 'medium' | 'low' {
    const fieldCount = Object.keys(fields).length;

    if (fieldCount === 0) {
      return 'low';
    }

    const avgConfidence = Object.values(fields)
      .map(f => f.confidence)
      .reduce((sum, conf) => sum + conf, 0) / fieldCount;

    if (fieldCount >= 4 && avgConfidence >= 0.75) {
      return 'high';
    } else if (fieldCount >= 3 && avgConfidence >= 0.65) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
