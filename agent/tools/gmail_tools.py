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
import base64
from typing import Dict, List, Any, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# Gmail API Client Initialization
def _get_gmail_service():
    """Initialize Gmail API client with OAuth credentials from .env"""
    creds = Credentials(
        token=None,
        refresh_token=os.getenv('GOOGLE_REFRESH_TOKEN'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        scopes=['https://www.googleapis.com/auth/gmail.modify']
    )
    service = build('gmail', 'v1', credentials=creds)
    return service


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

    print(f"[EMAIL] Fetching emails: query='{query}', max={max_results}")

    try:
        service = _get_gmail_service()

        # Search for messages matching query
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()

        messages = results.get('messages', [])

        if not messages:
            print(f"   [EMPTY] No emails matching query")
            return []

        print(f"   [OK] Found {len(messages)} email(s)")

        # Fetch full message details for each email
        emails = []
        for msg in messages:
            msg_detail = service.users().messages().get(
                userId='me',
                id=msg['id'],
                format='full'
            ).execute()

            # Parse email fields
            headers = {h['name'].lower(): h['value'] for h in msg_detail['payload']['headers']}

            # Get email body
            body = ''
            if 'parts' in msg_detail['payload']:
                for part in msg_detail['payload']['parts']:
                    if part['mimeType'] == 'text/plain' and 'data' in part['body']:
                        body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
            elif 'body' in msg_detail['payload'] and 'data' in msg_detail['payload']['body']:
                body = base64.urlsafe_b64decode(msg_detail['payload']['body']['data']).decode('utf-8')

            # Get attachments info
            attachments = []
            if 'parts' in msg_detail['payload']:
                for part in msg_detail['payload']['parts']:
                    if part.get('filename'):
                        attachments.append({
                            'id': part['body'].get('attachmentId', ''),
                            'filename': part['filename'],
                            'mimeType': part['mimeType'],
                            'size': part['body'].get('size', 0)
                        })

            email = {
                'id': msg_detail['id'],
                'threadId': msg_detail['threadId'],
                'from': headers.get('from', ''),
                'to': headers.get('to', ''),
                'subject': headers.get('subject', ''),
                'body': body,
                'date': headers.get('date', ''),
                'labels': msg_detail.get('labelIds', []),
                'attachments': attachments
            }
            emails.append(email)

        return emails

    except HttpError as error:
        print(f"   [ERROR] Gmail API error: {error}")
        return []
    except Exception as error:
        print(f"   [ERROR] Unexpected error: {error}")
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
    print(f"[LABEL]  Adding label '{label}' to email {email_id}")

    try:
        service = _get_gmail_service()

        # Get all labels to find the label ID
        labels_response = service.users().labels().list(userId='me').execute()
        labels = labels_response.get('labels', [])

        # Find the label ID by name
        label_id = None
        for lbl in labels:
            if lbl['name'] == label:
                label_id = lbl['id']
                break

        if not label_id:
            print(f"   [ERROR] Label '{label}' not found in Gmail")
            return False

        # Add label to message
        service.users().messages().modify(
            userId='me',
            id=email_id,
            body={'addLabelIds': [label_id]}
        ).execute()

        print(f"   [OK] Label added successfully")
        return True

    except HttpError as error:
        print(f"   [ERROR] Gmail API error: {error}")
        return False
    except Exception as error:
        print(f"   [ERROR] Unexpected error: {error}")
        return False


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

    print(f"[DRAFT]  Creating draft reply to {to}: {subject}")

    # Placeholder return (will be replaced with actual MCP call)
    return {"draft_id": "draft-placeholder", "status": "created"}


def download_attachment(
    email_id: str,
    attachment_id: str,
    filename: str
) -> bytes:
    """
    Download an email attachment from Gmail.

    Args:
        email_id: Gmail message ID
        attachment_id: Attachment ID from Gmail
        filename: Original filename

    Returns:
        Attachment content as bytes
    """
    print(f"[ATTACH] Downloading attachment: {filename} from email {email_id}")

    try:
        service = _get_gmail_service()

        # Download attachment
        attachment = service.users().messages().attachments().get(
            userId='me',
            messageId=email_id,
            id=attachment_id
        ).execute()

        # Decode base64 data
        file_data = base64.urlsafe_b64decode(attachment['data'])

        print(f"   [OK] Downloaded {len(file_data)} bytes")
        return file_data

    except HttpError as error:
        print(f"   [ERROR] Gmail API error: {error}")
        return b""
    except Exception as error:
        print(f"   [ERROR] Unexpected error: {error}")
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
