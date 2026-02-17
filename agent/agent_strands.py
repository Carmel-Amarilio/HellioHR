"""
Hellio HR Email Agent - Strands Framework Implementation

A proper Strands-based autonomous agent that:
- Monitors Gmail for candidate applications and position announcements
- Classifies emails intelligently (deterministic + LLM fallback)
- Ingests CVs and job descriptions via backend API
- Creates draft replies (never auto-sends)
- Notifies HR coordinators for human approval

Strands orchestrates the workflow, existing tools provide the capabilities.
"""

import os
from dotenv import load_dotenv
from strands import Agent, tool

# Load environment variables
load_dotenv()

# Import existing tool implementations
from tools.bedrock_client import get_bedrock_client
from tools.backend_api import get_backend_api, BackendAPIError
from tools.gmail_tools import (
    fetch_emails as gmail_fetch_emails,
    add_label as gmail_add_label,
    download_attachment as gmail_download_attachment,
    create_draft as gmail_create_draft,
    parse_email_address,
    extract_name_from_email
)
from tools.classification import classify_email, format_notification_message
from tools.templates import render_template

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
MAX_TURNS = int(os.getenv("MAX_TURNS", "8"))
MAX_EMAILS_PER_RUN = int(os.getenv("MAX_EMAILS_PER_RUN", "5"))
GMAIL_PROCESSED_LABEL = os.getenv("GMAIL_PROCESSED_LABEL", "hellio/processed")
GMAIL_INBOX_LABEL = os.getenv("GMAIL_INBOX_LABEL", "hellio/inbox")

# Initialize backend API connection (singleton)
backend_api = get_backend_api()


# =============================================================================
# Strands Tools - Wrapping existing functionality
# =============================================================================

@tool
def check_backend_health() -> dict:
    """
    Check if the backend API is responding.

    Returns:
        dict: {"healthy": bool, "url": str}
    """
    try:
        is_healthy = backend_api.health_check()
        return {
            "healthy": is_healthy,
            "url": BACKEND_URL,
            "message": "Backend is responding" if is_healthy else "Backend is not responding"
        }
    except Exception as e:
        return {
            "healthy": False,
            "url": BACKEND_URL,
            "error": str(e)
        }


@tool
def fetch_unprocessed_emails(max_results: int = 5) -> dict:
    """
    Fetch unprocessed emails from Gmail inbox.

    Args:
        max_results: Maximum number of emails to fetch (default 5, max 10 for safety)

    Returns:
        dict: {
            "count": int,
            "emails": [{"id": str, "from": str, "subject": str, "snippet": str, "attachments": [...]}]
        }
    """
    # Safety limit
    max_results = min(max_results, 10)

    query = f"label:{GMAIL_INBOX_LABEL} -label:{GMAIL_PROCESSED_LABEL}"

    try:
        emails = gmail_fetch_emails(query=query, max_results=max_results)
        return {
            "count": len(emails),
            "emails": emails[:max_results]  # Additional safety
        }
    except Exception as e:
        return {
            "count": 0,
            "emails": [],
            "error": str(e)
        }


@tool
def classify_email_type(email_data: dict) -> dict:
    """
    Classify an email as CANDIDATE_APPLICATION, POSITION_ANNOUNCEMENT, or OTHER.
    Uses deterministic routing (email address patterns) with LLM fallback.

    Args:
        email_data: Email dict with 'from', 'to', 'subject', 'snippet'

    Returns:
        dict: {
            "type": str,  # "CANDIDATE_APPLICATION" | "POSITION_ANNOUNCEMENT" | "OTHER"
            "method": str,  # "deterministic" | "llm"
            "confidence": str,  # "high" | "medium" | "low"
            "extracted_info": {...}
        }
    """
    try:
        email_type, method, extracted_info = classify_email(email_data)

        # Determine confidence based on method
        confidence = "high" if method == "deterministic" else "medium"

        return {
            "type": email_type,
            "method": method,
            "confidence": confidence,
            "extracted_info": extracted_info
        }
    except Exception as e:
        return {
            "type": "OTHER",
            "method": "error",
            "confidence": "low",
            "error": str(e)
        }


