# Hellio HR Email Agent

**Strands-based autonomous agent** (Exercise 6) that monitors Gmail, classifies emails, ingests CVs/positions, and notifies HR coordinators through human-in-the-loop workflows.

## ✅ Strands Framework Integration Complete

The agent now uses the **Strands Agents SDK 1.25.0** with:
- `Agent` class for autonomous orchestration
- `@tool` decorated functions (6 tools registered)
- LLM-driven decision making (Claude Sonnet 4)
- System prompt with HR workflow rules
- Async execution with `invoke_async`

See `EXERCISE_6_STRANDS_MIGRATION.md` for full migration details.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Gmail (Email Source)                    │
│  - Filters: Apply hellio/inbox label to +candidates/+positions│
│  - Polls: label:hellio/inbox -label:hellio/processed       │
│  - Labels: hellio/processed after ALL steps succeed        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Strands Agent (Python / This Repo)              │
│  - Deterministic classification (email routing)             │
│  - LLM fallback (Amazon Nova Lite)                         │
│  - Bounded loop (max 8 iterations)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         HellioHR Backend (Node.js + TypeScript)             │
│  - POST /api/notifications → Create notification           │
│  - MySQL persistence                                        │
│  - JWT auth (agent@hellio.hr)                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            HellioHR Frontend (React + TypeScript)            │
│  - Notification bell in UI                                  │
│  - Real-time polling for new notifications                 │
└─────────────────────────────────────────────────────────────┘
```

## Gmail MCP Integration Status

⚠️ **Important:** This agent uses the Gmail MCP server (`@modelcontextprotocol/server-google-workspace`) as required by Exercise 6.

**Current Status:**
- ✅ MCP server configured in `.mcp.json`
- ✅ OAuth2 environment variables defined
- 🔶 Gmail API calls in `gmail_tools.py` use placeholders (MCP integration in progress)
- 🔶 Strands framework MCP bridge pending OAuth setup

**Migration Path:**
1. Configure OAuth credentials (see Gmail Setup section below)
2. Integrate Strands MCP bridge for gmail_tools.py functions
3. Replace placeholder returns with actual MCP calls

See: https://github.com/modelcontextprotocol/servers/tree/main/src/google-workspace

## Current Status: Strands Integration Complete (Phases 1-5)

✅ **Completed Phases:**
- **Phase 1:** Backend API Foundation (notifications, email logging, agent user)
- **Phase 3:** Strands Agent Structure (`agent_strands.py` with 6 tools)
- **Phase 4:** Frontend Notifications (NotificationBell component in UI)
- **Phase 5:** Document Ingestion (CV download, candidate creation, backend upload)

✅ **Strands Features Working:**
- Autonomous tool orchestration (LLM decides which tools to call)
- System prompt defines HR workflow rules
- 6 tools registered: health check, fetch emails, classify, process candidates, notify, mark processed
- Async execution with `invoke_async`
- Bounded execution (MAX_TURNS safety limit)
- Human-in-the-loop (no auto-send)

⚠️ **Blocked by Gmail OAuth:**
- Gmail MCP connection requires OAuth2 credentials
- See `GMAIL_SETUP.md` for configuration instructions

⏳ **Future Phases:**
- Phase 6: Gmail draft creation (reply templates)
- Phase 7: Position workflow (job description ingestion)
- Phase 8: Production hardening (structured logging, metrics)

## Setup

### Prerequisites

1. **Python 3.10+**
2. **Gmail OAuth2 Credentials** (from Google Cloud Console)
3. **HellioHR Backend running** on http://localhost:3000
4. **MySQL database** with schema migrations applied

### Installation

```bash
cd agent

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and fill in credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Backend API
BACKEND_URL=http://localhost:3000
AGENT_EMAIL=agent@hellio.hr
AGENT_PASSWORD=agent-secure-password-2026

# Gmail OAuth2 (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Anthropic API (for LLM classification fallback)
ANTHROPIC_API_KEY=sk-ant-...

