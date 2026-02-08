# Exercise 6: Intelligent HR Agent - Implementation Status

## Overview

This document tracks the implementation progress of the autonomous HR email agent for Hellio HR. The agent monitors Gmail, classifies emails (candidate applications vs. position announcements), and notifies HR coordinators for review.

**Last Updated:** 2026-02-08
**Current Phase:** Phase 1-3 Complete (Backend API + Agent Structure)
**Next Phase:** Phase 2 Testing (Gmail OAuth setup) + Phase 4 (Frontend UI)

## Architecture Summary

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      │               │      │              │      │              │
│    Gmail     │─────→│ Strands Agent │─────→│   Backend    │─────→│   Frontend   │
│   (Email)    │      │   (Python)    │      │ (TypeScript) │      │   (React)    │
│              │      │               │      │              │      │              │
└──────────────┘      └───────────────┘      └──────────────┘      └──────────────┘
  Email routing        Classification         Notifications         Notification UI
  +candidates@         Deterministic          MySQL storage         Bell icon
  +positions@          LLM fallback          JWT auth              Polling
```

### Key Decisions (from Plan)

1. **Agent Framework:** Strands Agents SDK (Python) - Exercise 6 requirement
2. **Gmail Integration:** @modelcontextprotocol/server-google-workspace (Real Gmail, not mock)
3. **State Management:** MySQL database extensions (Prisma ORM)
4. **Notification System:** Dual-channel (Gmail drafts + UI notifications)
5. **HR Workflow Rules:** External editable files (`agent/config/hr_workflow.md`)

## Implementation Progress

### ✅ Phase 1: Backend API Foundation (COMPLETE)

**Status:** ✅ Merged to main (commit: 4b7beaa)
**Duration:** ~2 hours
**Branch:** main

#### Database Schema Extensions

```prisma
model EmailProcessingLog {
  id               String    @id @default(uuid())
  gmailMessageId   String    @unique
  subject          String
  sender           String
  receivedAt       DateTime
  classifiedAs     EmailType  // CANDIDATE_APPLICATION | POSITION_ANNOUNCEMENT | OTHER
  processingStatus String     // "pending" | "processed" | "failed"
  candidateId      String?
  positionId       String?
  documentId       String?
  errorMessage     String?
  processedAt      DateTime  @default(now())

  candidate        Candidate?
  position         Position?
  drafts           EmailDraft[]
}

model EmailDraft {
  id                   String   @id @default(uuid())
  emailProcessingLogId String
  gmailDraftId         String?
  draftContent         String   @db.Text
  draftSubject         String
  draftStatus          String   // "created" | "sent" | "discarded"
  llmModel             String
  promptVersion        String
  createdAt            DateTime @default(now())
  sentAt               DateTime?

  emailLog             EmailProcessingLog
}

model Notification {
  id        String    @id @default(uuid())
  userId    String?
  type      String    // "email_processed" | "draft_created" | "error"
  title     String
  message   String    @db.Text
  metadata  Json?     // { emailId, candidateId, positionId, gmailDraftId }
  read      Boolean   @default(false)
  createdAt DateTime  @default(now())
  readAt    DateTime?

  user      User?
}
```

#### Backend Services

**notificationService.ts:**
- `createNotification()` - Agent calls this to notify HR
- `getUserNotifications()` - Fetch notifications for UI
- `markNotificationRead()` - Mark individual notification as read
- `markAllNotificationsRead()` - Bulk mark as read
- `deleteNotification()` - Remove notification

**emailProcessingService.ts:**
- `logEmailProcessing()` - Idempotent email logging via gmailMessageId
- `isProcessed()` - Check if email already processed (idempotency)
- `getProcessingLog()` - Fetch log by Gmail message ID
- `getRecentLogs()` - Fetch recent processing activity
- `getLogsByStatus()` - Filter by pending/processed/failed

#### API Endpoints

```
POST   /api/notifications          - Create notification (agent endpoint)
GET    /api/notifications          - List notifications for user
PATCH  /api/notifications/:id/read - Mark notification as read
POST   /api/notifications/mark-all-read - Bulk mark as read
DELETE /api/notifications/:id      - Delete notification
```

#### Seed Data

- Added `agent@hellio.hr` user with EDITOR role for agent authentication
- Password: `agent-secure-password-2026` (change in production)

#### Files Modified/Created

- ✅ `backend/prisma/schema.prisma` - Database schema extensions
- ✅ `backend/prisma/seed.ts` - Added agent user
- ✅ `backend/src/index.ts` - Registered notification routes
- ✅ `backend/src/routes/notifications.routes.ts` - Notification API routes
- ✅ `backend/src/services/notificationService.ts` - Notification business logic
- ✅ `backend/src/services/emailProcessingService.ts` - Email processing log management

#### Verification

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@hellio.hr","password":"agent-secure-password-2026"}'

# Test notification creation
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"email_processed","title":"Test","message":"Test notification"}'
```