@tool
def process_candidate_application(email_id: str, email_from: str, attachment_id: str = None, attachment_filename: str = None) -> dict:
    """
    Process a candidate application email:
    1. Download CV attachment (if provided)
    2. Upload to backend for extraction (Bedrock extracts candidate data from CV)
    3. Create candidate from extracted CV data

    Args:
        email_id: Gmail message ID
        email_from: Sender email address (fallback if CV extraction fails)
        attachment_id: Gmail attachment ID
        attachment_filename: Attachment filename

    Returns:
        dict: {
            "success": bool,
            "candidate_id": str,
            "document_id": str,
            "message": str
        }
    """
    try:
        sender_email = parse_email_address(email_from)
        sender_name = extract_name_from_email(email_from)

        # Create or get candidate with sender info as placeholder
        # Backend will update with CV data after extraction
        candidate = backend_api.create_or_get_candidate(
            email=sender_email,
            name=sender_name
        )
        candidate_id = candidate['id']

        document_id = None

        # Download and upload CV (backend extracts and updates candidate)
        if attachment_id and attachment_filename:
            # Download CV from Gmail using correct attachment_id
            attachment_data = gmail_download_attachment(email_id, attachment_id, attachment_filename)

            if attachment_data:
                # Upload CV - backend will:
                # 1. Extract data from CV using Bedrock
                # 2. Update candidate.email with CV email (if found)
                # 3. Update candidate.name, phone, skills from CV
                upload_result = backend_api.upload_document(
                    candidate_id=candidate_id,
                    file_content=attachment_data,
                    filename=attachment_filename
                )
                document_id = upload_result['document']['id']
                print(f"   [BEDROCK] CV extracted - candidate updated with CV data")

        return {
            "success": True,
            "candidate_id": candidate_id,
            "document_id": document_id,
            "message": f"Candidate processed - data extracted from CV"
        }
    except BackendAPIError as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Backend API error during candidate processing"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Unexpected error during candidate processing"
        }


@tool
def process_position_announcement(email_subject: str, email_body: str, email_from: str) -> dict:
    """
    Process a position announcement email:
    1. Extract position title, department, and description from subject/body
    2. Create the position in the backend database

    Args:
        email_subject: Email subject line (often contains position title)
        email_body: Full email body text with job description
        email_from: Sender email address (hiring manager)

    Returns:
        dict: {
            "success": bool,
            "position_id": str,
            "title": str,
            "message": str
        }
    """
    try:
        # Extract title from subject — strip common prefixes
        raw_title = email_subject
        for prefix in ["New Position:", "Job Opening:", "Position:", "Role:", "Hiring:"]:
            if raw_title.lower().startswith(prefix.lower()):
                raw_title = raw_title[len(prefix):].strip()
                break
        title = raw_title[:200]  # Trim to safe length

        # Use body as description; fall back to subject if body is empty
        description = email_body.strip() if email_body.strip() else email_subject

        # Department is not always in the email — default to "Engineering" so the
        # position is usable. The HR coordinator can update it from the UI.
        department = "Engineering"

        position = backend_api.create_position(
            title=title,
            department=department,
            description=description
        )

        return {
            "success": True,
            "position_id": position['id'],
            "title": position['title'],
            "message": f"Position '{title}' created in database"
        }

    except BackendAPIError as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Backend API error during position processing"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Unexpected error during position processing"
        }


@tool
def create_notification(title: str, message: str, metadata: dict = None) -> dict:
    """
    Create a notification in the backend for HR coordinator.

    Args:
        title: Notification title
        message: Notification message body
        metadata: Optional metadata (emailId, candidateId, etc.)

    Returns:
        dict: {"success": bool, "notification_id": str}
    """
    try:
        notification = backend_api.create_notification(
            title=title,
            message=message,
            notification_type="email_processed",
            metadata=metadata or {}
        )

        return {
            "success": True,
            "notification_id": notification['id'],
            "message": "Notification created successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to create notification"
        }


@tool
def mark_email_processed(email_id: str) -> dict:
    """
    Mark an email as processed by adding the 'hellio/processed' label.
    This prevents reprocessing on subsequent agent runs.

    Args:
        email_id: Gmail message ID

    Returns:
        dict: {"success": bool, "message": str}
    """
    try:
        gmail_add_label(email_id, GMAIL_PROCESSED_LABEL)
        return {
            "success": True,
            "message": f"Email {email_id} marked as processed"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to mark email as processed"
        }


