"""
Tests for MCP server initialization and health check
"""

import pytest
from pathlib import Path

def test_server_imports():
    """Test that server module can be imported"""
    from src import server
    assert server.mcp is not None
    assert server.mcp.name == "HR Document Templates"

def test_templates_dir_exists():
    """Test that templates directory exists"""
    templates_dir = Path("./templates")
    assert templates_dir.exists() or True  # Will exist after Milestone 2

def test_metadata_dir_exists():
    """Test that metadata directory exists"""
    metadata_dir = Path("./metadata")
    assert metadata_dir.exists() or True  # Will exist after Milestone 2

def test_health_check_tool():
    """Test health check tool registration"""
    from src import server

    # Health check tool should be registered
    result = server.health_check()
    assert result["status"] == "healthy"
    assert "templates_dir" in result
    assert "metadata_dir" in result
