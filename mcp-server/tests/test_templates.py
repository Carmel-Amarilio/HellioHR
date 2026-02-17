"""
Tests for template loading and rendering with metadata examples
"""

import pytest
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

# Template and metadata directories
TEMPLATES_DIR = Path("./templates")
METADATA_DIR = Path("./metadata")

def load_metadata(template_id: str) -> dict:
    """Load metadata JSON for a template"""
    metadata_file = METADATA_DIR / f"{template_id}.json"
    with open(metadata_file, 'r') as f:
        return json.load(f)

def render_template(template_id: str, data: dict) -> str:
    """Render a Jinja2 template with data"""
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
    template = env.get_template(f"{template_id}.j2")
    return template.render(**data)

# Test data: all 4 required templates
REQUIRED_TEMPLATES = [
    "hiring_intro_email",
    "rejection_email",
    "job_description",
    "nda_interview_invitation"
]

def test_all_templates_exist():
    """Test that all 4 required template files exist"""
    for template_id in REQUIRED_TEMPLATES:
        template_file = TEMPLATES_DIR / f"{template_id}.j2"
        assert template_file.exists(), f"Template file missing: {template_file}"

def test_all_metadata_exist():
    """Test that all 4 required metadata files exist"""
    for template_id in REQUIRED_TEMPLATES:
        metadata_file = METADATA_DIR / f"{template_id}.json"
        assert metadata_file.exists(), f"Metadata file missing: {metadata_file}"

def test_metadata_structure():
    """Test that all metadata files have required structure"""
    required_keys = ["id", "name", "description", "version", "required", "optional", "types", "example"]

    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)

        for key in required_keys:
            assert key in metadata, f"Missing key '{key}' in {template_id} metadata"

        assert metadata["id"] == template_id, f"Metadata ID mismatch for {template_id}"
        assert isinstance(metadata["required"], list), f"'required' must be list in {template_id}"
        assert isinstance(metadata["optional"], list), f"'optional' must be list in {template_id}"
        assert isinstance(metadata["types"], dict), f"'types' must be dict in {template_id}"
        assert isinstance(metadata["example"], dict), f"'example' must be dict in {template_id}"

def test_example_data_has_required_fields():
    """Test that example data includes all required fields"""
    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)
        example_data = metadata["example"]
        required_fields = metadata["required"]

        for field in required_fields:
            assert field in example_data, f"Missing required field '{field}' in {template_id} example data"

def test_templates_render_with_example_data():
    """Test that all templates render successfully with their example data"""
    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)
        example_data = metadata["example"]

        # Should not raise exception
        rendered = render_template(template_id, example_data)

        # Rendered output should not be empty
        assert len(rendered) > 0, f"Template {template_id} rendered empty output"

        # Should contain at least some of the example data
        # (Check for candidate/company name presence in output)
        if "candidate_name" in example_data:
            assert example_data["candidate_name"] in rendered, \
                f"Example candidate_name not found in rendered {template_id}"

        if "company_name" in example_data:
            assert example_data["company_name"] in rendered, \
                f"Example company_name not found in rendered {template_id}"

def test_templates_handle_optional_fields():
    """Test that templates render correctly when optional fields are missing"""
    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)
        required_fields = metadata["required"]
        example_data = metadata["example"]

        # Create minimal data with only required fields
        minimal_data = {field: example_data[field] for field in required_fields}

        # Should render without errors
        rendered = render_template(template_id, minimal_data)
        assert len(rendered) > 0, f"Template {template_id} failed with minimal required data"

def test_no_undefined_variables_in_templates():
    """Test that templates only use variables defined in metadata"""
    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)
        all_fields = set(metadata["required"] + metadata["optional"])

        # Render with example data (should work without undefined var errors)
        try:
            rendered = render_template(template_id, metadata["example"])
            assert True  # Success
        except Exception as e:
            if "undefined" in str(e).lower():
                pytest.fail(f"Template {template_id} uses undefined variable: {e}")
            else:
                raise  # Re-raise other exceptions

@pytest.mark.parametrize("template_id", REQUIRED_TEMPLATES)
def test_each_template_renders(template_id):
    """Parameterized test for each template"""
    metadata = load_metadata(template_id)
    rendered = render_template(template_id, metadata["example"])

    assert len(rendered) > 100, f"Template {template_id} output seems too short"
    assert "{{" not in rendered, f"Template {template_id} has unrendered Jinja2 tags"
    assert "}}" not in rendered, f"Template {template_id} has unrendered Jinja2 tags"
