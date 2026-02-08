# Gmail Setup for Hellio HR Agent

This guide explains how to configure Gmail filters and labels for the Hellio HR email agent.

## Required Gmail Labels

The agent uses two labels to track email processing:

1. **`hellio/inbox`** - Applied by Gmail filters to route emails to the agent
2. **`hellio/processed`** - Applied by the agent after successful processing

## Step 1: Create Gmail Labels

1. Open Gmail: https://mail.google.com
2. Click **Settings** (gear icon) → **See all settings**
3. Go to **Labels** tab
4. Click **Create new label**
5. Create label: `hellio/inbox`
   - Check "Nest label under" and select "hellio" (creates parent label)
6. Click **Create new label**
7. Create label: `hellio/processed`
   - Check "Nest label under" and select "hellio"

You should now have:
```
📁 hellio/
  ├─ 📩 inbox
  └─ ✅ processed
```

## Step 2: Create Gmail Filter for Candidate Applications

This filter routes emails to `*+candidates@develeap.com` to the hellio system.

1. In Gmail, click the **search box** dropdown (down arrow)
2. Fill in filter criteria:
   ```
   To: *+candidates@develeap.com OR candidates@develeap.com
   ```
3. Click **Create filter**
4. Check these options:
   - ✅ **Apply the label:** `hellio/inbox`
   - ✅ **Never send it to Spam**
5. Click **Create filter**

**Test:**
- Send email to: `your-email+candidates@develeap.com`
- Gmail should automatically apply `hellio/inbox` label

## Step 3: Create Gmail Filter for Position Announcements

This filter routes emails to `*+positions@develeap.com` to the hellio system.

1. Click the search box dropdown again
2. Fill in filter criteria:
   ```
   To: *+positions@develeap.com OR positions@develeap.com
   ```
3. Click **Create filter**
4. Check these options:
   - ✅ **Apply the label:** `hellio/inbox`
   - ✅ **Never send it to Spam**
5. Click **Create filter**

**Test:**
- Send email to: `your-email+positions@develeap.com`
- Gmail should automatically apply `hellio/inbox` label

## Step 4: Verify Filter Configuration

1. Go to **Settings** → **Filters and Blocked Addresses**
2. You should see two filters:

**Filter 1: Candidate Applications**
```
Matches: to:(*+candidates@develeap.com OR candidates@develeap.com)
Do this: Apply label "hellio/inbox", Never send it to Spam
```

**Filter 2: Position Announcements**
```
Matches: to:(*+positions@develeap.com OR positions@develeap.com)
Do this: Apply label "hellio/inbox", Never send it to Spam
```

## Agent Query Logic

The agent polls Gmail with this query:

```
label:hellio/inbox -label:hellio/processed
```

This ensures:
- ✅ Only emails routed to hellio system are processed (`label:hellio/inbox`)
- ✅ Already processed emails are skipped (`-label:hellio/processed`)
- ✅ Idempotency: Same email is never processed twice

## Label Application Rules (STRICT)

The agent applies `hellio/processed` label **ONLY after ALL steps succeed:**

### Phase 3 MVP (Notify Only):
```
classify → notify → label
         ↓         ↓
      success  success
                  ↓
        apply hellio/processed
```

If notification fails → Email NOT labeled → Will retry on next poll

### Phase 5 (With Document Ingestion):
```
classify → ingest → notify → label
         ↓        ↓        ↓
      success  success  success
                         ↓
               apply hellio/processed
```

If ingestion fails → Email NOT labeled → Will retry on next poll

### Phase 6 (With Draft Creation):
```
classify → ingest → draft → notify → label
         ↓        ↓      ↓        ↓
      success  success success success
                                  ↓
                        apply hellio/processed
```

If draft creation fails → Email NOT labeled → Will retry on next poll

**Key Principle:** Label is applied **last**, after **all** processing steps complete successfully.

## Testing Email Routing

### Test 1: Candidate Application

```bash
# Send email via Gmail web or email client
To: your-email+candidates@develeap.com
Subject: Application for Frontend Developer
Body: Hi, I'm interested in the position...
Attachment: john-doe-cv.pdf (optional)

# Expected Gmail behavior:
# 1. Email arrives in inbox
# 2. Gmail filter applies "hellio/inbox" label (instant)
# 3. Email visible in Gmail with hellio/inbox label
```