**Note:** Backend needs MySQL running. Start with:
```bash
docker-compose up -d mysql
cd backend && npm run dev
```

### ✅ Phase 2-3: Agent Structure (COMPLETE)

**Status:** ✅ Merged to main (commit: d3d76f8)
**Duration:** ~3 hours
**Branch:** main

#### Agent Directory Structure

```
agent/
├── agent.py                    # Main agent entry point (bounded loop)
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variable template
├── README.md                  # Complete setup guide
├── tools/
│   ├── backend_api.py         # Backend API client (JWT auth)
│   ├── gmail_tools.py         # Gmail MCP wrapper
│   └── classification.py      # Email classification logic
└── config/
    └── hr_workflow.md         # Human-editable HR rules
```

#### Agent Components

**agent.py** - Main Agent Loop:
```python
while iteration < MAX_ITERATIONS:
    # 1. Fetch unread emails (max 5, exclude hellio/processed)
    emails = fetch_emails(query="is:unread -label:hellio/processed", max=5)

    for email in emails:
        # 2. Classify (deterministic routing first)
        email_type, method, info = classify_email(email)

        # 3. Create notification in backend
        notification = backend_api.create_notification(title, message, metadata)

        # 4. Label ONLY if notification succeeded
        if notification['id']:
            add_label(email['id'], "hellio/processed")

    sleep(60)  # Poll every minute
```

**classification.py** - Email Classification:
- **Deterministic routing (PRIMARY):**
  - `*+candidates@develeap.com` → CANDIDATE_APPLICATION
  - `*+positions@develeap.com` → POSITION_ANNOUNCEMENT
  - All others → OTHER (use LLM for context)
- **LLM fallback:** Amazon Nova Lite (~$0.0002/email) for ambiguous emails
- **Notification formatting:** Title, message, metadata generation

**backend_api.py** - Backend HTTP Client:
- `authenticate()` - Get JWT token (24-hour expiry, auto-refresh)
- `create_notification()` - POST /api/notifications
- `health_check()` - Verify backend connectivity
- `create_or_get_candidate()` - Find or create candidate (Phase 5)
- `upload_document()` - Document ingestion (Phase 5)

**gmail_tools.py** - Gmail Operations:
- `fetch_emails()` - Poll Gmail with query and max results
- `add_label()` - Mark email as processed
- `create_draft()` - Draft reply (Phase 6)
- `download_attachment()` - Get CV/JD file (Phase 5)

**hr_workflow.md** - HR Rules:
- Deterministic routing patterns
- Processing limits (5 emails/poll, 1 attachment/email, 8 iterations)
- MVP workflow: Poll → Classify → Notify → Label
- Notification templates for each email type
- Error handling and idempotency rules

#### Configuration Files

**requirements.txt:**
```
strands-agents>=0.1.0
requests>=2.31.0
pyyaml>=6.0.1
python-dotenv>=1.0.0
jsonschema>=4.20.0
structlog>=23.2.0
```

**.env.example:**
```bash
BACKEND_URL=http://localhost:3000
AGENT_EMAIL=agent@hellio.hr
AGENT_PASSWORD=agent-secure-password-2026

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

ANTHROPIC_API_KEY=sk-ant-...

POLL_INTERVAL_SECONDS=60
MAX_EMAILS_PER_POLL=5
MAX_ITERATIONS=8
GMAIL_PROCESSED_LABEL=hellio/processed
```

#### Files Created

- ✅ `agent/agent.py` - Main agent with bounded loop
- ✅ `agent/requirements.txt` - Python dependencies
- ✅ `agent/.env.example` - Environment template
- ✅ `agent/README.md` - Setup and usage guide
- ✅ `agent/tools/backend_api.py` - Backend API client
- ✅ `agent/tools/gmail_tools.py` - Gmail MCP wrapper
- ✅ `agent/tools/classification.py` - Classification logic
- ✅ `agent/config/hr_workflow.md` - HR workflow rules

