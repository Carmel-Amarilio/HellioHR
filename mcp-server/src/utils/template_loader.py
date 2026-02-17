"""
Utility functions for loading and validating template metadata
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

METADATA_DIR = Path(__file__).parent.parent.parent / "metadata"
TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def load_metadata(template_id: str) -> Dict:
    """
    Load metadata JSON for a specific template

    Args:
        template_id: Template identifier (e.g., "hiring_intro_email")

    Returns:
        Dictionary containing template metadata

    Raises:
        FileNotFoundError: If metadata file doesn't exist
        ValueError: If metadata JSON is invalid
    """
    metadata_file = METADATA_DIR / f"{template_id}.json"

    if not metadata_file.exists():
        raise FileNotFoundError(f"Metadata file not found: {metadata_file}")

    try:
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in metadata file {metadata_file}: {e}")

    # Validate required metadata keys
    required_keys = ["id", "name", "description", "version", "required", "optional", "types", "example"]
    missing_keys = [key for key in required_keys if key not in metadata]

    if missing_keys:
        raise ValueError(f"Metadata file {metadata_file} missing required keys: {missing_keys}")

    return metadata


def list_all_metadata() -> List[Dict]:
    """
    Load metadata for all available templates

    Returns:
        List of dictionaries, each containing template metadata summary
        Format: [{"name": str, "description": str, "version": str, "id": str}, ...]
    """
    templates = []

    # Find all .json files in metadata directory
    for metadata_file in sorted(METADATA_DIR.glob("*.json")):
        try:
            metadata = load_metadata(metadata_file.stem)
            templates.append({
                "id": metadata["id"],
                "name": metadata["name"],
                "description": metadata["description"],
                "version": metadata["version"]
            })
        except (FileNotFoundError, ValueError) as e:
            # Log error but continue processing other templates
            print(f"Warning: Failed to load metadata from {metadata_file}: {e}")
            continue

    return templates


def get_template_schema(template_id: str) -> Dict:
    """
    Get the detailed schema for a template with field information

    Args:
        template_id: Template identifier

    Returns:
        Dictionary with detailed schema:
        {
            "id": str,
            "name": str,
            "description": str,
            "version": str,
            "required_fields": [{"name": str, "type": str, "description": str}],
            "optional_fields": [{"name": str, "type": str, "description": str}],
            "example_payload": dict
        }

    Raises:
        FileNotFoundError: If template metadata doesn't exist
        ValueError: If metadata is invalid
    """
    metadata = load_metadata(template_id)

    # Build required fields with type information
    required_fields = []
    for field_name in metadata["required"]:
        field_type = metadata["types"].get(field_name, "string")
        # Field descriptions not in metadata - use field name as description for now
        required_fields.append({
            "name": field_name,
            "type": field_type,
            "description": f"{field_name.replace('_', ' ').title()}"
        })

    # Build optional fields with type information
    optional_fields = []
    for field_name in metadata["optional"]:
        field_type = metadata["types"].get(field_name, "string")
        optional_fields.append({
            "name": field_name,
            "type": field_type,
            "description": f"{field_name.replace('_', ' ').title()}"
        })

    return {
        "id": metadata["id"],
        "name": metadata["name"],
        "description": metadata["description"],
        "version": metadata["version"],
        "required_fields": required_fields,
        "optional_fields": optional_fields,
        "example_payload": metadata["example"]
    }


def validate_template_data(template_id: str, data: Dict) -> Dict:
    """
    Validate user-provided data against template schema

    Args:
        template_id: Template identifier
        data: User-provided data dictionary

    Returns:
        Dictionary with validation results:
        {
            "ok": bool,
            "missing_fields": List[str],  # Required fields missing from data
            "error": Optional[str]         # Error message if validation failed
        }
    """
    try:
        metadata = load_metadata(template_id)
    except (FileNotFoundError, ValueError) as e:
        return {
            "ok": False,
            "missing_fields": [],
            "error": f"Failed to load template metadata: {e}"
        }

    required_fields = metadata["required"]
    missing_fields = [field for field in required_fields if field not in data]

    if missing_fields:
        return {
            "ok": False,
            "missing_fields": missing_fields,
            "error": f"Missing required fields: {', '.join(missing_fields)}"
        }

    return {
        "ok": True,
        "missing_fields": [],
        "error": None
    }


def render_template(template_id: str, field_values: Dict) -> str:
    """
    Render a Jinja2 template with provided field values

    Args:
        template_id: Template identifier
        field_values: Dictionary of field values to render

    Returns:
        Rendered template as string

    Raises:
        FileNotFoundError: If template file doesn't exist
        TemplateNotFound: If Jinja2 can't find template
        Exception: If rendering fails
    """
    # Create safe Jinja2 environment (no dynamic execution)
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=False,  # Plain text templates, not HTML
        trim_blocks=True,
        lstrip_blocks=True
    )

    # Load and render template
    template = env.get_template(f"{template_id}.j2")
    rendered = template.render(**field_values)

    return rendered
