# What is the Hellio HR Agent?

## 🤖 Simple Explanation

**The agent is an autonomous email assistant that monitors your Gmail inbox and automatically processes job applications and position announcements.**

Think of it as a robot secretary that:
1. **Watches** your Gmail inbox 24/7
2. **Reads** incoming emails about jobs and candidates
3. **Understands** what type of email it is (candidate application vs. position announcement)
4. **Notifies** HR coordinators in the web app
5. **Labels** processed emails in Gmail so it doesn't process them twice

**Key point:** The agent **NEVER sends emails automatically** - it only reads, classifies, and creates notifications for humans to review.

---

## 🏗️ How It Works (Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  1. GMAIL INBOX                                                     │
│     - Email arrives: "Application for Frontend Developer"          │
│     - Sent to: hr+candidates@develeap.com                          │
│     - Gmail filter applies: "hellio/inbox" label (automatic)       │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  2. AGENT (Python + Strands SDK)                                    │
│     - Polls Gmail every 60 seconds                                  │
│     - Query: "label:hellio/inbox -label:hellio/processed"          │
│     - Finds unprocessed emails (max 5 per poll)                    │
│                                                                     │
│     For each email:                                                 │
│       a) Classify (deterministic):                                  │
│          +candidates@ → CANDIDATE_APPLICATION                       │
│          +positions@ → POSITION_ANNOUNCEMENT                        │
│          other → OTHER (uses LLM)                                   │
│                                                                     │
│       b) Create notification in backend (via REST API)              │
│                                                                     │
│       c) If notification succeeds:                                  │
│          Add "hellio/processed" label to Gmail                      │
│          (This prevents reprocessing the same email)                │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  3. BACKEND API (Node.js + MySQL)                                   │
│     - Receives notification from agent                              │
│     - Stores in database: notifications table                       │
│     - Makes available via: GET /api/notifications                   │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  4. FRONTEND UI (React)                                             │
│     - Notification bell icon in header                              │
│     - Polls backend every 30 seconds                                │
│     - Shows: "New Candidate Application: John Doe"                  │
│     - HR coordinator clicks to review in Gmail                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Agent Code Structure

```
agent/
├── agent.py                      # Main entry point - runs the polling loop
├── .env                          # YOUR SECRETS (OAuth, API keys) - NEVER COMMIT!
├── requirements.txt              # Python dependencies
├── venv/                         # Python virtual environment (ignored by git)
│
├── tools/                        # Helper modules
│   ├── backend_api.py           # Talks to Node.js backend
│   ├── gmail_tools.py           # Talks to Gmail via MCP
│   └── classification.py        # Classifies emails (candidate/position/other)
│
└── config/
    └── hr_workflow.md           # Business rules (editable by HR!)
```

### Key Files Explained:

**agent.py** - The "brain"
- Main loop that runs every 60 seconds
- Fetches emails from Gmail
- Calls classification
- Creates notifications
- Labels processed emails

**backend_api.py** - Connection to your backend
- Authenticates with JWT token
- Creates notifications via POST /api/notifications
- Will upload documents in Phase 5 (future)

**gmail_tools.py** - Connection to Gmail
- Currently uses placeholders (MCP integration pending)
- Will fetch emails via Gmail MCP server
- Will add labels to processed emails

**classification.py** - Email classification logic
- **Deterministic routing (fast, free, accurate):**
  - Email to `*+candidates@` → CANDIDATE_APPLICATION
  - Email to `*+positions@` → POSITION_ANNOUNCEMENT
- **LLM fallback (for ambiguous emails):**
  - Uses Anthropic Claude to classify OTHER emails

---

## 🎯 How to Use the Agent

### Starting the Agent

**Option 1: Single iteration (testing)**
```bash
cd agent
venv\Scripts\activate          # Windows
# or: source venv/bin/activate  # Mac/Linux

python agent.py once
```

**What it does:**
- Runs ONE time
- Fetches up to 5 emails
- Processes them
- Exits

**Use when:** Testing, debugging, manual runs

---

**Option 2: Continuous loop (production)**
```bash
cd agent
venv\Scripts\activate

python agent.py
```

**What it does:**
- Runs in a loop (max 8 iterations by default)
- Polls every 60 seconds
- Processes emails as they arrive
- Exits after 8 iterations (~8 minutes)

