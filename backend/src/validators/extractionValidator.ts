export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ExtractionValidator {
  /**
   * Validate candidate extraction data
   */
  validateCandidateExtraction(extraction: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate email if present
    if (extraction.email) {
      if (!this.isValidEmail(extraction.email)) {
        errors.push(`Invalid email format: ${extraction.email}`);
      }
    } else {
      warnings.push('Email not extracted');
    }

    // Validate phone if present
    if (extraction.phone) {
      if (!this.isValidPhone(extraction.phone)) {
        warnings.push(`Phone format may be invalid: ${extraction.phone}`);
      }
    } else {
      warnings.push('Phone not extracted');
    }

    // Validate skills
    if (!extraction.skills || extraction.skills.length === 0) {
      warnings.push('No skills extracted');
    }

    // Validate name
    if (!extraction.name || extraction.name.length < 2) {
      warnings.push('Name not extracted or too short');
    }

    // Validate experience
    if (extraction.experience) {
      if (Array.isArray(extraction.experience)) {
        extraction.experience.forEach((exp: any, index: number) => {
          if (!exp.company && !exp.role) {
            warnings.push(`Experience entry ${index + 1} missing company and role`);
          }
        });
      }
    } else {
      warnings.push('No experience extracted');
    }

    // Validate education
    if (extraction.education) {
      if (Array.isArray(extraction.education)) {
        extraction.education.forEach((edu: any, index: number) => {
          if (!edu.degree && !edu.institution) {
            warnings.push(`Education entry ${index + 1} missing degree and institution`);
          }
        });
      }
    } else {
      warnings.push('No education extracted');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate position extraction data
   */
  validatePositionExtraction(extraction: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate summary
    if (!extraction.summary || extraction.summary.length < 10) {
      warnings.push('Summary not extracted or too short');
    }

    // Validate requirements
    if (!extraction.requirements || extraction.requirements.length === 0) {
      warnings.push('No requirements extracted');
    }

    // Validate responsibilities
    if (!extraction.responsibilities || extraction.responsibilities.length === 0) {
      warnings.push('No responsibilities extracted');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailPattern.test(email);
  }

  /**
   * Validate phone format (basic check)
   */
  private isValidPhone(phone: string): boolean {
    // Remove common formatting characters
    const cleaned = phone.replace(/[-.\s()]/g, '');
    // Check if it contains mostly digits and is reasonable length
    return /^\+?\d{7,15}$/.test(cleaned);
  }
}
