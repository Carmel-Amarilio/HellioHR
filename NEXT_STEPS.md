# Next Steps: Exercise 6 Agent Testing

## Critical Fixes Applied ✅

1. **Gmail MCP Compliance** - Documented MCP integration status and migration path
2. **Security** - Removed all hard-coded credentials, use environment variables
3. **Gmail Query** - Tightened to `label:hellio/inbox -label:hellio/processed`
4. **Strict Labeling** - Apply `hellio/processed` ONLY after ALL steps succeed

## Before Running the Agent

### Step 1: Configure Gmail Filters (CRITICAL)

**See detailed guide:** `agent/GMAIL_SETUP.md`

**Quick setup:**
```
1. Create Gmail labels:
   - hellio/inbox
   - hellio/processed

2. Create Gmail filter for candidates:
   To: *+candidates@develeap.com OR candidates@develeap.com
   Action: Apply label "hellio/inbox"

3. Create Gmail filter for positions:
   To: *+positions@develeap.com OR positions@develeap.com
   Action: Apply label "hellio/inbox"

4. Test:
   Send email to: your-email+candidates@develeap.com
   Verify: Gmail automatically applies "hellio/inbox" label
```

### Step 2: Set Up OAuth Credentials

1. **Google Cloud Console:** https://console.cloud.google.com/
   - Create project: "Hellio HR Agent"
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Web Application)
   - Add redirect URI: `http://localhost:3000/oauth/callback`

2. **OAuth Playground:** https://developers.google.com/oauthplayground/
   - Select scopes: `gmail.readonly`, `gmail.labels`, `gmail.modify`
   - Authorize and get refresh token

### Step 3: Configure Environment Variables

**Backend (`backend/.env`):**
```bash
cd backend
cp .env.example .env

# Edit .env:
DATABASE_URL=mysql://hellio:helliopassword@localhost:3306/hellio_hr
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development

# Set a strong password for agent user:
AGENT_PASSWORD=<your-strong-password-here>
```

**Agent (`agent/.env`):**
```bash
cd agent
cp .env.example .env

# Edit .env:
BACKEND_URL=http://localhost:3000
AGENT_EMAIL=agent@hellio.hr
AGENT_PASSWORD=<same-as-backend>

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

ANTHROPIC_API_KEY=sk-ant-...

POLL_INTERVAL_SECONDS=60
MAX_EMAILS_PER_POLL=5
MAX_ITERATIONS=8
GMAIL_PROCESSED_LABEL=hellio/processed
```

### Step 4: Reseed Database

```bash
cd backend
npm run prisma:seed
```

This will create the agent@hellio.hr user with your new password.

### Step 5: Start Backend

```bash
# Start MySQL
docker-compose up -d mysql

# Start backend
cd backend
npm run dev
```

Verify:
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Step 6: Test Agent Authentication

```bash
export AGENT_PASSWORD="your-password"

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"agent@hellio.hr\",\"password\":\"$AGENT_PASSWORD\"}"

# Expected: {"token":"eyJ...","user":{...}}
```

## Running the Agent

### Install Python Dependencies

```bash
cd agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Run Single Iteration (Test Mode)

```bash
python agent.py once
```

**Expected output:**
```
Running single iteration test mode...
✓ Authenticated as agent@hellio.hr
📧 Fetching emails: query='label:hellio/inbox -label:hellio/processed', max=5
   MCP Server: @modelcontextprotocol/server-google-workspace
   TODO: Replace placeholder with actual MCP call
📭 No unread emails found
```

**Note:** Currently using placeholders. MCP integration requires OAuth setup.

### Send Test Email

```
To: your-email+candidates@develeap.com
Subject: Application for Frontend Developer
Body: Hi, I'm interested in the position. Please find my CV attached.
Attachment: sample-cv.pdf (optional)
```

**Expected Gmail behavior:**
1. Email arrives in inbox
2. Gmail filter applies `hellio/inbox` label (instant)
3. Email visible in Gmail with hellio/inbox label

### Run Agent Again

```bash
python agent.py once
```

**Expected behavior (once MCP is integrated):**
```
📧 Fetching emails: query='label:hellio/inbox -label:hellio/processed', max=5
📬 Found 1 unread email(s)