**Use when:** You want the agent to monitor Gmail for a while

---

**Option 3: As a background service (future)**
```bash
# Not implemented yet - would run 24/7 as a Windows service
# For now, use cron/Task Scheduler to run agent.py every hour
```

---

### Agent Workflow (Step by Step)

**1. Startup**
```
Running single iteration test mode...
[OK] Authenticated as agent@hellio.hr
```
- Agent logs in to your backend
- Gets JWT token
- Ready to fetch emails

**2. Fetching Emails**
```
[EMAIL] Fetching emails: query='label:hellio/inbox -label:hellio/processed', max=5
   MCP Server: @modelcontextprotocol/server-google-workspace
   TODO: Replace placeholder with actual MCP call
```
- Queries Gmail for unprocessed emails
- Max 5 per poll (safety limit)
- Currently using placeholders (MCP integration pending)

**3. Processing Each Email**
```
[INBOX] Found 1 unread email(s)

[EMAIL] Processing email: msg-abc123
   From: john@example.com
   Subject: Application for Frontend Developer
   [OK] Classified as: CANDIDATE_APPLICATION (deterministic: +candidates address)
   [OK] Created notification: New Candidate Application: John Doe
   [OK] Labeled email as processed (all steps succeeded)

[OK] Processed: 1, [X] Failed: 0
```

**What happened:**
- Email classified using deterministic routing (+candidates@ in address)
- Notification created in backend database
- Gmail label "hellio/processed" added to email
- Email won't be processed again (idempotency)

**4. Shutdown**
```
[WAIT] Waiting 60s until next poll...
```
- Agent sleeps for 60 seconds
- Then repeats the process

---

## 🔒 Safety Features

### 1. **Idempotency (No Duplicate Processing)**
- Each email has unique Gmail message ID
- Once labeled "hellio/processed", agent skips it
- Safe to run agent multiple times on same inbox

### 2. **Rate Limits**
- Max 5 emails per poll (prevents runaway processing)
- Max 8 iterations (bounded execution time)
- 60-second sleep between polls (respects Gmail API limits)