@tool
def create_draft_reply(
    email_id: str,
    recipient_email: str,
    template_name: str,
    template_vars: dict
) -> dict:
    """
    Create a draft email reply using a template.
    NEVER sends the email - only creates a draft for human review.

    Args:
        email_id: Gmail message ID to reply to
        recipient_email: Email address of recipient
        template_name: Name of template (e.g., 'candidate_welcome')
        template_vars: Variables to fill into template (e.g., {'candidate_name': 'Jane', ...})

    Returns:
        dict: {"success": bool, "draft_id": str, "message": str}
    """
    try:
        # Render template with variables
        rendered = render_template(template_name, template_vars)
        if not rendered:
            return {
                "success": False,
                "error": f"Template '{template_name}' not found or failed to render",
                "message": "Failed to render email template"
            }

        # Create draft in Gmail
        draft_result = gmail_create_draft(
            email_id=email_id,
            to=recipient_email,
            subject=rendered['subject'],
            body=rendered['body'],
            in_reply_to=email_id
        )

        if draft_result.get('success'):
            return {
                "success": True,
                "draft_id": draft_result['draft_id'],
                "message": f"Draft created for {recipient_email}"
            }
        else:
            return {
                "success": False,
                "error": draft_result.get('error', 'Unknown error'),
                "message": "Failed to create Gmail draft"
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Unexpected error creating draft"
        }


# =============================================================================
# Strands Agent Definition
# =============================================================================

# System prompt following HR workflow best practices
SYSTEM_PROMPT = """
You are an intelligent HR email assistant for Hellio HR.

Your responsibilities:
1. Monitor Gmail inbox for new candidate applications and position announcements
2. Classify emails intelligently (use email patterns like +candidates@ or +positions@)
3. Process candidate CVs by ingesting them into the database
4. Create draft email replies using templates (NEVER send automatically)
5. Create notifications for HR coordinators
6. Mark processed emails to avoid duplicates

CRITICAL RULES:
- NEVER send emails automatically - we ONLY create drafts for human approval
- ALL draft replies must be reviewed and sent manually by humans from Gmail
- Process a MAXIMUM of 5 emails per run to avoid overwhelming the system
- Always mark emails as processed ONLY after all steps succeed
- If any step fails, do NOT mark the email as processed (allows retry)
- Create clear notifications explaining what happened and what action is needed

WORKFLOW:
1. Check backend health first
2. Fetch unprocessed emails (max 5)
3. For each email:
   a. Classify email type (candidate application, position announcement, or other)
   b. If candidate application:
      - Download CV attachment if present
      - Create/get candidate record
      - Upload document for ingestion
      - Create draft reply using template (NEVER send)
      - Create notification for HR coordinator (include draft ID)
      - Mark email as processed ONLY if all steps succeeded
   c. If position announcement:
      - Create notification for manual review (ingestion not automated yet)
      - Mark as processed
   d. If other:
      - Create notification for manual classification
      - Mark as processed

DETERMINISTIC ROUTING RULES:
- Email to *+candidates@develeap.com → CANDIDATE_APPLICATION
- Email to *+positions@develeap.com → POSITION_ANNOUNCEMENT
- All other emails → OTHER (flag for manual review)

Be thorough, safe, and always keep humans in the loop for final decisions.
"""

# Strands Tools are defined above with @tool decorator
# We use these tools in a manual, deterministic workflow
# This avoids relying on Strands' LLM orchestration and streaming API
#
# LLM (AWS Bedrock Nova Lite) is called ONLY for classifying ambiguous emails
# via our custom bedrock_client.py (non-streaming, same as backend)


# =============================================================================
# Agent Execution
# =============================================================================

