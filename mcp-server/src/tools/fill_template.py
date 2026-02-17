"""
MCP tool: fill_template

Validates field values and renders HR document templates
"""

from typing import Dict, Union, Any
from ..utils.template_loader import validate_template_data, render_template, load_metadata


def fill_template(template_id: str, field_values: Dict[str, Any]) -> Dict[str, Union[bool, str, Dict, list]]:
    """
    Fill and render an HR document template with provided field values

    Args:
        template_id: Template identifier (e.g., "hiring_intro_email")
        field_values: Dictionary of field values to fill into template

    Returns:
        Success response:
        {
            "ok": true,
            "template_id": str,
            "rendered_document": str,
            "used_fields": dict
        }

        Error responses:
        {
            "ok": false,
            "error_code": "MISSING_FIELDS",
            "missing_fields": [field names],
            "message": "..."
        }

        {
            "ok": false,
            "error_code": "TEMPLATE_NOT_FOUND",
            "message": "..."
        }

        {
            "ok": false,
            "error_code": "RENDERING_ERROR",
            "message": "..."
        }
    """
    # Step 1: Validate template exists and get metadata
    try:
        metadata = load_metadata(template_id)
    except FileNotFoundError:
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

    # Step 2: Validate required fields BEFORE rendering
    validation = validate_template_data(template_id, field_values)

    if not validation["ok"]:
        return {
            "ok": False,
            "error_code": "MISSING_FIELDS",
            "missing_fields": validation["missing_fields"],
            "message": validation["error"]
        }

    # Step 3: Render template with validated data
    try:
        rendered_document = render_template(template_id, field_values)

        # Determine which fields were actually used (required + provided optional)
        all_fields = metadata["required"] + metadata["optional"]
        used_fields = {k: v for k, v in field_values.items() if k in all_fields}

        return {
            "ok": True,
            "template_id": template_id,
            "rendered_document": rendered_document,
            "used_fields": used_fields
        }

    except Exception as e:
        return {
            "ok": False,
            "error_code": "RENDERING_ERROR",
            "message": f"Failed to render template: {str(e)}"
        }