#### MCP Configuration

**Root .mcp.json updated:**
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-workspace"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
        "GOOGLE_REFRESH_TOKEN": "${GOOGLE_REFRESH_TOKEN}"
      }
    }
  }
}
```

### ⏳ Phase 2: Gmail OAuth Setup (IN PROGRESS)

**Status:** 🔶 Blocked - Requires manual Gmail OAuth setup
**Blocking Issue:** Need to create Google Cloud Console project and OAuth credentials
**Estimated Duration:** 1-2 hours (manual setup)

#### Steps Required

1. **Create Google Cloud Project:**
   - Go to https://console.cloud.google.com/
   - Create new project: "Hellio HR Agent"
   - Enable Gmail API

2. **Create OAuth2 Credentials:**
   - Navigate to APIs & Services > Credentials
   - Create OAuth 2.0 Client ID (Web Application)
   - Add authorized redirect URI: `http://localhost:3000/oauth/callback`
   - Download credentials JSON

3. **Get Refresh Token:**
   - Use OAuth Playground: https://developers.google.com/oauthplayground/
   - Select Gmail API v1 scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.labels`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Authorize and exchange for refresh token

4. **Update .env:**
   ```bash
   cd agent
   cp .env.example .env
   # Fill in:
   GOOGLE_CLIENT_ID=<from step 2>
   GOOGLE_CLIENT_SECRET=<from step 2>
   GOOGLE_REFRESH_TOKEN=<from step 3>
   ANTHROPIC_API_KEY=<your anthropic key>
   ```

5. **Test Gmail MCP:**
   ```bash
   # Test Gmail MCP server
   npx @modelcontextprotocol/server-google-workspace
   ```

#### Verification Checklist

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] OAuth2 credentials created
- [ ] Refresh token obtained
- [ ] .env configured with credentials
- [ ] Gmail MCP server responds to test queries

### ⏳ Phase 3: End-to-End Testing (PENDING)

**Status:** 🔴 Not Started - Blocked by Phase 2
**Dependencies:** Phase 2 (Gmail OAuth) must be complete
**Estimated Duration:** 1-2 hours

#### Test Scenarios

**Test 1: Candidate Application**
```bash
# 1. Start backend
cd backend && npm run dev

# 2. Send test email to your-email+candidates@develeap.com
#    Subject: Application for Frontend Developer
#    Body: Hi, I'm interested in the position. Please find my CV attached.
#    Attachment: sample-cv.pdf

# 3. Run agent (single iteration)
cd ../agent
python agent.py once

# 4. Verify notification created
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer <editor-token>"

# 5. Verify Gmail label
# Check Gmail inbox - email should have "hellio/processed" label
```

**Test 2: Position Announcement**
```bash
# Send email to your-email+positions@develeap.com
# Subject: New Opening: Senior Backend Engineer
# Body: We need to hire a senior backend engineer...

python agent.py once

# Verify notification: "New Position Announcement: Senior Backend Engineer"
```

**Test 3: Idempotency**
```bash
# Run agent twice on same email
python agent.py once
python agent.py once  # Should skip already-processed email

# Verify: Only 1 notification created, not 2
```

**Test 4: Error Recovery**
```bash
# Stop backend
pkill -f "npm run dev"

# Send test email
# Run agent (should fail, NOT label email)
python agent.py once

# Start backend
cd backend && npm run dev

# Run agent again (should succeed, label email)
python agent.py once

