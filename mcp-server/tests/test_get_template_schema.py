"""
Tests for get_template_schema tool

Verifies that schema extraction works correctly for all templates
"""

import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.template_loader import get_template_schema, load_metadata

# All required templates
REQUIRED_TEMPLATES = [
    "hiring_intro_email",
    "rejection_email",
    "job_description",
    "nda_interview_invitation"
]


def test_get_template_schema_structure():
    """Test that get_template_schema returns expected structure"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)

        # Verify all required keys present
        required_keys = ["id", "name", "description", "version", "required_fields", "optional_fields", "example_payload"]
        for key in required_keys:
            assert key in schema, f"Missing key '{key}' in schema for {template_id}"

        # Verify types
        assert isinstance(schema["id"], str)
        assert isinstance(schema["name"], str)
        assert isinstance(schema["description"], str)
        assert isinstance(schema["version"], str)
        assert isinstance(schema["required_fields"], list)
        assert isinstance(schema["optional_fields"], list)
        assert isinstance(schema["example_payload"], dict)


def test_required_fields_structure():
    """Test that required_fields have correct structure"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)

        for field in schema["required_fields"]:
            # Each field must have name, type, description
            assert "name" in field, f"Required field missing 'name' in {template_id}"
            assert "type" in field, f"Required field missing 'type' in {template_id}"
            assert "description" in field, f"Required field missing 'description' in {template_id}"

            # Verify types
            assert isinstance(field["name"], str)
            assert isinstance(field["type"], str)
            assert isinstance(field["description"], str)


def test_optional_fields_structure():
    """Test that optional_fields have correct structure"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)

        for field in schema["optional_fields"]:
            # Each field must have name, type, description
            assert "name" in field, f"Optional field missing 'name' in {template_id}"
            assert "type" in field, f"Optional field missing 'type' in {template_id}"
            assert "description" in field, f"Optional field missing 'description' in {template_id}"

            # Verify types
            assert isinstance(field["name"], str)
            assert isinstance(field["type"], str)
            assert isinstance(field["description"], str)


def test_schema_matches_metadata():
    """Test that schema data matches source metadata"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)
        metadata = load_metadata(template_id)

        # Verify basic fields match
        assert schema["id"] == metadata["id"]
        assert schema["name"] == metadata["name"]
        assert schema["description"] == metadata["description"]
        assert schema["version"] == metadata["version"]

        # Verify required fields match metadata
        required_names = [f["name"] for f in schema["required_fields"]]
        assert required_names == metadata["required"], f"Required fields mismatch for {template_id}"

        # Verify optional fields match metadata
        optional_names = [f["name"] for f in schema["optional_fields"]]
        assert optional_names == metadata["optional"], f"Optional fields mismatch for {template_id}"


def test_field_types_match_metadata():
    """Test that field types come from metadata types dict"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)
        metadata = load_metadata(template_id)

        # Check required field types
        for field in schema["required_fields"]:
            expected_type = metadata["types"].get(field["name"], "string")
            assert field["type"] == expected_type, \
                f"Type mismatch for required field '{field['name']}' in {template_id}"

        # Check optional field types
        for field in schema["optional_fields"]:
            expected_type = metadata["types"].get(field["name"], "string")
            assert field["type"] == expected_type, \
                f"Type mismatch for optional field '{field['name']}' in {template_id}"


def test_example_payload_completeness():
    """Test that example_payload contains all required fields"""
    for template_id in REQUIRED_TEMPLATES:
        schema = get_template_schema(template_id)

        required_field_names = [f["name"] for f in schema["required_fields"]]

        for field_name in required_field_names:
            assert field_name in schema["example_payload"], \
                f"Example payload missing required field '{field_name}' in {template_id}"


def test_nonexistent_template():
    """Test that nonexistent template raises FileNotFoundError"""
    with pytest.raises(FileNotFoundError):
        get_template_schema("nonexistent_template")


@pytest.mark.parametrize("template_id", REQUIRED_TEMPLATES)
def test_each_template_schema(template_id):
    """Parameterized test for each template"""
    schema = get_template_schema(template_id)

    # Must have at least one required field
    assert len(schema["required_fields"]) > 0, f"{template_id} has no required fields"

    # All field names must be non-empty
    for field in schema["required_fields"] + schema["optional_fields"]:
        assert field["name"], f"Empty field name in {template_id}"
        assert field["type"], f"Empty field type in {template_id}"


def test_hiring_intro_email_specific_fields():
    """Test specific required fields for hiring_intro_email"""
    schema = get_template_schema("hiring_intro_email")

    required_names = [f["name"] for f in schema["required_fields"]]

    # Must have these specific fields
    assert "candidate_name" in required_names
    assert "position_title" in required_names
    assert "recruiter_name" in required_names
    assert "company_name" in required_names


def test_rejection_email_specific_fields():
    """Test specific required fields for rejection_email"""
    schema = get_template_schema("rejection_email")

    required_names = [f["name"] for f in schema["required_fields"]]

    # Must have these specific fields
    assert "candidate_name" in required_names
    assert "position_title" in required_names
    assert "company_name" in required_names


def test_job_description_specific_fields():
    """Test specific required fields for job_description"""
    schema = get_template_schema("job_description")

    required_names = [f["name"] for f in schema["required_fields"]]

    # Must have these specific fields
    assert "position_title" in required_names
    assert "company_name" in required_names
    assert "department" in required_names
    assert "role_summary" in required_names


def test_nda_interview_invitation_specific_fields():
    """Test specific required fields for nda_interview_invitation"""
    schema = get_template_schema("nda_interview_invitation")

    required_names = [f["name"] for f in schema["required_fields"]]

    # Must have these specific fields
    assert "candidate_name" in required_names
    assert "position_title" in required_names
    assert "interview_date" in required_names
    assert "nda_deadline" in required_names
