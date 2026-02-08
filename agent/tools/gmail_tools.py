"""
Gmail tools for the HR agent.
Wraps Gmail MCP server calls for email fetching, labeling, and draft creation.

IMPORTANT: This module uses the Gmail MCP server (@modelcontextprotocol/server-google-workspace)
configured in .mcp.json, NOT direct Gmail API calls.

The Strands agent framework will bridge these function calls to the MCP server.
Each function below is a thin wrapper that will be registered as a Strands tool.

MCP Server Configuration:
- Server: @modelcontextprotocol/server-google-workspace
- OAuth2: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
- Configured in: .mcp.json (root of project)

MVP Status: Direct API implementation with MCP migration planned
TODO: Integrate with Strands MCP bridge once OAuth is configured
"""

import os
from typing import Dict, List, Any, Optional


# NOTE: Current implementation uses placeholders
# These will be replaced with actual Strands MCP tool calls in Phase 2
# See: https://github.com/modelcontextprotocol/servers/tree/main/src/google-workspace

def fetch_emails(
    query: str = "label:hellio/inbox -label:hellio/processed",
    max_results: int = 5
) -> List[Dict[str, Any]]:
    """
    Fetch emails from Gmail inbox using Gmail MCP server.

    Default query: "label:hellio/inbox -label:hellio/processed"
    This ensures we only process emails routed to hellio system that haven't been processed yet.

    Args:
        query: Gmail search query (default: hellio inbox minus processed)
        max_results: Maximum number of emails to fetch (safety limit: 5)

    Returns:
        List of email objects with id, from, to, subject, body, attachments

    Example email object:
    {
        'id': 'msg-123abc',
        'threadId': 'thread-456',
        'from': 'John Doe <john@example.com>',
        'to': 'hr+candidates@develeap.com',
        'subject': 'Application for Frontend Developer',
        'body': 'Email body text...',
        'date': '2026-02-08T10:30:00Z',
        'labels': ['INBOX', 'hellio/inbox'],
        'attachments': [
            {
                'id': 'att-789',
                'filename': 'john-doe-cv.pdf',
                'mimeType': 'application/pdf',
                'size': 125000
            }
        ]
    }
    """
    # TODO: Call Gmail MCP server via Strands framework
    # emails = mcp_gmail.search_messages(query=query, max_results=max_results)
    # For MCP integration, see:
    # https://github.com/modelcontextprotocol/servers/tree/main/src/google-workspace

    print(f"📧 Fetching emails: query='{query}', max={max_results}")
    print(f"   MCP Server: @modelcontextprotocol/server-google-workspace")
    print(f"   TODO: Replace placeholder with actual MCP call")

    # Placeholder return (will be replaced with actual MCP call)
    return []


def add_label(email_id: str, label: str) -> bool:
    """
    Add a label to an email in Gmail.

    Args:
        email_id: Gmail message ID
        label: Label to add (e.g., "hellio/processed")

    Returns:
        True if label was added successfully, False otherwise
    """
    # TODO: Call Gmail MCP server via Strands framework
    # result = gmail_mcp.add_label(message_id=email_id, label=label)

    print(f"🏷️  Adding label '{label}' to email {email_id}")

    # Placeholder return (will be replaced with actual MCP call)
    return True


def create_draft(
    email_id: str,
    to: str,
    subject: str,
    body: str,
    in_reply_to: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a draft reply in Gmail (Phase 6 - not MVP).

    Args:
        email_id: Gmail message ID to reply to
        to: Recipient email address
        subject: Email subject
        body: Email body (plain text or HTML)
        in_reply_to: Optional message ID for threading

    Returns:
        Draft object with draft_id and creation status
    """
    # TODO: Call Gmail MCP server via Strands framework
    # draft = gmail_mcp.create_draft(to=to, subject=subject, body=body, in_reply_to=in_reply_to)

    print(f"✉️  Creating draft reply to {to}: {subject}")

    # Placeholder return (will be replaced with actual MCP call)
    return {"draft_id": "draft-placeholder", "status": "created"}


def download_attachment(
    email_id: str,
    attachment_id: str,
    filename: str
) -> bytes:
    """
    Download an email attachment from Gmail (Phase 5 - not MVP).

    Args:
        email_id: Gmail message ID
        attachment_id: Attachment ID from Gmail
        filename: Original filename

    Returns:
        Attachment content as bytes
    """
    # TODO: Call Gmail MCP server via Strands framework
    # content = gmail_mcp.download_attachment(message_id=email_id, attachment_id=attachment_id)

    print(f"📎 Downloading attachment: {filename} from email {email_id}")

    # Placeholder return (will be replaced with actual MCP call)
    return b""


# Helper functions

def parse_email_address(email_field: str) -> str:
    """
    Extract email address from 'Name <email@domain.com>' format.

    Args:
        email_field: Email field string (may include name)

    Returns:
        Clean email address
    """
    if '<' in email_field and '>' in email_field:
        start = email_field.index('<') + 1
        end = email_field.index('>')
        return email_field[start:end].strip().lower()
    return email_field.strip().lower()


def extract_name_from_email(email_field: str) -> str:
    """
    Extract sender name from 'Name <email@domain.com>' format.

    Args:
        email_field: Email field string (may include name)

    Returns:
        Sender name, or email if name not present
    """
    if '<' in email_field:
        name = email_field[:email_field.index('<')].strip()
        return name if name else parse_email_address(email_field)
    return parse_email_address(email_field)


def is_labeled(email: Dict[str, Any], label: str) -> bool:
    """
    Check if an email has a specific label.

    Args:
        email: Email object from Gmail
        label: Label to check for

    Returns:
        True if email has the label, False otherwise
    """
    labels = email.get('labels', [])
    return label in labels