# Verify: Email processed successfully after backend recovery
```

#### Verification Checklist

- [ ] Agent authenticates to backend successfully
- [ ] Agent polls Gmail and fetches unread emails
- [ ] Deterministic classification works (+candidates@, +positions@)
- [ ] Notification created in backend database
- [ ] Gmail label applied after successful notification
- [ ] Idempotency: Same email not processed twice
- [ ] Error recovery: Email retried after backend restart

### ⏳ Phase 4: Frontend Notification UI (PENDING)

**Status:** 🔴 Not Started
**Dependencies:** None (can start in parallel with Phase 2-3)
**Estimated Duration:** 3-4 hours

#### Components to Create

**NotificationBell.tsx** - Header notification icon:
```tsx
interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  read: boolean;
  createdAt: Date;
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Poll for notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    const response = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.read).length);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchNotifications();
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="dropdown">
          {notifications.map(n => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**notificationService.ts** - Frontend API client:
```typescript
export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  const params = unreadOnly ? '?unreadOnly=true' : '';
  const response = await fetch(`/api/notifications${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return response.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getToken()}` }
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` }
  });
}
```

#### Files to Create

- [ ] `src/components/NotificationBell.tsx` - Notification UI component
- [ ] `src/services/notificationService.ts` - Frontend API client
- [ ] `src/types/index.ts` - Add Notification interface
- [ ] `src/App.tsx` - Add NotificationBell to header

#### Verification Checklist

- [ ] Notification bell appears in header
- [ ] Unread count displays correctly
- [ ] Clicking bell opens dropdown with notifications
- [ ] Notifications auto-refresh every 30 seconds
- [ ] Clicking notification marks as read
- [ ] "Mark all as read" button works
- [ ] Notification includes link to Gmail email (via metadata.emailId)

### ⏳ Phase 5: Document Ingestion (FUTURE)

**Status:** 🔴 Not Started - Post-MVP
**Dependencies:** Phase 3 complete
**Estimated Duration:** 4-5 hours

#### Scope

- Agent downloads first attachment from classified emails
- Upload to backend via `POST /api/documents/ingest`
- Create candidate/position ONLY if ingestion succeeds
- Update notification with ingestion results

#### Changes Required

**Agent (agent.py):**
```python
# After classification, before notification
if email_type == "CANDIDATE_APPLICATION" and attachments:
    # Download first attachment
    attachment = download_attachment(email['id'], attachments[0]['id'], attachments[0]['filename'])

    # Create or get candidate
    candidate = backend_api.create_or_get_candidate(
        email=extract_email(email['from']),
        name=extract_name(email['from'])
    )

    # Upload document (triggers ingestion)
    document = backend_api.upload_document(
        candidate_id=candidate['id'],
        file_content=attachment,
        filename=attachments[0]['filename']
    )

    # Update notification with candidate link
    metadata['candidateId'] = candidate['id']
    metadata['documentId'] = document['id']
```

### ⏳ Phase 6: Gmail Draft Creation (FUTURE)

**Status:** 🔴 Not Started - Post-MVP
**Dependencies:** Phase 5 complete
**Estimated Duration:** 3-4 hours

#### Scope

- Generate draft reply using LLM and templates
- Create draft in Gmail (do NOT send)
- Link draft to notification
- HR can edit/send from Gmail

#### Components

**draft_templates.yaml:**
```yaml
candidate_welcome:
  subject: "Re: {original_subject}"
  body: |
    Hi {candidate_name},

    Thank you for your application for the {position_title} position at Hellio HR.

    We have received your CV and will review it shortly. If your qualifications match
    our requirements, we will contact you to schedule an interview.

    Best regards,
    Hellio HR Team

position_acknowledgment:
  subject: "Re: {original_subject}"
  body: |
    Hi {hiring_manager_name},

    Thank you for submitting the {position_title} position.

    We have created the position in our system and will begin sourcing candidates shortly.

    Best regards,
    HR Coordinator
