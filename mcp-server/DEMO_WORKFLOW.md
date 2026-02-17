# End-to-End Demo Workflow

This document provides example conversations and workflows for demonstrating the HR Document Templates MCP server with Claude Desktop.

---

## Demo Scenario 1: Discover Templates

### Conversation Flow

**You:**
```
What HR document templates are available?
```

**Claude (using list_templates tool):**
```
I can see 4 HR document templates available:

1. **Hiring Introduction Email** (v1.0)
   - Initial outreach email to a candidate about a job opportunity

2. **Rejection Email** (v1.0)
   - Professional rejection email after interview process

3. **Job Description** (v1.0)
   - Formal job posting document with role details and requirements

4. **NDA/Interview Invitation** (v1.0)
   - Combined interview invitation and NDA signing request

Would you like to know more about any of these templates or generate a document?
```

**Expected Tool Call:**
```json
Tool: list_templates
Response: {
  "templates": [
    {"id": "hiring_intro_email", "name": "Hiring Introduction Email", ...},
    {"id": "rejection_email", "name": "Rejection Email", ...},
    {"id": "job_description", "name": "Job Description", ...},
    {"id": "nda_interview_invitation", "name": "NDA/Interview Invitation", ...}
  ]
}
```

---

## Demo Scenario 2: Explore Template Schema

### Conversation Flow

**You:**
```
Show me what fields are needed for the hiring introduction email template.
```

**Claude (using get_template_schema tool):**
```
The Hiring Introduction Email template requires the following fields:

**Required Fields:**
- candidate_name (string) - Name of the candidate
- position_title (string) - Job position title
- recruiter_name (string) - Name of the recruiter
- company_name (string) - Company name

**Optional Fields:**
- salary_range (string) - Compensation range
- start_date (string) - Proposed start date
- additional_benefits (string) - Extra benefits info
- recruiter_email (string) - Recruiter's email
- recruiter_phone (string) - Recruiter's phone

Would you like me to generate a hiring email with these fields?
```

**Expected Tool Call:**
```json
Tool: get_template_schema("hiring_intro_email")
Response: {
  "ok": true,
  "id": "hiring_intro_email",
  "name": "Hiring Introduction Email",
  "required_fields": [
    {"name": "candidate_name", "type": "string", "description": "Candidate Name"},
    ...
  ],
  "optional_fields": [...],
  "example_payload": {...}
}
```

---

## Demo Scenario 3: Generate Document (Success Case)

### Conversation Flow

**You:**
```
Generate a hiring introduction email for Sarah Chen for the Senior DevOps Engineer
position. The recruiter is John Williams from TechCorp.
```

**Claude (using fill_template tool):**
```
I've generated a professional hiring introduction email. Here it is:

---

Subject: Exciting Opportunity at TechCorp - Senior DevOps Engineer

Dear Sarah Chen,

I hope this email finds you well. My name is John Williams, and I'm reaching out
regarding an exciting opportunity at TechCorp.

We're currently looking for a talented Senior DevOps Engineer to join our team.
Based on your background and experience, I believe this role could be an excellent
fit for your skills and career goals.

[... rest of email ...]

---

The email is ready to copy and send. Would you like me to modify anything or
generate a different type of document?
```

**Expected Tool Call:**
```json
Tool: fill_template("hiring_intro_email", {
  "candidate_name": "Sarah Chen",
  "position_title": "Senior DevOps Engineer",
  "recruiter_name": "John Williams",
  "company_name": "TechCorp"
})
Response: {
  "ok": true,
  "template_id": "hiring_intro_email",
  "rendered_document": "Subject: Exciting Opportunity at TechCorp...",
  "used_fields": {...}
}
```

---

## Demo Scenario 4: Generate Document (Error Handling)

### Conversation Flow

**You:**
```
Generate a hiring email for Jane Smith.
```

**Claude (using fill_template tool, gets error):**
```
I need a bit more information to generate the hiring email. The template requires:

- Position title (e.g., "Software Engineer")
- Recruiter name (who's sending the email)
- Company name

Could you provide these details?
```

