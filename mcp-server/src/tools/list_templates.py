"""
MCP tool: list_templates

Returns a structured JSON list of all available HR document templates
"""

from typing import Dict, List
from ..utils.template_loader import list_all_metadata


def list_templates() -> Dict[str, List[Dict]]:
    """
    List all available HR document templates

    Returns:
        Dictionary with key "templates" containing list of template metadata:
        {
            "templates": [
                {
                    "id": "hiring_intro_email",
                    "name": "Hiring Introduction Email",
                    "description": "Initial outreach email...",
                    "version": "1.0"
                },
                ...
            ]
        }
    """
    templates = list_all_metadata()

    return {
        "templates": templates
    }