📧 Processing email: msg-abc123
   From: john@example.com
   Subject: Application for Frontend Developer
   ✓ Classified as: CANDIDATE_APPLICATION (deterministic: +candidates address)
   ✓ Created notification: New Candidate Application: John Doe
   ✓ Labeled email as processed (all steps succeeded)

✓ Processed: 1, ✗ Failed: 0
```

### Verify Database

```bash
# In MySQL
mysql -u hellio -p hellio_hr

SELECT id, type, title, created_at FROM notifications;
```

**Expected row:**
```
id: <uuid>
type: email_processed
title: New Candidate Application: John Doe
created_at: 2026-02-08 10:30:00
```

### Verify Gmail

Check the email in Gmail:
- Before: `[INBOX] [hellio/inbox]`
- After: `[INBOX] [hellio/inbox] [hellio/processed]` ✅

### Test Idempotency

```bash
python agent.py once
```

**Expected:**
```
📭 No unread emails found
```

Email already has `hellio/processed` label, so it's skipped. ✅

## Expected Behavior Summary

| Step | Action | Gmail Labels | Database | Agent Output |
|------|--------|--------------|----------|--------------|
| 1 | Send email to +candidates@ | `hellio/inbox` (filter applies) | - | - |
| 2 | Run `python agent.py once` | `hellio/inbox`, `hellio/processed` | 1 notification row | "✓ Processed: 1" |
| 3 | Run `python agent.py once` again | No change | No new rows | "📭 No unread emails" |

## Troubleshooting

### "No unread emails found"

**Check:**
1. Gmail filters configured? (see `agent/GMAIL_SETUP.md`)
2. Test email sent to `+candidates@` or `+positions@`?
3. Email has `hellio/inbox` label?
4. Email does NOT have `hellio/processed` label?

### "AGENT_PASSWORD not set in environment"

**Fix:**
```bash
# Set in agent/.env
AGENT_PASSWORD=your-password

# Or export temporarily:
export AGENT_PASSWORD="your-password"
python agent.py once
```

### "Authentication failed"

**Check:**
1. Backend running? `curl http://localhost:3000/health`
2. Database seeded? `cd backend && npm run prisma:seed`
3. Password matches in backend/.env and agent/.env?

### "Gmail MCP server not found"

**Current status:** MCP integration pending OAuth setup. Placeholders in place.

**Next steps:**
1. Complete OAuth configuration (Step 2 above)
2. Integrate Strands MCP bridge in `gmail_tools.py`
3. Replace placeholder returns with actual MCP calls

## Gmail MCP Integration TODO

Current implementation uses placeholders. To complete MCP integration:

1. **Configure OAuth** (this document, Step 2)
2. **Update `gmail_tools.py`:**
   - Replace `return []` with actual MCP calls
   - Use Strands MCP bridge: `mcp_gmail.search_messages()`
   - Test with real Gmail data

3. **Test end-to-end:**
   - Send email → Agent fetches → Classifies → Notifies → Labels
   - Verify idempotency
   - Verify error recovery

See: https://github.com/modelcontextprotocol/servers/tree/main/src/google-workspace

## Documentation References

- **Gmail Setup:** `agent/GMAIL_SETUP.md` - Complete filter configuration guide
- **Agent README:** `agent/README.md` - Full agent documentation
- **Implementation Status:** `EXERCISE-6-IMPLEMENTATION-STATUS.md` - Progress tracker
- **HR Workflow:** `agent/config/hr_workflow.md` - Classification rules

## Success Criteria

When everything is configured correctly:

✅ Gmail filters apply `hellio/inbox` label automatically
✅ Agent authenticates to backend
✅ Agent polls Gmail with correct query
✅ Email classified correctly (deterministic routing)
✅ Notification created in database
✅ Gmail label `hellio/processed` applied ONLY after notification succeeds
✅ Idempotency: Same email not processed twice
✅ Error recovery: Email retried if notification fails

Good luck! 🚀
