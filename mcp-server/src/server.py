"""
HR Document Templates MCP Server

Provides tools for generating standardized HR documents:
- list_templates: Discover available templates
- get_template_schema: Get required fields for a template
- fill_template: Generate document from template + data

Transport: HTTP with Server-Sent Events (SSE)
MCP Endpoint: http://localhost:3001/sse
"""

import os
from pathlib import Path
from fastmcp import FastMCP
from typing import Dict, List
from starlette.responses import JSONResponse
from starlette.requests import Request

# Import tool implementations
from src.utils.template_loader import (
    list_all_metadata,
    get_template_schema as load_schema,
    validate_template_data,
    render_template
)

# Configuration from environment
HOST = os.getenv("MCP_SERVER_HOST", "0.0.0.0")
PORT = int(os.getenv("MCP_SERVER_PORT", "3001"))
TEMPLATES_DIR = Path(os.getenv("MCP_TEMPLATES_DIR", "./templates"))
METADATA_DIR = Path(os.getenv("MCP_METADATA_DIR", "./metadata"))
LOG_LEVEL = os.getenv("MCP_LOG_LEVEL", "INFO")

# Initialize FastMCP server
# Note: FastMCP 2.14.5 API changed - description moved to server metadata
mcp = FastMCP(
    name="HR Document Templates"
)

@mcp.tool()
def health_check() -> dict:
    """
    MCP tool for health check (callable via MCP protocol)

    Returns server status and configuration
    """
    return {
        "status": "healthy",
        "server": "HR Document Templates MCP Server",
        "version": "1.0.0",
        "transport": "HTTP/SSE",
        "templates_dir": str(TEMPLATES_DIR),
        "metadata_dir": str(METADATA_DIR),
        "templates_loaded": len(list(TEMPLATES_DIR.glob("*.j2"))) if TEMPLATES_DIR.exists() else 0,
        "metadata_loaded": len(list(METADATA_DIR.glob("*.json"))) if METADATA_DIR.exists() else 0
    }


@mcp.tool()
def list_templates() -> Dict[str, List[Dict]]:
    """
    List all available HR document templates

    Returns a structured JSON response with all templates.
    Each template includes: id, name, description, and version.

    Example response:
    {
        "templates": [
            {
                "id": "hiring_intro_email",
                "name": "Hiring Introduction Email",
                "description": "Initial outreach email to a candidate...",
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


@mcp.tool()
def get_template_schema(template_id: str) -> Dict:
    """
    Get detailed schema for a specific HR document template

    Args:
        template_id: Template identifier (e.g., "hiring_intro_email")

    Returns:
        Success: {ok: true, id, name, description, version, required_fields, optional_fields, example_payload}
        Error: {ok: false, error_code, message}

    Example:
        get_template_schema("hiring_intro_email")
        => {
            "ok": true,
            "id": "hiring_intro_email",
            "name": "Hiring Introduction Email",
            "required_fields": [
                {"name": "candidate_name", "type": "string", "description": "Candidate Name"},
                {"name": "position_title", "type": "string", "description": "Position Title"},
                ...
            ],
            "optional_fields": [...],
            "example_payload": {...}
        }
    """
    try:
        schema = load_schema(template_id)
        return {
            "ok": True,
            **schema
        }
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
    except Exception as e:
        return {
            "ok": False,
            "error_code": "INTERNAL_ERROR",
            "message": f"Failed to load template schema: {str(e)}"
        }


@mcp.tool()
def fill_template(template_id: str, field_values: Dict) -> Dict:
    """
    Fill and render an HR document template with provided field values

    Validates required fields before rendering and returns structured response.

    Args:
        template_id: Template identifier (e.g., "hiring_intro_email")
        field_values: Dictionary of field values {"candidate_name": "John", ...}

    Returns:
        Success: {ok: true, template_id, rendered_document, used_fields}
        Missing fields: {ok: false, error_code: "MISSING_FIELDS", missing_fields: [...], message}
        Not found: {ok: false, error_code: "TEMPLATE_NOT_FOUND", message}
        Render error: {ok: false, error_code: "RENDERING_ERROR", message}

    Example:
        fill_template("hiring_intro_email", {
            "candidate_name": "Jane Smith",
            "position_title": "Senior DevOps Engineer",
            "recruiter_name": "John Doe",
            "company_name": "Hellio HR"
        })
        => {
            "ok": true,
            "template_id": "hiring_intro_email",
            "rendered_document": "Dear Jane Smith,\\n\\nI hope this email...",
            "used_fields": {...}
        }
    """
    from src.utils.template_loader import load_metadata

    # Validate template exists
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

    # Validate required fields BEFORE rendering
    validation = validate_template_data(template_id, field_values)

    if not validation["ok"]:
        return {
            "ok": False,
            "error_code": "MISSING_FIELDS",
            "missing_fields": validation["missing_fields"],
            "message": validation["error"]
        }

    # Render template
    try:
        rendered_document = render_template(template_id, field_values)

        # Determine used fields
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


# Custom HTTP health endpoint for Docker readiness/observability
@mcp.custom_route("/health", methods=["GET"])
async def health_endpoint(request: Request) -> JSONResponse:
    """
    HTTP health check endpoint (not an MCP tool)

    Returns: {status: "ok", version: "1.0.0", templates_count: 4}
    """
    templates_count = len(list(TEMPLATES_DIR.glob("*.j2"))) if TEMPLATES_DIR.exists() else 0

    return JSONResponse({
        "status": "ok",
        "version": "1.0.0",
        "server": "HR Document Templates MCP Server",
        "templates_count": templates_count,
        "transport": "HTTP/SSE",
        "mcp_endpoint": f"http://{HOST}:{PORT}/sse"
    })


if __name__ == "__main__":
    import uvicorn

    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║  HR Document Templates MCP Server                            ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Transport:     HTTP/SSE                                     ║
    ║  MCP Endpoint:  http://{HOST}:{PORT}/sse              ║
    ║  Health Check:  http://{HOST}:{PORT}/health          ║
    ║  Templates:     {str(TEMPLATES_DIR):<42} ║
    ║  Metadata:      {str(METADATA_DIR):<42} ║
    ╚══════════════════════════════════════════════════════════════╝
    """)

    # Run FastMCP server with SSE transport
    # This uses uvicorn under the hood for HTTP/SSE
    mcp.run(
        transport="sse",  # Explicit SSE transport (HTTP-based)
        host=HOST,
        port=PORT
    )
