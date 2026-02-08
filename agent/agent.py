"""
Hellio HR Email Agent (Strands Framework)

Phase 3 MVP: Polls Gmail, classifies emails (deterministic), creates notifications.

This agent:
- Polls Gmail for unread emails (max 5 per poll)
- Classifies using deterministic routing (email address patterns)
- Creates notifications in backend for HR coordinator
- Labels processed emails in Gmail
- Does NOT ingest documents or create drafts (Phase 5-6)
"""

import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import agent tools
from tools.backend_api import get_backend_api, BackendAPIError
from tools.gmail_tools import fetch_emails, add_label, parse_email_address
from tools.classification import (
    classify_email,
    format_notification_message,
    EmailType
)

# Configuration from environment
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "60"))
MAX_EMAILS_PER_POLL = int(os.getenv("MAX_EMAILS_PER_POLL", "5"))
MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", "8"))
GMAIL_PROCESSED_LABEL = os.getenv("GMAIL_PROCESSED_LABEL", "hellio/processed")


def process_single_email(email: dict, backend_api) -> bool:
    """
    Process a single email: classify, notify, label.

    CRITICAL RULE: Apply hellio/processed label ONLY after ALL steps succeed:
    - Phase 3 MVP: classify → notify → label
    - Phase 5: classify → ingest → notify → label
    - Phase 6: classify → ingest → draft → notify → label

    If ANY step fails, do NOT label email (allows retry on next poll).

    Args:
        email: Email object from Gmail
        backend_api: BackendAPI instance

    Returns:
        True if email was processed successfully and labeled, False otherwise
    """
    try:
        email_id = email['id']
        print(f"\n📧 Processing email: {email_id}")
        print(f"   From: {email.get('from', 'unknown')}")
        print(f"   Subject: {email.get('subject', '(no subject)')}")

        # Step 1: Classify email
        email_type, classification_method, extracted_info = classify_email(email)
        print(f"   ✓ Classified as: {email_type} ({classification_method})")

        # Step 2: Format notification
        notification_data = format_notification_message(
            email,
            email_type,
            classification_method
        )

        # Step 3: Create notification in backend
        metadata = {
            "emailId": email_id,
            "type": email_type,
            "sender": extracted_info['sender'],
            "subject": extracted_info['subject'],
            "attachmentCount": extracted_info['attachment_count'],
            "classificationMethod": classification_method
        }

        notification = backend_api.create_notification(
            title=notification_data['title'],
            message=notification_data['message'],
            notification_type="email_processed",
            metadata=metadata
        )

        # Step 4: Label ONLY after ALL steps succeed (MVP: classify + notify)
        # Future phases will add: ingest (Phase 5) and draft (Phase 6) before labeling
        if notification.get('id'):
            add_label(email_id, GMAIL_PROCESSED_LABEL)
            print(f"   ✓ Labeled email as processed (all steps succeeded)")
            return True
        else:
            print(f"   ✗ Notification creation failed, email NOT labeled")
            print(f"   → Email will be retried on next poll")
            return False

    except BackendAPIError as e:
        print(f"   ✗ Backend API error: {e}")
        print(f"   → Email NOT labeled, will retry on next poll")
        return False
    except Exception as e:
        print(f"   ✗ Unexpected error: {e}")
        print(f"   → Email NOT labeled, will retry on next poll")
        return False


def agent_main_loop():
    """
    Main agent loop: Poll Gmail → Classify → Notify → Label.

    Runs for MAX_ITERATIONS, then exits gracefully.
    """
    print("=" * 60)
    print("Hellio HR Email Agent (Phase 3 MVP - Notify Only)")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Poll interval: {POLL_INTERVAL}s")
    print(f"Max emails per poll: {MAX_EMAILS_PER_POLL}")
    print(f"Max iterations: {MAX_ITERATIONS}")
    print("=" * 60)

    # Initialize backend API
    try:
        backend_api = get_backend_api()
        if not backend_api.health_check():
            print("✗ Backend health check failed. Is the backend running?")
            return
        print("✓ Backend connection established\n")
    except Exception as e:
        print(f"✗ Failed to connect to backend: {e}")
        return

    # Main polling loop
    iteration = 0
    while iteration < MAX_ITERATIONS:
        iteration += 1
        print(f"\n{'='*60}")
        print(f"Iteration {iteration}/{MAX_ITERATIONS}")
        print(f"{'='*60}")

        try:
            # Fetch hellio inbox emails (excluding already processed)
            # This requires Gmail filters to label incoming emails with "hellio/inbox"
            query = f"label:hellio/inbox -label:{GMAIL_PROCESSED_LABEL}"
            emails = fetch_emails(
                query=query,
                max_results=MAX_EMAILS_PER_POLL
            )

            if not emails:
                print("📭 No unread emails found")
            else:
                print(f"📬 Found {len(emails)} unread email(s)")

                # Process each email (with safety limit)
                processed_count = 0
                failed_count = 0

                for email in emails[:MAX_EMAILS_PER_POLL]:  # Safety limit
                    success = process_single_email(email, backend_api)
                    if success:
                        processed_count += 1
                    else:
                        failed_count += 1

                print(f"\n✓ Processed: {processed_count}, ✗ Failed: {failed_count}")

        except KeyboardInterrupt:
            print("\n\n⚠️  Agent interrupted by user. Shutting down gracefully...")
            break
        except Exception as e:
            print(f"\n✗ Error in main loop: {e}")

        # Wait before next poll (unless this was the last iteration)
        if iteration < MAX_ITERATIONS:
            print(f"\n⏸️  Waiting {POLL_INTERVAL}s until next poll...")
            time.sleep(POLL_INTERVAL)

    print("\n" + "=" * 60)
    print("Agent shutdown complete")
    print("=" * 60)


def agent_once():
    """
    Run agent for a single iteration (for testing).
    """
    print("Running single iteration test mode...")
    backend_api = get_backend_api()

    query = f"label:hellio/inbox -label:{GMAIL_PROCESSED_LABEL}"
    emails = fetch_emails(query=query, max_results=MAX_EMAILS_PER_POLL)

    if not emails:
        print("📭 No unread emails found")
        return

    print(f"📬 Found {len(emails)} unread email(s)")
    for email in emails[:MAX_EMAILS_PER_POLL]:
        process_single_email(email, backend_api)


if __name__ == "__main__":
    import sys

    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "once":
        agent_once()
    else:
        agent_main_loop()
