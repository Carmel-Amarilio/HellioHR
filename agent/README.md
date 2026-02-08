# Hellio HR Email Agent

Python-based autonomous agent using Strands Agents SDK to monitor Gmail, classify emails, and notify HR coordinators.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Gmail (Email Source)                    │
│  - Polls: is:unread -label:hellio/processed                │
│  - Classifies: +candidates@, +positions@, other            │
│  - Labels: hellio/processed after success                  │
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

## Current Status: Phase 3 MVP (Notify Only)

The agent is currently in **Phase 3: Minimal Vertical Slice** which includes:

✅ **Working:**
- Poll Gmail (max 5 emails per poll)
- Deterministic classification (email address routing)
- Create notifications in backend
- Label processed emails

⏳ **Not Implemented Yet (Future Phases):**
- Phase 4: Frontend notification UI
- Phase 5: Document ingestion (download attachments, create candidates)
- Phase 6: Gmail draft creation (reply templates)
- Phase 7: Position workflow
- Phase 8: Production hardening (logging, metrics, alerts)

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

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Gmail API**
4. Create OAuth 2.0 credentials (Web Application)
5. Add redirect URI: `http://localhost:3000/oauth/callback`
6. Run OAuth flow to get refresh token:

```bash
# Using OAuth playground or custom script
# This will output GOOGLE_REFRESH_TOKEN for .env
```

7. Store credentials in `.env`

## Usage

### Run Agent (Continuous Loop)

```bash
python agent.py
```

This will:
- Poll Gmail every 60 seconds
- Process up to 5 emails per poll
- Run for 8 iterations (8 minutes total)
- Exit gracefully

### Run Agent (Single Iteration - Testing)

```bash
python agent.py once
```

This will:
- Poll Gmail once
- Process up to 5 emails
- Exit immediately

### Stop Agent

Press `Ctrl+C` to gracefully stop the agent. It will finish processing the current email before exiting.

## Email Routing Patterns

### Candidate Applications

**Send to:**
- `john+candidates@develeap.com` ✅
- `hr+candidates@develeap.com` ✅
- `candidates@develeap.com` ✅

**Agent Action:**
- Classify as: `CANDIDATE_APPLICATION`
- Create notification: "New Candidate Application: {name}"
- Label: `hellio/processed`

### Position Announcements

**Send to:**
- `john+positions@develeap.com` ✅
- `hr+positions@develeap.com` ✅
- `positions@develeap.com` ✅

**Agent Action:**
- Classify as: `POSITION_ANNOUNCEMENT`
- Create notification: "New Position Announcement: {title}"
- Label: `hellio/processed`

### Other Emails

**Send to:**
- Any other address

**Agent Action:**
- Classify as: `OTHER` (with LLM reasoning)
- Create notification: "Unclassified Email: {subject}"
- Label: `hellio/processed`

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