# Agent Configuration
POLL_INTERVAL_SECONDS=60
MAX_EMAILS_PER_POLL=5
MAX_ITERATIONS=8
```

### Gmail OAuth2 Setup

**See detailed guide:** `GMAIL_SETUP.md` for complete Gmail configuration including:
- Creating Gmail labels (`hellio/inbox`, `hellio/processed`)
- Configuring Gmail filters for email routing
- Testing email routing with +candidates and +positions

**Quick OAuth Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials (Web Application)
5. Add redirect URI: `http://localhost:3000/oauth/callback`
6. Use [OAuth Playground](https://developers.google.com/oauthplayground/) to get refresh token
   - Select scopes: `gmail.readonly`, `gmail.labels`, `gmail.modify`
7. Store credentials in `.env`

**Required Gmail Filters:**

Before running the agent, you MUST configure Gmail filters to route emails to `hellio/inbox` label.

See: `GMAIL_SETUP.md` for step-by-step filter setup instructions.

## Usage

### Run Strands Agent (Single Iteration - Recommended)

```bash
python agent_strands.py once
```

This will:
- Initialize Strands agent with 6 registered tools
- Check backend health
- Fetch up to 5 unprocessed emails from Gmail
- For each email:
  - Classify email type (candidate/position/other)
  - Process based on type (ingest CV, create notification)
  - Mark as processed ONLY if all steps succeed
- Provide execution summary with tool usage statistics
- Exit after completion (single run)

**Why "once" mode?**
- Safer for testing (bounded execution)
- Clear start/end boundaries
- Easy to inspect results
- Can be scheduled externally (cron, systemd timer)

### Run Continuously (Polling Mode)

```bash
python agent_strands.py continuous 60 5
# Poll every 60 seconds, max 5 iterations
```

This will:
- Run the agent 5 times
- Wait 60 seconds between runs
- Useful for long-running monitoring

### Legacy Agent (Pre-Strands)

```bash
python agent.py once
```

**Note:** The original manual polling script (`agent.py`) is kept for reference but is NOT recommended. Use `agent_strands.py` for proper Strands framework integration.

### Run Agent (Single Iteration - Testing)

```bash
python agent_strands.py once
```

This will:
- Poll Gmail once
- Process up to 5 emails
- Exit immediately

### Stop Agent

Press `Ctrl+C` to gracefully stop the agent. It will finish processing the current email before exiting.

## Email Routing Patterns

**Prerequisites:** Gmail filters must be configured to apply `hellio/inbox` label. See `GMAIL_SETUP.md`.

### Candidate Applications

**Send to:**
- `john+candidates@develeap.com` ✅
- `hr+candidates@develeap.com` ✅
- `candidates@develeap.com` ✅

**Gmail Filter:**
- Matches: `to:(*+candidates@develeap.com OR candidates@develeap.com)`
- Action: Apply label `hellio/inbox`

**Agent Action:**
1. Fetch: `label:hellio/inbox -label:hellio/processed`
2. Classify as: `CANDIDATE_APPLICATION` (deterministic: +candidates@)
3. Create notification: "New Candidate Application: {name}"
4. Label: `hellio/processed` (ONLY if notification succeeds)

### Position Announcements

**Send to:**
- `john+positions@develeap.com` ✅
- `hr+positions@develeap.com` ✅
- `positions@develeap.com` ✅

**Gmail Filter:**
- Matches: `to:(*+positions@develeap.com OR positions@develeap.com)`
- Action: Apply label `hellio/inbox`

**Agent Action:**
1. Fetch: `label:hellio/inbox -label:hellio/processed`
2. Classify as: `POSITION_ANNOUNCEMENT` (deterministic: +positions@)
3. Create notification: "New Position Announcement: {title}"
4. Label: `hellio/processed` (ONLY if notification succeeds)

### Other Emails

**Send to:**
- Any other address (no +candidates or +positions)

**Agent Action:**
- Classify as: `OTHER` (with LLM reasoning)
- Create notification: "Unclassified Email: {subject}"
- Label: `hellio/processed` (ONLY if notification succeeds)

**Critical Rule:** `hellio/processed` label is applied **ONLY after ALL steps succeed:**
- Phase 3 MVP: classify → notify → label
- Phase 5: classify → ingest → notify → label
- Phase 6: classify → ingest → draft → notify → label

If ANY step fails, email is NOT labeled and will be retried on next poll.

## Testing

### Manual Test: Send Test Email

1. Send email to `your-gmail+candidates@develeap.com`
2. Attach a CV (optional, not processed in MVP)
3. Run agent: `python agent.py once`
4. Check backend: `curl http://localhost:3000/api/notifications -H "Authorization: Bearer <token>"`
5. Verify email labeled in Gmail: `hellio/processed`

### Idempotency Test

1. Send test email
2. Run agent: `python agent.py once` (should process)
3. Run agent again: `python agent.py once` (should skip - already labeled)
4. Email processed only once ✅

### Error Recovery Test

1. Stop backend
2. Send test email
3. Run agent: `python agent.py once` (should fail, NOT label email)
4. Start backend
5. Run agent again: `python agent.py once` (should succeed, label email)
6. Email processed after backend recovers ✅

## File Structure

```
agent/
├── agent.py                    # Main agent entry point
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variable template
├── README.md                  # This file
├── tools/
│   ├── backend_api.py         # Backend API client (TypeScript → Python)
│   ├── gmail_tools.py         # Gmail MCP wrapper (fetch, label, draft)
│   └── classification.py      # Email classification logic
├── config/
│   ├── hr_workflow.md         # HR rules (human-editable)
│   └── draft_templates.yaml   # Email reply templates (Phase 6)
└── prompts/
    ├── classification_prompt.py   # LLM classification prompt
    └── draft_prompt.py            # LLM draft generation prompt (Phase 6)
```

## Troubleshooting

### "Authentication failed"

**Cause:** Backend not running or wrong credentials

**Fix:**
```bash
# Check backend health
curl http://localhost:3000/health

# Verify agent credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@hellio.hr","password":"agent-secure-password-2026"}'
```

### "No unread emails found"

**Cause:** All emails already processed or inbox empty

**Fix:**
- Send test email to `your+candidates@develeap.com`
- Remove `hellio/processed` label from existing emails in Gmail

### "Gmail MCP server not found"

**Cause:** Gmail MCP server not configured in `.mcp.json`

**Fix:**
```json
// .mcp.json (root of project)
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

### "Token expired"

**Cause:** JWT token expired (24-hour lifetime)

**Fix:** Agent auto-refreshes token. If issue persists, restart agent.

## Next Steps

### Phase 4: Frontend Notifications (3-4 hours)
- Create `NotificationBell` component
- Add notification polling to UI
- Display notifications in header

### Phase 5: Document Ingestion (4-5 hours)
- Download first attachment from emails
- Upload to backend via `POST /api/documents/ingest`
- Create candidate ONLY if ingestion succeeds
- Update notification with results

### Phase 6: Gmail Draft Creation (3-4 hours)
- Generate reply drafts using LLM
- Create drafts in Gmail (do NOT send)
- HR can review/edit/send from Gmail

## Contributing

### Code Style

- Python: PEP 8, type hints
- Line length: 100 chars
- Imports: stdlib → third-party → local

### Testing

```bash
# Run single iteration
python agent.py once

# Check backend connectivity
python -c "from tools.backend_api import get_backend_api; api = get_backend_api(); print(api.health_check())"
```

### Logging

Agent logs to stdout in structured format:

```
📧 Processing email: msg-123
   From: john@example.com
   Subject: Application for Frontend Developer
   ✓ Classified as: CANDIDATE_APPLICATION (deterministic: +candidates address)
   ✓ Created notification: New Candidate Application: John Doe
   ✓ Labeled email as processed
```

## License

See root LICENSE file.