### 3. **Error Recovery**
- If notification fails → Email NOT labeled
- Email will be retried on next poll
- Graceful degradation (doesn't crash)

### 4. **Strict Label Application**
```
classify → notify → label
   ↓         ↓        ↓
success  success   ONLY THEN apply label

If ANY step fails → Email NOT labeled → Will retry
```

### 5. **No Automatic Sending**
- Agent NEVER sends emails
- Only creates drafts in Phase 6 (future)
- Human approval required for all outgoing communication

---

## 🎮 Real-World Example

### Scenario: Job Applicant Emails You

**1. Applicant sends email:**
```
From: alice.johnson@gmail.com
To: hr+candidates@develeap.com
Subject: Application for Frontend Developer
Body: Hi, I'm interested in the position. Attached is my CV.
Attachment: alice-cv.pdf
```

**2. Gmail receives email:**
- Gmail filter matches: "To = *+candidates@develeap.com"
- Gmail applies label: "hellio/inbox" (instant, automatic)

**3. Agent polls Gmail (within 60 seconds):**
```
[EMAIL] Fetching emails: query='label:hellio/inbox -label:hellio/processed'
[INBOX] Found 1 unread email(s)

[EMAIL] Processing email: msg-789xyz
   From: alice.johnson@gmail.com
   Subject: Application for Frontend Developer
   [OK] Classified as: CANDIDATE_APPLICATION (deterministic: +candidates address)
```

**4. Agent creates notification:**
```
POST /api/notifications
{
  "type": "email_processed",
  "title": "New Candidate Application: Alice Johnson",
  "message": "From: alice.johnson@gmail.com\nSubject: Application for Frontend Developer\n\nClassification: Candidate Application (via deterministic: +candidates address)\nAttachments: 1 file(s)\n\nAction Required: Review email in Gmail and decide next steps.",
  "metadata": {
    "emailId": "msg-789xyz",
    "type": "CANDIDATE_APPLICATION",
    "sender": "alice.johnson@gmail.com",
    "subject": "Application for Frontend Developer",
    "attachmentCount": 1
  }
}
```

**5. Agent labels email:**
```
[LABEL] Adding label 'hellio/processed' to email msg-789xyz
[OK] Labeled email as processed (all steps succeeded)
```

**6. Gmail email now has TWO labels:**
- ✅ hellio/inbox
- ✅ hellio/processed

**7. HR Coordinator sees notification:**
- Opens Hellio HR web app
- Sees notification bell: 🔔 (1)
- Clicks notification: "New Candidate Application: Alice Johnson"
- Clicks link → Opens Gmail to review full email and CV
- Decides: "Let's interview her!" or "Not a fit"

**8. Next agent poll (60 seconds later):**
```
[EMAIL] Fetching emails: query='label:hellio/inbox -label:hellio/processed'
[EMPTY] No unread emails found
```
- Agent skips Alice's email (already has hellio/processed label)
- Idempotency works! ✅

---

## 🛠️ Configuration Files

### `.env` - Your Secrets (NEVER COMMIT!)

Located: `agent/.env`

```bash
# Backend connection
BACKEND_URL=http://localhost:3000
AGENT_EMAIL=agent@hellio.hr
AGENT_PASSWORD=MySecureAgentPassword2026!

# Gmail OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...xyz
GOOGLE_REFRESH_TOKEN=1//0g...

# Anthropic API (for LLM fallback classification)
ANTHROPIC_API_KEY=sk-ant-...

# Agent behavior
POLL_INTERVAL_SECONDS=60      # How often to check Gmail
MAX_ITERATIONS=8               # Max loops before exit
MAX_EMAILS_PER_POLL=5          # Max emails to process per poll
```

**Security:** `.env` is in `.gitignore` - it will NEVER be committed to git.

---

### `hr_workflow.md` - Business Rules (Human-Editable!)

Located: `agent/config/hr_workflow.md`

**This file defines HOW the agent classifies emails.**

HR coordinators can edit this file WITHOUT touching code!

Example rules:
```markdown
## Deterministic Email Classification

### Rule 1: Candidate Application Emails
Pattern: Email sent to `*+candidates@develeap.com`
Action: Classify as CANDIDATE_APPLICATION

### Rule 2: Position Announcement Emails
Pattern: Email sent to `*+positions@develeap.com`
Action: Classify as POSITION_ANNOUNCEMENT
```

**Benefit:** HR can update classification logic by editing a markdown file!

---

## 🚀 Advanced Features (Future Phases)

### Phase 5: Document Ingestion
**What:** Agent downloads CV attachments and uploads to backend
**Status:** Planned, not implemented

```python
# Future code (Phase 5)
if email_type == "CANDIDATE_APPLICATION" and attachments:
    # Download first attachment
    cv_content = download_attachment(email['id'], attachments[0]['id'])

    # Create candidate in database
    candidate = backend_api.create_or_get_candidate(
        email=sender_email,
        name=sender_name
    )

    # Upload CV to backend
    document = backend_api.upload_document(
        candidate_id=candidate['id'],
        file_content=cv_content,
        filename=attachments[0]['filename']
    )
```

---

### Phase 6: Draft Generation
**What:** Agent creates draft replies (human approves before sending)
**Status:** Planned, not implemented

```python
# Future code (Phase 6)
# Generate draft using LLM
draft_content = generate_draft_reply(
    email=email,
    template="candidate_welcome",
    candidate_name=candidate['name']
)

# Create draft in Gmail (NOT sent automatically!)
gmail.create_draft(
    to=candidate['email'],
    subject=f"Re: {email['subject']}",
    body=draft_content
)

# HR can edit/send from Gmail
```

---

## 🎓 Key Concepts

### What is "Deterministic Routing"?
**Simple rules based on email address patterns.**

- Email to `hr+candidates@develeap.com` → CANDIDATE_APPLICATION
- Email to `hr+positions@develeap.com` → POSITION_ANNOUNCEMENT

**Benefits:**
- ⚡ Fast (no LLM needed)
- 💰 Free (no API costs)
- 🎯 100% accurate (if sender uses correct address)

---

### What is "LLM Fallback"?
**When deterministic routing fails, use AI to classify.**

For emails sent to generic addresses (e.g., `hr@develeap.com`), the agent asks Claude:

```
"Is this email a candidate application, position announcement, or other?"
```

**Benefits:**
- 🧠 Smart (understands email content)
- 🎯 Handles ambiguous cases

**Costs:**
- 💰 ~$0.0002 per email (Amazon Nova Lite)

---

### What is "Idempotency"?
**The agent can run multiple times safely without duplicate processing.**

How it works:
1. Agent processes email → Creates notification
2. Agent adds "hellio/processed" label to Gmail
3. Next run: Agent skips emails with "hellio/processed" label
4. Result: Each email processed exactly once

**Example:**
- Run agent: 1 email processed
- Run agent again: 0 emails processed (already has label)
- Safe! ✅

---

## 📊 Monitoring & Logs

### Agent Console Output

**Normal operation:**
```
[OK] Authenticated as agent@hellio.hr
[EMAIL] Fetching emails: query='label:hellio/inbox -label:hellio/processed', max=5
[INBOX] Found 2 unread email(s)

[EMAIL] Processing email: msg-123
   From: john@example.com
   Subject: Application for Frontend Developer
   [OK] Classified as: CANDIDATE_APPLICATION (deterministic: +candidates address)
   [OK] Created notification: New Candidate Application: John Doe
   [OK] Labeled email as processed (all steps succeeded)

[EMAIL] Processing email: msg-456
   From: hiring@company.com
   Subject: Senior Backend Engineer Opening
   [OK] Classified as: POSITION_ANNOUNCEMENT (deterministic: +positions address)
   [OK] Created notification: New Position Announcement: Senior Backend Engineer
   [OK] Labeled email as processed (all steps succeeded)

[OK] Processed: 2, [X] Failed: 0
```

**Error handling:**
```
[EMAIL] Processing email: msg-789
   From: applicant@example.com
   Subject: Job Application
   [OK] Classified as: CANDIDATE_APPLICATION
   [X] Backend API error: Connection refused
   → Email NOT labeled, will retry on next poll

[OK] Processed: 0, [X] Failed: 1
```

---

## ❓ FAQ

### Q: Does the agent run automatically 24/7?
**A:** Not yet. Currently you run it manually with `python agent.py`. In production, you'd set up a cron job or Windows Task Scheduler to run it every hour.

### Q: What happens if the agent crashes?
**A:** It exits gracefully. Unprocessed emails (without "hellio/processed" label) will be processed on next run. No data loss.

### Q: Can the agent send emails on its own?
**A:** **NO.** The agent NEVER sends emails. It only reads, classifies, and creates notifications. Human approval required for all outgoing communication.

### Q: How much does it cost to run?
**A:** Almost free!
- Gmail API: Free (1 billion quota units/day)
- Deterministic routing: Free
- LLM fallback (for ambiguous emails): ~$0.0002 per email
- Estimated: $2-5/month for 1000 emails

### Q: What if I send a test email and run the agent multiple times?
**A:** Safe! The agent will process the email once, label it "hellio/processed", then skip it on subsequent runs (idempotency).

### Q: How do I stop the agent?
**A:** Press `Ctrl+C`. It will finish processing the current email, then exit gracefully.

### Q: Can HR edit the classification rules?
**A:** Yes! Edit `agent/config/hr_workflow.md` with new rules, then restart the agent.

### Q: What happens if Gmail is down?
**A:** Agent logs an error and exits. Emails will be processed when you restart the agent after Gmail recovers.

---

## 🎯 Quick Start Reminder

```bash
# 1. Start backend
docker-compose up -d mysql
cd backend && npm run dev

# 2. Activate Python environment
cd agent
venv\Scripts\activate

# 3. Run agent (single iteration - testing)
python agent.py once

# 4. Run agent (continuous monitoring)
python agent.py
```

---

## 📚 Related Documentation

- **Setup Guide:** `NEXT_STEPS.md` - Complete setup instructions
- **Gmail Configuration:** `agent/GMAIL_SETUP.md` - Filter setup
- **Implementation Status:** `EXERCISE-6-IMPLEMENTATION-STATUS.md` - Project progress
- **HR Workflow Rules:** `agent/config/hr_workflow.md` - Classification logic

---

**That's it! The agent is a simple, safe, autonomous email assistant that helps HR coordinators stay on top of incoming applications and job postings.** 🎉
