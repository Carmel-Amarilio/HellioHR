"""
Email classification logic for the HR agent.
Implements deterministic routing + LLM fallback.
"""

from typing import Dict, Any, Literal
from .gmail_tools import parse_email_address

EmailType = Literal["CANDIDATE_APPLICATION", "POSITION_ANNOUNCEMENT", "OTHER"]


def classify_email_deterministic(email: Dict[str, Any]) -> tuple[EmailType, str]:
    """
    Classify email using deterministic routing rules (email address patterns).

    This is the PRIMARY classification method and should be used BEFORE
    LLM classification. It's fast, free, and accurate for properly routed emails.

    Args:
        email: Email object with 'to', 'from', 'subject', 'body'

    Returns:
        Tuple of (EmailType, classification_method)
        - EmailType: One of CANDIDATE_APPLICATION, POSITION_ANNOUNCEMENT, OTHER
        - classification_method: String describing how classification was done

    Examples:
        >>> classify_email_deterministic({'to': 'john+candidates@develeap.com'})
        ('CANDIDATE_APPLICATION', 'deterministic: +candidates address')

        >>> classify_email_deterministic({'to': 'hr+positions@develeap.com'})
        ('POSITION_ANNOUNCEMENT', 'deterministic: +positions address')
    """
    to_address = parse_email_address(email.get('to', ''))

    # Rule 1: Candidate applications
    if '+candidates@' in to_address or to_address == 'candidates@develeap.com':
        return ("CANDIDATE_APPLICATION", "deterministic: +candidates address")

    # Rule 2: Position announcements
    if '+positions@' in to_address or to_address == 'positions@develeap.com':
        return ("POSITION_ANNOUNCEMENT", "deterministic: +positions address")

    # Rule 3: All other emails require LLM classification
    return ("OTHER", "deterministic: no routing pattern matched")


def classify_email_with_llm(email: Dict[str, Any], llm_classify_fn) -> tuple[EmailType, str]:
    """
    Classify email using LLM when deterministic routing fails.

    This is ONLY used for emails that don't match deterministic patterns.
    Uses Amazon Nova Lite for cost-effective classification (~$0.0002/email).

    Args:
        email: Email object with 'to', 'from', 'subject', 'body'
        llm_classify_fn: Strands agent LLM function for classification

    Returns:
        Tuple of (EmailType, classification_method)
    """
    subject = email.get('subject', '')
    sender = email.get('from', '')
    body_preview = email.get('body', '')[:500]  # First 500 chars

    prompt = f"""You are an HR email classifier. Analyze this email and determine if it is:
1. CANDIDATE_APPLICATION - Person applying for a job, submitting CV, expressing interest
2. POSITION_ANNOUNCEMENT - Job opening announcement, hiring manager requesting to post a role
3. OTHER - Any other email (general inquiry, spam, internal communication)

Email details:
Subject: {subject}
From: {sender}
Body preview: {body_preview}

Respond with ONLY one of: CANDIDATE_APPLICATION, POSITION_ANNOUNCEMENT, OTHER
If uncertain, respond with OTHER."""

    # Call LLM via Strands agent
    # TODO: Integrate with actual Strands LLM call
    # response = llm_classify_fn(prompt)
    # email_type = response.strip()

    # Placeholder (will be replaced with actual LLM call)
    email_type = "OTHER"

    return (email_type, f"llm: classified as {email_type}")


def classify_email(
    email: Dict[str, Any],
    llm_classify_fn=None
) -> tuple[EmailType, str, Dict[str, Any]]:
    """
    Full email classification pipeline: deterministic first, LLM fallback.

    Args:
        email: Email object with 'to', 'from', 'subject', 'body'
        llm_classify_fn: Optional LLM function for fallback classification

    Returns:
        Tuple of (EmailType, classification_method, extracted_info)
        - EmailType: One of CANDIDATE_APPLICATION, POSITION_ANNOUNCEMENT, OTHER
        - classification_method: String describing classification approach
        - extracted_info: Dict with sender, subject, attachment count, etc.
    """
    # Step 1: Try deterministic classification
    email_type, method = classify_email_deterministic(email)

    # Step 2: If deterministic returns OTHER and LLM is available, try LLM
    if email_type == "OTHER" and llm_classify_fn is not None:
        email_type, method = classify_email_with_llm(email, llm_classify_fn)

    # Step 3: Extract metadata
    extracted_info = {
        "sender": email.get('from', ''),
        "subject": email.get('subject', ''),
        "to": email.get('to', ''),
        "received_at": email.get('date', ''),
        "attachment_count": len(email.get('attachments', [])),
        "has_body": bool(email.get('body', '').strip())
    }

    return (email_type, method, extracted_info)


def format_notification_message(
    email: Dict[str, Any],
    email_type: EmailType,
    classification_method: str
) -> Dict[str, str]:
    """
    Format notification title and message for HR coordinator.

    Args:
        email: Email object
        email_type: Classified email type
        classification_method: How email was classified

    Returns:
        Dict with 'title' and 'message' keys
    """
    sender = email.get('from', 'Unknown')
    subject = email.get('subject', '(no subject)')
    attachment_count = len(email.get('attachments', []))

    if email_type == "CANDIDATE_APPLICATION":
        # Try to extract candidate name from sender
        if '<' in sender:
            name = sender[:sender.index('<')].strip()
        else:
            name = sender

        title = f"New Candidate Application: {name}"
        message = f"""From: {sender}
Subject: {subject}

Classification: Candidate Application (via {classification_method})
Attachments: {attachment_count} file(s)

Action Required: Review email in Gmail and decide next steps."""

    elif email_type == "POSITION_ANNOUNCEMENT":
        # Try to extract position from subject
        position_title = subject[:50] + "..." if len(subject) > 50 else subject

        title = f"New Position Announcement: {position_title}"
        message = f"""From: {sender}
Subject: {subject}

Classification: Position Announcement (via {classification_method})
Attachments: {attachment_count} file(s)

Action Required: Review email in Gmail and create position in system."""

    else:  # OTHER
        title = f"Unclassified Email: {subject[:30]}"
        message = f"""From: {sender}
Subject: {subject}

Classification: Other (via {classification_method})

Action Required: Review email manually to determine appropriate action."""

    return {"title": title, "message": message}