### Test 2: Position Announcement

```bash
To: your-email+positions@develeap.com
Subject: New Opening: Senior Backend Engineer
Body: We need to hire a senior backend engineer...
Attachment: job-description.pdf (optional)

# Expected Gmail behavior:
# 1. Email arrives in inbox
# 2. Gmail filter applies "hellio/inbox" label (instant)
# 3. Email visible in Gmail with hellio/inbox label
```

### Test 3: Agent Processing

```bash
# Run agent (once OAuth is configured)
cd agent
python agent.py once

# Expected agent behavior:
# 1. Agent polls Gmail: label:hellio/inbox -label:hellio/processed
# 2. Agent fetches the test emails (max 5)
# 3. Agent classifies email based on +candidates@ or +positions@
# 4. Agent creates notification in backend
# 5. Agent applies "hellio/processed" label (ONLY if notification succeeded)

# Expected Gmail result:
# - Email now has TWO labels: hellio/inbox, hellio/processed
# - Next agent poll will skip this email (-label:hellio/processed)
```

### Test 4: Idempotency

```bash
# Run agent twice
python agent.py once  # Processes email, applies label
python agent.py once  # Skips already-labeled email

# Expected result:
# - Only 1 notification created (not 2)
# - Agent logs: "📭 No unread emails found" on second run
```

## Troubleshooting

### "No unread emails found"

**Possible causes:**
1. No emails with `hellio/inbox` label
2. All emails already have `hellio/processed` label
3. Gmail filters not configured

**Fix:**
- Send test email to `your-email+candidates@develeap.com`
- Check Gmail labels manually
- Verify filters exist in Settings → Filters

### "Agent processes same email multiple times"

**Possible cause:** Agent failing to apply `hellio/processed` label

**Fix:**
- Check agent logs for errors during notification creation
- Verify Gmail OAuth scopes include `gmail.modify` (for labeling)
- Ensure backend is running and accepting notifications

### "Gmail filter not applying hellio/inbox label"

**Possible causes:**
1. Filter criteria incorrect
2. Email sent to wrong address (missing +candidates or +positions)
3. Filter not saved

**Fix:**
- Go to Settings → Filters and verify filter exists
- Test with exact address: `your-email+candidates@develeap.com`
- Ensure filter has "Apply label: hellio/inbox" checked

## Production Considerations

### Security

- Use a dedicated Gmail account for the agent (not personal email)
- Enable 2FA on the Gmail account
- Restrict OAuth scopes to minimum required:
  - `gmail.readonly` - Read emails
  - `gmail.labels` - Read label list
  - `gmail.modify` - Apply labels
- Store refresh token securely (e.g., AWS Secrets Manager, not .env in production)

### Scalability

- Current setup polls every 60 seconds (good for <100 emails/day)
- For high volume (>1000 emails/day), migrate to Gmail Pub/Sub push notifications
- Monitor Gmail API quota: 1 billion quota units/day (fetch = 5 units/email)

### Monitoring

- Set up alerts for consecutive agent failures
- Track label application rate (should match email arrival rate)
- Monitor unlabeled emails in `hellio/inbox` (indicates processing failures)

## Related Documentation

- **Agent README:** `agent/README.md` - Agent setup and usage
- **HR Workflow:** `agent/config/hr_workflow.md` - Classification rules
- **Implementation Status:** `EXERCISE-6-IMPLEMENTATION-STATUS.md` - Project progress

## Gmail Plus Addressing

Gmail plus addressing (`+word`) allows email routing without creating multiple accounts:

- `john+candidates@develeap.com` → Routes to `john@develeap.com`
- `john+positions@develeap.com` → Routes to `john@develeap.com`
- `hr+candidates@develeap.com` → Routes to `hr@develeap.com`

All variants of `*+candidates@` route to the same inbox, but filters can differentiate them.

This allows:
- **One Gmail account** for all HR emails
- **Different routing** based on +candidates vs +positions
- **Easy testing** with your personal Gmail account