**Expected Tool Call:**
```json
Tool: fill_template("hiring_intro_email", {
  "candidate_name": "Jane Smith"
})
Response: {
  "ok": false,
  "error_code": "MISSING_FIELDS",
  "missing_fields": ["position_title", "recruiter_name", "company_name"],
  "message": "Missing required fields: position_title, recruiter_name, company_name"
}
```

**You (follow-up):**
```
Position: Software Engineer, Recruiter: Mike Johnson, Company: DevCorp
```

**Claude:**
```
Perfect! Here's the hiring introduction email:

Subject: Exciting Opportunity at DevCorp - Software Engineer

Dear Jane Smith,

I hope this email finds you well. My name is Mike Johnson, and I'm reaching out
regarding an exciting opportunity at DevCorp.

[... rest of email ...]
```

---

## Demo Scenario 5: Generate Job Description

### Conversation Flow

**You:**
```
Create a job description for a Senior DevOps Engineer position at CloudTech in the
Engineering department. The role summary is "Lead infrastructure automation and
cloud migration initiatives". Responsibilities include managing AWS infrastructure
and implementing CI/CD pipelines. Requirements are 5+ years DevOps experience and
AWS certification.
```

**Claude (using fill_template tool):**
```
I've created a comprehensive job description:

---

# Senior DevOps Engineer

**Company:** CloudTech
**Department:** Engineering
**Location:** [Not specified]

## About the Role

Lead infrastructure automation and cloud migration initiatives.

## Key Responsibilities

- Managing AWS infrastructure
- Implementing CI/CD pipelines

## Requirements

- 5+ years DevOps experience
- AWS certification

[... additional formatted sections ...]

---

The job description is ready to post. Would you like me to add optional sections
like salary range, benefits, or location details?
```

**Expected Tool Call:**
```json
Tool: fill_template("job_description", {
  "position_title": "Senior DevOps Engineer",
  "company_name": "CloudTech",
  "department": "Engineering",
  "role_summary": "Lead infrastructure automation and cloud migration initiatives",
  "responsibilities": "- Managing AWS infrastructure\n- Implementing CI/CD pipelines",
  "requirements": "- 5+ years DevOps experience\n- AWS certification"
})
```

---

## Demo Scenario 6: Generate Rejection Email

### Conversation Flow

**You:**
```
I need to send a professional rejection email to Robert Davis who interviewed for
the Backend Engineer position at our company DataFlow. I'm the recruiter, Lisa Park.
```

**Claude (using fill_template tool):**
```
I've prepared a professional and empathetic rejection email:

---

Subject: Update on Your Application for Backend Engineer at DataFlow

Dear Robert Davis,

Thank you for taking the time to interview for the Backend Engineer position at
DataFlow. We genuinely appreciate your interest in joining our team and the effort
you put into the interview process.

After careful consideration, we have decided to move forward with another candidate
whose experience more closely aligns with our current needs for this particular role.

[... rest of email with professional, empathetic tone ...]

Best regards,
Lisa Park
DataFlow

---

The email maintains a professional and respectful tone while being clear about the
decision. Would you like me to add specific feedback or mention future opportunities?
```

---

## Demo Scenario 7: Complete Workflow (All 3 Tools)

### Full Conversation

**You:**
```
I need to send a hiring email to a candidate. Can you help me?
```

**Claude:**
```
Absolutely! Let me first show you what templates are available.
```
*[Uses list_templates]*
```
I can help you create a Hiring Introduction Email. Let me get the required fields...
```
*[Uses get_template_schema]*
```
To generate the hiring email, I'll need:
- Candidate name
- Position title
- Your name (recruiter)
- Company name

And optionally:
- Salary range
- Start date
- Additional benefits

What are the details for this hiring email?
```

**You:**
```
Candidate: Emily Rodriguez
Position: Senior Product Manager
Recruiter: Jessica Brown
Company: InnovateTech
Salary: $140,000 - $170,000
```

