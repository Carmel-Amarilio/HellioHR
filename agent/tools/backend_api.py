"""
Backend API client for Hellio HR system.
Handles authentication and API calls to the TypeScript backend.
"""

import os
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class BackendAPIError(Exception):
    """Custom exception for backend API errors."""
    pass


class BackendAPI:
    """Client for interacting with Hellio HR TypeScript backend."""

    def __init__(self, base_url: str, agent_email: str, agent_password: str):
        self.base_url = base_url.rstrip('/')
        self.agent_email = agent_email
        self.agent_password = agent_password
        self.token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

    def authenticate(self) -> str:
        """
        Authenticate and get JWT token from backend.
        Returns the JWT token string.
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={
                    "email": self.agent_email,
                    "password": self.agent_password
                },
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            self.token = data['token']
            # JWT tokens expire in 24 hours (from backend config)
            self.token_expiry = datetime.now() + timedelta(hours=23)

            print(f"[OK] Authenticated as {self.agent_email}")
            return self.token

        except requests.exceptions.RequestException as e:
            raise BackendAPIError(f"Authentication failed: {e}")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with valid JWT token."""
        # Re-authenticate if token is expired or missing
        if not self.token or (self.token_expiry and datetime.now() >= self.token_expiry):
            self.authenticate()

        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def create_notification(
        self,
        title: str,
        message: str,
        notification_type: str = "email_processed",
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a notification in the backend.

        Args:
            title: Short notification title
            message: Detailed notification message
            notification_type: Type of notification (email_processed, draft_created, error)
            metadata: Additional metadata (emailId, candidateId, etc.)
            user_id: Optional user ID to assign notification to

        Returns:
            Created notification object with id, createdAt, etc.
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/notifications",
                headers=self._get_headers(),
                json={
                    "type": notification_type,
                    "title": title,
                    "message": message,
                    "metadata": metadata or {},
                    "userId": user_id
                },
                timeout=10
            )
            response.raise_for_status()
            notification = response.json()
            print(f"[OK] Created notification: {title}")
            return notification

        except requests.exceptions.RequestException as e:
            raise BackendAPIError(f"Failed to create notification: {e}")

    def get_notifications(self, unread_only: bool = False) -> list[Dict[str, Any]]:
        """
        Get notifications from backend.

        Args:
            unread_only: If True, only fetch unread notifications

        Returns:
            List of notification objects
        """
        try:
            params = {"unreadOnly": "true"} if unread_only else {}
            response = requests.get(
                f"{self.base_url}/api/notifications",
                headers=self._get_headers(),
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise BackendAPIError(f"Failed to fetch notifications: {e}")

    def check_email_processed(self, gmail_message_id: str) -> bool:
        """
        Check if an email has already been processed (idempotency check).

        Args:
            gmail_message_id: Gmail message ID

        Returns:
            True if email has been processed, False otherwise
        """
        try:
            # This endpoint doesn't exist yet in backend, but is planned
            # For now, we'll rely on Gmail labels for idempotency
            # TODO: Implement GET /api/email-logs/:gmailMessageId endpoint
            return False

        except requests.exceptions.RequestException:
            # If endpoint doesn't exist, assume email not processed
            return False

    def create_or_get_candidate(self, email: str, name: str) -> Dict[str, Any]:
        """
        Create a new candidate or get existing by email.

        Args:
            email: Candidate email address
            name: Candidate name

        Returns:
            Candidate object with id, email, etc.
        """
        try:
            # Try to find existing candidate by email
            response = requests.get(
                f"{self.base_url}/api/candidates",
                headers=self._get_headers(),
                timeout=10
            )
            response.raise_for_status()
            candidates = response.json()

            # Search for matching email
            for candidate in candidates:
                if candidate.get('email') == email:
                    print(f"[OK] Found existing candidate: {name}")
                    return candidate

            # Candidate doesn't exist, create new one
            response = requests.post(
                f"{self.base_url}/api/candidates",
                headers=self._get_headers(),
                json={
                    "name": name,
                    "email": email,
                    "phone": "",  # Will be extracted later
                    "skills": [],
                    "status": "active"
                },
                timeout=10
            )
            response.raise_for_status()
            candidate = response.json()
            print(f"[OK] Created candidate: {name}")
            return candidate

        except requests.exceptions.RequestException as e:
            raise BackendAPIError(f"Failed to create/get candidate: {e}")

    def upload_document(
        self,
        candidate_id: str,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Upload a document (CV) for a candidate and trigger ingestion.

        Args:
            candidate_id: Candidate ID
            file_content: File content as bytes
            filename: Original filename

        Returns:
            Document object with id, processingStatus, etc.
        """
        try:
            files = {'file': (filename, file_content)}
            data = {
                'entityType': 'candidate',
                'entityId': candidate_id,
                'useLLM': 'true'
            }

            # Remove Content-Type from headers, let requests set it for multipart
            headers = self._get_headers()
            headers.pop('Content-Type', None)

            response = requests.post(
                f"{self.base_url}/api/documents/ingest",
                headers=headers,
                files=files,
                data=data,
                timeout=30  # Longer timeout for file upload
            )
            response.raise_for_status()
            result = response.json()
            print(f"[OK] Uploaded document: {filename}")
            return result

        except requests.exceptions.RequestException as e:
            raise BackendAPIError(f"Failed to upload document: {e}")

    def health_check(self) -> bool:
        """
        Check if backend is healthy.

        Returns:
            True if backend is responding, False otherwise
        """
        try:
            response = requests.get(
                f"{self.base_url}/health",
                timeout=5
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False


# Singleton instance for agent tools
_backend_api: Optional[BackendAPI] = None


def get_backend_api() -> BackendAPI:
    """Get or create the singleton BackendAPI instance."""
    global _backend_api
    if _backend_api is None:
        agent_password = os.getenv("AGENT_PASSWORD")
        if not agent_password or agent_password == "<CHANGE_ME_IN_PRODUCTION>":
            raise BackendAPIError(
                "AGENT_PASSWORD not set in environment. "
                "Please configure agent/.env with the agent password from backend seed."
            )

        _backend_api = BackendAPI(
            base_url=os.getenv("BACKEND_URL", "http://localhost:3000"),
            agent_email=os.getenv("AGENT_EMAIL", "agent@hellio.hr"),
            agent_password=agent_password
        )
        # Authenticate immediately
        _backend_api.authenticate()
    return _backend_api
