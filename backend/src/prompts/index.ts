export interface PromptTemplate {
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputSchema: any;
}

export const PROMPTS = {
  CV_EXTRACTION: {
    version: 'cv-v1.2',
    systemPrompt: `You are an expert CV/resume parser. Your task is to extract structured information from curriculum vitae documents.
Return ONLY valid JSON with no additional text or explanation.
Extract all available information accurately and comprehensively.
IMPORTANT: Always extract name, email, and phone if present in the CV.`,
    userPromptTemplate: `Extract ALL of the following information from this CV:

1. name: Full name of the candidate (REQUIRED)
2. email: Email address (REQUIRED)
3. phone: Phone number (REQUIRED)
4. summary: A brief professional summary (2-3 sentences)
5. experience: Array of work experience entries with:
   - company: Company name
   - role: Job title
   - duration: Time period (e.g., "2020 - Present")
   - achievements: Array of key achievements/responsibilities
6. education: Array of education entries with:
   - degree: Degree or certification
   - institution: School/university name
   - year: Graduation year
7. skills: Array of technical skills, technologies, tools

CV Text:
{text}

Return ONLY the JSON object with ALL fields, no additional text:`,
    outputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        summary: { type: 'string' },
        experience: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              company: { type: 'string' },
              role: { type: 'string' },
              duration: { type: 'string' },
              achievements: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        education: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              degree: { type: 'string' },
              institution: { type: 'string' },
              year: { type: 'string' },
            },
          },
        },
        skills: { type: 'array', items: { type: 'string' } },
      },
      required: ['name', 'email', 'phone', 'summary', 'skills'],
    },
  },

  JOB_DESCRIPTION_EXTRACTION: {
    version: 'jd-v1.0',
    systemPrompt: `You are a job description analyzer. Your task is to extract structured information from job postings.
Return ONLY valid JSON with no additional text or explanation.
Extract all available information accurately and comprehensively.`,
    userPromptTemplate: `Extract the following information from this job description:

1. summary: A brief overview of the position (2-3 sentences)
2. responsibilities: Array of job responsibilities with:
   - responsibility: Description of the responsibility
   - category: Category (e.g., "development", "collaboration", "quality", "management")
3. requirements: Array of job requirements with:
   - type: Type of requirement ("experience", "education", "skill", "certification")
   - skill: The specific skill, technology, or qualification
   - yearsExp: Years of experience required (0 if not specified)

Job Description Text:
{text}

Return ONLY the JSON object, no additional text:`,
    outputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        responsibilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              responsibility: { type: 'string' },
              category: { type: 'string' },
            },
          },
        },
        requirements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              skill: { type: 'string' },
              yearsExp: { type: 'number' },
            },
          },
        },
      },
      required: ['summary'],
    },
  },
};

/**
 * Render a prompt template with variables
 */
export function renderPrompt(template: PromptTemplate, variables: Record<string, string>): string {
  let prompt = template.userPromptTemplate;

  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return prompt;
}