**Claude:**
```
Perfect! Let me generate that for you...
```
*[Uses fill_template]*
```
Here's your professional hiring introduction email:

---

Subject: Exciting Opportunity at InnovateTech - Senior Product Manager

Dear Emily Rodriguez,

I hope this email finds you well. My name is Jessica Brown, and I'm reaching out
regarding an exciting opportunity at InnovateTech.

We're currently looking for a talented Senior Product Manager to join our team.
Based on your background and experience, I believe this role could be an excellent
fit for your skills and career goals.

**About the Role:**
The Senior Product Manager position offers an opportunity to work on innovative
products and lead strategic initiatives at InnovateTech.

**Compensation:**
This position offers a competitive salary in the range of $140,000 - $170,000.

[... rest of email ...]

---

The email is ready to send! Would you like me to make any adjustments?
```

---

## Demo Scenario 8: NDA/Interview Invitation

### Conversation Flow

**You:**
```
Generate an interview invitation with NDA for candidate Michael Torres for the
DevOps Engineer position at SecureTech. Interview is Friday March 15, 2026 at
2:00 PM PST, video conference format. NDA deadline is Wednesday March 13.
Recruiter is Amanda Wilson, email amanda.wilson@securetech.com.
```

**Claude (using fill_template tool):**
```
I've created a comprehensive interview invitation with NDA details:

---

Subject: Interview Invitation - DevOps Engineer at SecureTech

Dear Michael Torres,

Thank you for your interest in the DevOps Engineer position at SecureTech! We were
impressed with your application and would like to invite you to interview with our team.

---

## Interview Details

**Date:** Friday March 15, 2026
**Time:** 2:00 PM PST
**Format:** Video Conference

---

## Non-Disclosure Agreement (NDA)

As part of the interview process, we ask that you review and sign the attached
Non-Disclosure Agreement. This is a standard practice to protect confidential
information that may be discussed during your interview.

**Please review, sign, and return the NDA by Wednesday March 13.**

[... complete NDA and next steps sections ...]

---

Best regards,
Amanda Wilson
SecureTech
amanda.wilson@securetech.com

---

The invitation is complete with all interview and NDA details. Ready to send!
```

---

## Testing Checklist

Use this checklist to verify all functionality:

### Tool 1: list_templates
- [ ] Returns all 4 templates
- [ ] Shows name, description, version for each
- [ ] Response is properly formatted

### Tool 2: get_template_schema
- [ ] Returns required fields list
- [ ] Returns optional fields list
- [ ] Shows field types (string, boolean, etc.)
- [ ] Includes example payload
- [ ] Error handling for invalid template_id

### Tool 3: fill_template
- [ ] Successfully renders with all required fields
- [ ] Successfully renders with optional fields
- [ ] Error when required fields missing (MISSING_FIELDS)
- [ ] Lists which fields are missing
- [ ] Error for invalid template_id (TEMPLATE_NOT_FOUND)
- [ ] Output is plain text (no HTML)
- [ ] Output is recruiter-friendly
- [ ] Candidate names appear correctly in output
- [ ] No unrendered Jinja2 tags ({{ }})

### All Templates
- [ ] hiring_intro_email renders correctly
- [ ] rejection_email renders correctly
- [ ] job_description renders correctly
- [ ] nda_interview_invitation renders correctly

---

## Expected User Experience

**Natural Language → Structured Tools → Professional Output**

1. **User speaks naturally** ("Generate a hiring email for John...")
2. **Claude uses appropriate tool** (fill_template with extracted fields)
3. **User receives professional document** (ready-to-send email)

**Key Benefits:**
- No need to remember field names
- No need to format JSON manually
- Natural conversation flow
- Professional, polished output
- Error handling guides user to provide missing info

---

## Success Metrics

After demo, verify:
- ✅ User can discover templates conversationally
- ✅ User can ask about required fields
- ✅ User can generate documents with natural language
- ✅ Missing fields are handled gracefully
- ✅ Output is copy-paste ready for recruiters
- ✅ All 4 template types work correctly
- ✅ Error messages are helpful, not cryptic

---

## Next Steps After Demo

1. Gather feedback on:
   - Template content quality
   - Missing fields or optional fields needed
   - Additional template types desired
   - Output formatting preferences

2. Potential enhancements:
   - Add more template types (offer letter, onboarding email, etc.)
   - Add template customization options
   - Add multi-language support
   - Add template versioning

3. Production deployment:
   - Deploy MCP server to production
   - Add authentication/authorization
   - Add usage tracking
   - Add template analytics