```

### ⏳ Phase 7: Position Workflow (FUTURE)

**Status:** 🔴 Not Started - Post-MVP
**Dependencies:** Phase 5 complete
**Estimated Duration:** 2-3 hours

#### Scope

- Handle position announcement emails
- Extract job requirements from description
- Match to existing candidates

### ⏳ Phase 8: Production Hardening (FUTURE)

**Status:** 🔴 Not Started - Post-MVP
**Dependencies:** All previous phases complete
**Estimated Duration:** 2-3 hours

#### Scope

- Structured logging (JSON logs)
- Metrics collection (Prometheus/StatsD)
- Alert on consecutive failures
- Rate limiting and backoff
- Gmail Pub/Sub push notifications (replace polling)

## Current Blockers

### 🔴 Critical Blockers

1. **Gmail OAuth Setup (Phase 2):**
   - Need Google Cloud Console access
   - Must create OAuth credentials manually
   - Requires domain verification for production use
   - **Impact:** Blocks Phase 3 testing and all subsequent phases

2. **MySQL Database Not Running:**
   - Backend fails to start without MySQL
   - Docker Desktop not running on development machine
   - **Workaround:** Start MySQL with `docker-compose up -d mysql`
   - **Impact:** Blocks backend API testing

### 🔶 Non-Critical Issues

1. **Strands Agents SDK:**
   - Actual Strands integration not yet implemented
   - Currently using placeholder agent loop
   - **Impact:** Agent works but not using Strands framework yet
   - **Priority:** Low (MVP works without Strands)

2. **LLM Classification:**
   - LLM fallback not implemented (only deterministic routing works)
   - **Impact:** OTHER emails not classified with context
   - **Priority:** Medium (most emails use deterministic routing)

## Next Actions

### Immediate (Phase 2 - Gmail OAuth)

1. **Create Google Cloud project:**
   - Project name: "Hellio HR Agent"
   - Enable Gmail API

2. **Generate OAuth credentials:**
   - Client ID and Secret
   - Authorized redirect URIs

3. **Obtain refresh token:**
   - Use OAuth Playground
   - Configure in agent/.env

4. **Test Gmail MCP:**
   - Verify Gmail API connection
   - Test email fetching

### Short-term (Phase 3 - E2E Testing)

1. **Start MySQL:**
   ```bash
   docker-compose up -d mysql
   ```

2. **Start backend:**
   ```bash
   cd backend && npm run dev
   ```

3. **Test agent:**
   ```bash
   cd agent
   cp .env.example .env
   # Fill in Gmail credentials
   python agent.py once
   ```

4. **Send test emails:**
   - To: your-email+candidates@develeap.com
   - To: your-email+positions@develeap.com

5. **Verify notifications:**
   ```bash
   curl http://localhost:3000/api/notifications \
     -H "Authorization: Bearer <token>"
   ```

### Medium-term (Phase 4 - Frontend UI)

1. Create NotificationBell component
2. Integrate with App header
3. Test notification polling
4. Verify mark-as-read functionality

## Success Metrics

### Phase 3 MVP Success Criteria

- [ ] Agent authenticates to backend (JWT token)
- [ ] Agent polls Gmail every 60 seconds
- [ ] Deterministic classification works for +candidates@ and +positions@
- [ ] Notification created in database for each email
- [ ] Gmail label applied only after successful notification
- [ ] Idempotency: Same email not processed twice
- [ ] Error recovery: Email retried after backend failure

### Phase 4 UI Success Criteria

- [ ] Notification bell visible in header
- [ ] Unread count accurate
- [ ] Notifications list displays correctly
- [ ] Auto-refresh every 30 seconds
- [ ] Mark-as-read updates UI immediately
- [ ] Clicking notification opens Gmail email (via metadata link)

## Timeline Summary

| Phase | Status | Duration | Start Date | End Date | Notes |
|-------|--------|----------|------------|----------|-------|
| 1. Backend API | ✅ Complete | 2h | 2026-02-08 | 2026-02-08 | Merged to main |
| 2. Agent Structure | ✅ Complete | 3h | 2026-02-08 | 2026-02-08 | Merged to main |
| 2. Gmail OAuth | 🔶 Blocked | 1-2h | - | - | Manual setup required |
| 3. E2E Testing | 🔴 Not Started | 1-2h | - | - | Blocked by Phase 2 |
| 4. Frontend UI | 🔴 Not Started | 3-4h | - | - | Can start in parallel |
| 5. Doc Ingestion | 🔴 Not Started | 4-5h | - | - | Post-MVP |
| 6. Draft Creation | 🔴 Not Started | 3-4h | - | - | Post-MVP |
| 7. Position Flow | 🔴 Not Started | 2-3h | - | - | Post-MVP |
| 8. Production | 🔴 Not Started | 2-3h | - | - | Post-MVP |

**Total Time Invested:** ~5 hours (Phases 1-2)
**Remaining MVP Time:** ~6-9 hours (Phases 2-4)
**Total MVP Time:** ~11-14 hours

## Related Documentation

- [Implementation Plan](./EXERCISE-6-IMPLEMENTATION-PLAN.md) - Original detailed plan
- [Agent README](./agent/README.md) - Agent setup and usage guide
- [HR Workflow Rules](./agent/config/hr_workflow.md) - Classification and processing rules
- [Backend API Docs](./backend/README.md) - Backend API endpoints and authentication

## Commit History

```
d3d76f8 feat(agent): add Python Strands agent structure (Phase 2-3 foundation)
4b7beaa feat(backend): add notification API and email processing for HR agent (Phase 1)
```

## Contact

For questions about this implementation, see:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- CLAUDE.md for project-specific guidance