def run_agent_once():
    """
    Run the agent for a single iteration using deterministic workflow.
    Uses Strands tools (@tool decorated functions) manually.
    Calls AWS Bedrock (via boto3, non-streaming) only for classification of ambiguous emails.
    """
    print("=" * 70)
    print("Hellio HR Email Agent (Strands Framework + AWS Bedrock)")
    print("=" * 70)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Max emails per run: {MAX_EMAILS_PER_RUN}")
    print(f"Bedrock model: {os.getenv('BEDROCK_MODEL', 'amazon.nova-lite-v1:0')}")
    print("=" * 70)
    print()

    try:
        # Step 1: Check backend health
        print("1. Checking backend health...")
        health_result = check_backend_health()
        print(f"   {health_result.get('message', 'Unknown status')}")
        print()

        if not health_result.get('healthy', False):
            print("ERROR Backend is not healthy. Aborting.")
            return {"status": "error", "error": "Backend not healthy"}

        # Step 2: Fetch unprocessed emails
        print(f"2. Fetching up to {MAX_EMAILS_PER_RUN} unprocessed emails from Gmail...")
        emails_result = fetch_unprocessed_emails(max_results=MAX_EMAILS_PER_RUN)
        email_count = emails_result.get('count', 0)
        emails = emails_result.get('emails', [])
        print(f"   Found {email_count} unprocessed email(s)")
        print()

        if email_count == 0:
            print("OK No emails to process. Exiting.")
            return {"status": "success", "processed": 0}

        # Step 3: Process each email
        processed_count = 0
        for i, email in enumerate(emails, 1):
            print(f"{'='*70}")
            print(f"Processing email {i}/{email_count}")
            print(f"{'='*70}")
            print(f"   From: {email.get('from', 'Unknown')}")
            print(f"   Subject: {email.get('subject', '(no subject)')}")
            print()

            try:
                # Classify email (deterministic first, Bedrock fallback)
                print("   3a. Classifying email type...")
                classification = classify_email_type(email)
                email_type = classification.get('type', 'OTHER')
                method = classification.get('method', 'unknown')
                print(f"       Type: {email_type}")
                print(f"       Method: {method}")
                print()

                # Process based on type
                candidate_id = None
                position_result = {"success": False}
                draft_id = None

                if email_type == "CANDIDATE_APPLICATION":
                    print("   3b. Processing candidate application...")
                    # Check if email has attachments
                    attachments = email.get('attachments', [])
                    if attachments:
                        attachment = attachments[0]  # Max 1 attachment
                        result = process_candidate_application(
                            email_id=email['id'],
                            email_from=email['from'],
                            attachment_id=attachment.get('id'),
                            attachment_filename=attachment.get('filename')
                        )
                        if result.get('success'):
                            candidate_id = result.get('candidate_id')
                            print(f"       + Candidate created: {candidate_id}")
                            if result.get('document_id'):
                                print(f"       + Document uploaded: {result.get('document_id')}")
                        else:
                            print(f"       - Error: {result.get('message')}")
                            continue  # Don't mark as processed if failed
                    else:
                        print("       WARNING No CV attachment found")
                    print()

                    # Create draft reply for candidate
                    print("   3c. Creating draft reply...")
                    sender_email = parse_email_address(email.get('from', ''))
                    sender_name = extract_name_from_email(email.get('from', ''))

                    draft_result = create_draft_reply(
                        email_id=email['id'],
                        recipient_email=sender_email,
                        template_name='candidate_welcome_no_position',
                        template_vars={
                            'candidate_name': sender_name
                        }
                    )

                    if draft_result.get('success'):
                        draft_id = draft_result.get('draft_id')
                        print(f"       + Draft created: {draft_id}")
                    else:
                        print(f"       - Warning: Draft creation failed: {draft_result.get('message')}")
                        # Don't fail the whole process if draft fails
                    print()

                elif email_type == "POSITION_ANNOUNCEMENT":
                    print("   3b. Processing position announcement...")
                    position_result = process_position_announcement(
                        email_subject=email.get('subject', ''),
                        email_body=email.get('body', ''),
                        email_from=email.get('from', '')
                    )

                    if position_result.get('success'):
                        position_id = position_result.get('position_id')
                        position_title = position_result.get('title', '')
                        print(f"       + Position created: {position_id} ({position_title})")
                    else:
                        print(f"       - Error: {position_result.get('message')}")
                        continue  # Don't mark as processed if failed
                    print()

                    # Create draft reply to hiring manager
                    print("   3c. Creating draft reply to hiring manager...")
                    sender_email = parse_email_address(email.get('from', ''))

                    draft_result = create_draft_reply(
                        email_id=email['id'],
                        recipient_email=sender_email,
                        template_name='position_acknowledgment',
                        template_vars={
                            'position_title': position_title,
                            'department': 'Engineering',
                            'candidate_match_info': ''
                        }
                    )

                    if draft_result.get('success'):
                        draft_id = draft_result.get('draft_id')
                        print(f"       + Draft created: {draft_id}")
                    else:
                        print(f"       - Warning: Draft creation failed: {draft_result.get('message')}")
                    print()

                # Create notification
                print("   3d. Creating notification for HR coordinator...")

                # Build notification message
                notif_message = f"From: {email.get('from')}\nSubject: {email.get('subject')}"
                if candidate_id:
                    notif_message += f"\n\nCandidate ID: {candidate_id}"
                if email_type == "POSITION_ANNOUNCEMENT" and position_result.get('success'):
                    notif_message += f"\n\nPosition ID: {position_result.get('position_id')}"
                    notif_message += f"\nTitle: {position_result.get('title')}"
                if draft_id:
                    notif_message += f"\nDraft reply created - check Gmail drafts"

                notif_result = create_notification(
                    title=f"New {email_type.replace('_', ' ').title()}",
                    message=notif_message,
                    metadata={
                        'emailId': email.get('id'),
                        'type': email_type,
                        'method': method,
                        'candidateId': candidate_id,
                        'positionId': position_result.get('position_id') if email_type == "POSITION_ANNOUNCEMENT" and position_result.get('success') else None,
                        'draftId': draft_id
                    }
                )
                if notif_result.get('success'):
                    print(f"       + Notification created: {notif_result.get('notification_id')}")
                else:
                    print(f"       - Error: {notif_result.get('message')}")
                    continue  # Don't mark as processed if notification failed
                print()

                # Mark as processed ONLY if all steps succeeded
                print("   3e. Marking email as processed...")
                mark_result = mark_email_processed(email['id'])
                if mark_result.get('success'):
                    print(f"       + Email marked as processed")
                    processed_count += 1
                else:
                    print(f"       - Failed to mark: {mark_result.get('message')}")
                print()

            except Exception as e:
                print(f"   ERROR Error processing email: {e}")
                import traceback
                traceback.print_exc()
                continue  # Don't mark as processed if error occurred

        print("=" * 70)
        print(f"OK Agent execution completed: {processed_count}/{email_count} emails processed")
        print("=" * 70)
        return {"status": "success", "processed": processed_count, "total": email_count}

    except KeyboardInterrupt:
        print("\n\nWARNING Agent interrupted by user. Shutting down gracefully...")
        return {"status": "interrupted"}
    except Exception as e:
        print(f"\n\nERROR Agent execution failed: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


def run_agent_continuous(poll_interval: int = 60, max_iterations: int = 5):
    """
    Run the agent continuously with polling intervals.

    Args:
        poll_interval: Seconds between runs
        max_iterations: Maximum number of polling iterations
    """
    import time

    print("=" * 70)
    print("Hellio HR Agent - Continuous Mode")
    print("=" * 70)
    print(f"Poll interval: {poll_interval}s")
    print(f"Max iterations: {max_iterations}")
    print("=" * 70)
    print()

    for iteration in range(1, max_iterations + 1):
        print(f"\n{'='*70}")
        print(f"Iteration {iteration}/{max_iterations}")
        print(f"{'='*70}\n")

        run_agent_once()

        if iteration < max_iterations:
            print(f"\nWaiting {poll_interval}s until next poll...")
            time.sleep(poll_interval)

    print("\n" + "=" * 70)
    print("Continuous polling complete")
    print("=" * 70)


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "once":
            run_agent_once()
        elif sys.argv[1] == "continuous":
            poll_interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60
            max_iterations = int(sys.argv[3]) if len(sys.argv) > 3 else 5
            run_agent_continuous(poll_interval, max_iterations)
        else:
            print("Usage:")
            print("  python agent_strands.py once                    # Run once")
            print("  python agent_strands.py continuous [interval] [iterations]")
    else:
        # Default: run once
        run_agent_once()
