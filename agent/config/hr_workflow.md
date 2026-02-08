# HR Workflow Rules for Email Agent

## Deterministic Email Classification

The agent MUST use these deterministic routing rules FIRST before using LLM classification:

### Rule 1: Candidate Application Emails
**Pattern:** Email sent to `*+candidates@develeap.com` or `candidates@develeap.com`

**Action:**
- Classify as: `CANDIDATE_APPLICATION`
- Expected attachments: CV/resume (PDF, DOC, DOCX, TXT)
- Create notification for HR coordinator
- Do NOT auto-ingest in MVP (notify only)

**Examples:**
- `john+candidates@develeap.com` → CANDIDATE_APPLICATION
- `hr+candidates@develeap.com` → CANDIDATE_APPLICATION
- `candidates@develeap.com` → CANDIDATE_APPLICATION

### Rule 2: Position Announcement Emails
**Pattern:** Email sent to `*+positions@develeap.com` or `positions@develeap.com`

**Action:**
- Classify as: `POSITION_ANNOUNCEMENT`
- Expected attachments: Job description (PDF, DOC, DOCX, TXT)
- Create notification for HR coordinator
- Do NOT auto-ingest in MVP (notify only)

**Examples:**
- `john+positions@develeap.com` → POSITION_ANNOUNCEMENT
- `hr+positions@develeap.com` → POSITION_ANNOUNCEMENT
- `positions@develeap.com` → POSITION_ANNOUNCEMENT

### Rule 3: All Other Emails
**Pattern:** Any email not matching above patterns

**Action:**
- Classify as: `OTHER`
- Use LLM classification to provide context
- Create notification with classification details
- Do NOT process attachments

## Processing Limits (MVP Safety Constraints)

1. **Max 5 emails per poll** - Hard limit to prevent runaway processing
2. **Max 1 attachment per email** - Take first attachment only
3. **Max 8 agent iterations** - Bounded loop to prevent infinite execution
4. **Idempotency via Gmail Message ID** - Never process same email twice
5. **Label ONLY after success** - Apply `hellio/processed` label only when ALL steps succeed

## MVP Workflow (Phase 3: Notify Only)

```
Poll Gmail (max 5 unread, no hellio/processed label)
  → For each email:
    1. Apply deterministic classification (email address routing)
    2. Create notification in backend (POST /api/notifications)
    3. If step 2 succeeds: Add label `hellio/processed` to Gmail
    4. If step 2 fails: Log error, do NOT label email
```

**CRITICAL:** In MVP (Phase 3-4), the agent does NOT:
- Download attachments
- Ingest documents
- Create candidates or positions
- Send emails or create drafts

The agent ONLY:
- Polls Gmail
- Classifies emails (deterministic + LLM fallback)
- Creates notifications
- Labels processed emails

## LLM Classification Prompt (for OTHER emails only)

When email doesn't match deterministic routing rules, use this prompt:

```
You are an HR email classifier. Analyze this email and determine if it is:
1. CANDIDATE_APPLICATION - Person applying for a job, submitting CV, expressing interest
2. POSITION_ANNOUNCEMENT - Job opening announcement, hiring manager requesting to post a role
3. OTHER - Any other email (general inquiry, spam, internal communication)

Email details:
Subject: {subject}
From: {sender}
Body preview: {body_preview}

Respond with ONLY one of: CANDIDATE_APPLICATION, POSITION_ANNOUNCEMENT, OTHER
If uncertain, respond with OTHER.
```

## Notification Templates

### For CANDIDATE_APPLICATION
**Title:** New Candidate Application: {candidate_name}

**Message:**
```
From: {sender_email}
Subject: {email_subject}

Classification: Candidate Application (via {classification_method})
Attachments: {attachment_count} file(s)

Action Required: Review email in Gmail and decide next steps.
```

### For POSITION_ANNOUNCEMENT
**Title:** New Position Announcement: {position_title}

**Message:**
```
From: {sender_email}
Subject: {email_subject}

Classification: Position Announcement (via {classification_method})
Attachments: {attachment_count} file(s)

Action Required: Review email in Gmail and create position in system.
```

### For OTHER
**Title:** Unclassified Email: {subject}

**Message:**
```
From: {sender_email}
Subject: {email_subject}

Classification: Other (via LLM)
LLM Context: {llm_reasoning}

Action Required: Review email manually to determine appropriate action.
```

## Error Handling

### Email Processing Errors
- Log error in EmailProcessingLog with status="failed"
- Create notification with type="error"
- Do NOT label email as processed
- Allow retry on next poll

### Notification Creation Errors
- Log error to agent logs
- Do NOT label email as processed
- Retry on next poll

### Gmail API Errors
- Log error to agent logs
- Continue processing other emails
- Do NOT crash agent

## Idempotency Rules

1. Before processing email, check: `GET /api/email-logs/{gmailMessageId}`
2. If exists with status="processed", skip email
3. Only label `hellio/processed` after notification created successfully
4. If agent restarts mid-processing, unlabeled emails will be retried (safe)

## Agent Lifecycle

### Startup
1. Authenticate to backend (POST /api/auth/login)
2. Store JWT token for subsequent requests
3. Load HR workflow rules from this file
4. Start polling loop (60-second interval)

### Main Loop (Phase 3 MVP)
```python
while agent.is_running:
    emails = fetch_unread_emails(max=5, exclude_label="hellio/processed")

    for email in emails[:5]:  # Safety limit
        try:
            # 1. Deterministic classification
            email_type = classify_email_deterministic(email['to'])

            # 2. Create notification
            notification = create_notification(
                type="email_processed",
                title=f"New email: {email_type}",
                message=format_notification(email, email_type),
                metadata={
                    "emailId": email['id'],
                    "type": email_type,
                    "sender": email['from'],
                    "subject": email['subject']
                }
            )

            # 3. Label ONLY if notification succeeded
            if notification['id']:
                add_gmail_label(email['id'], "hellio/processed")

        except Exception as e:
            log_error(f"Error processing {email['id']}: {e}")
            # Do NOT label - will retry on next poll
            continue

    sleep(60)  # Poll every minute
```

### Shutdown
1. Graceful stop after current iteration completes
2. Log final status
3. No cleanup needed (stateless agent)

## Future Enhancements (Post-MVP)

### Phase 5: Document Ingestion
- Download first attachment from classified emails
- Upload to backend via POST /api/documents/ingest
- Create candidate/position ONLY if ingestion succeeds
- Update notification with ingestion results

### Phase 6: Gmail Draft Creation
- Generate draft reply using LLM and templates
- Create draft in Gmail (do NOT send)
- Link draft to notification
- HR can edit/send from Gmail

### Phase 7: Position Workflow
- Process position announcement emails
- Extract job requirements from description
- Match to existing candidates

### Phase 8: Production Hardening
- Structured logging (JSON logs)
- Metrics collection (Prometheus/StatsD)
- Alert on consecutive failures
- Rate limiting and backoff
- Gmail Pub/Sub push notifications (replace polling)

## Version History

- v1.0 (2026-02-08): Initial MVP rules - Deterministic routing + notify only
