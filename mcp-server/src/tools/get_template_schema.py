"""
MCP tool: get_template_schema

Returns detailed schema information for a specific template
"""

from typing import Dict, Union
from ..utils.template_loader import get_template_schema as load_schema


def get_template_schema(template_id: str) -> Dict[str, Union[bool, str, Dict, list]]:
    """
    Get detailed schema for a specific HR document template

    Args:
        template_id: Template identifier (e.g., "hiring_intro_email")

    Returns:
        Success response:
        {
            "ok": true,
            "id": str,
            "name": str,
            "description": str,
            "version": str,
            "required_fields": [{"name": str, "type": str, "description": str}],
            "optional_fields": [{"name": str, "type": str, "description": str}],
            "example_payload": dict
        }

        Error response:
        {
            "ok": false,
            "error_code": str,
            "message": str
        }
    """
    try:
        schema = load_schema(template_id)

        # Return success response with schema
        return {
            "ok": True,
            **schema  # Spread all schema fields
        }

    except FileNotFoundError as e:
        return {
            "ok": False,
            "error_code": "TEMPLATE_NOT_FOUND",
            "message": f"Template '{template_id}' does not exist. Use list_templates to see available templates."
        }

    except ValueError as e:
        return {
            "ok": False,
            "error_code": "INVALID_METADATA",
            "message": f"Template metadata is invalid: {str(e)}"
        }

    except Exception as e:
        return {
            "ok": False,
            "error_code": "INTERNAL_ERROR",
            "message": f"Failed to load template schema: {str(e)}"
        }
