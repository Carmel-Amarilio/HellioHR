"""
Tests for fill_template tool

Verifies template rendering with validation
"""

import pytest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.tools.fill_template import fill_template
from src.utils.template_loader import load_metadata

# All required templates
REQUIRED_TEMPLATES = [
    "hiring_intro_email",
    "rejection_email",
    "job_description",
    "nda_interview_invitation"
]


def test_fill_template_with_example_data():
    """Test that all templates render successfully with their example data"""
    for template_id in REQUIRED_TEMPLATES:
        metadata = load_metadata(template_id)
        example_data = metadata["example"]

        result = fill_template(template_id, example_data)

        # Should succeed
        assert result["ok"] == True, f"Template {template_id} failed to render"
        assert "rendered_document" in result
        assert "template_id" in result
        assert "used_fields" in result
        assert result["template_id"] == template_id

        # Rendered document should not be empty
        assert len(result["rendered_document"]) > 0, f"Empty render for {template_id}"

        # Should not have unrendered Jinja2 tags
        assert "{{" not in result["rendered_document"], f"Unrendered tags in {template_id}"
        assert "}}" not in result["rendered_document"], f"Unrendered tags in {template_id}"


def test_missing_required_field():
    """Test that missing required fields return structured error"""
    # Get hiring_intro_email metadata
    metadata = load_metadata("hiring_intro_email")
    example_data = metadata["example"].copy()

    # Remove a required field
    del example_data["candidate_name"]

    result = fill_template("hiring_intro_email", example_data)

    # Should fail with MISSING_FIELDS
    assert result["ok"] == False
    assert result["error_code"] == "MISSING_FIELDS"
    assert "missing_fields" in result
    assert "candidate_name" in result["missing_fields"]
    assert "message" in result


def test_missing_multiple_required_fields():
    """Test error when multiple required fields are missing"""
    # Only provide 1 of 4 required fields
    incomplete_data = {
        "candidate_name": "Jane Smith"
    }

    result = fill_template("hiring_intro_email", incomplete_data)

    # Should fail
    assert result["ok"] == False
    assert result["error_code"] == "MISSING_FIELDS"
    assert len(result["missing_fields"]) == 3  # Missing 3 of 4 required


def test_invalid_template_id():
    """Test that invalid template_id returns TEMPLATE_NOT_FOUND"""
    result = fill_template("nonexistent_template", {"some": "data"})

    assert result["ok"] == False
    assert result["error_code"] == "TEMPLATE_NOT_FOUND"
    assert "message" in result
    assert "nonexistent_template" in result["message"]


def test_used_fields_tracking():
    """Test that used_fields correctly tracks which fields were used"""
    metadata = load_metadata("hiring_intro_email")
    example_data = metadata["example"]

    result = fill_template("hiring_intro_email", example_data)

    assert result["ok"] == True
    assert "used_fields" in result

    # used_fields should contain all required fields
    for req_field in metadata["required"]:
        assert req_field in result["used_fields"]


def test_optional_fields_not_required():
    """Test that templates render without optional fields"""
    # Get metadata
    metadata = load_metadata("hiring_intro_email")
    required_fields = metadata["required"]
    example_data = metadata["example"]

    # Create minimal data with only required fields
    minimal_data = {field: example_data[field] for field in required_fields}

    result = fill_template("hiring_intro_email", minimal_data)

    # Should succeed
    assert result["ok"] == True
    assert len(result["rendered_document"]) > 0


def test_output_is_plain_text():
    """Test that rendered output is plain text (no HTML)"""
    metadata = load_metadata("hiring_intro_email")
    result = fill_template("hiring_intro_email", metadata["example"])

    assert result["ok"] == True
    rendered = result["rendered_document"]

    # Should not contain HTML tags (templates are plain text)
    assert "<html>" not in rendered.lower()
    assert "<body>" not in rendered.lower()

    # Should be recruiter-friendly text
    assert "Dear" in rendered or "Subject:" in rendered


def test_candidate_name_appears_in_output():
    """Test that provided data actually appears in rendered output"""
    test_name = "Jane Smith Test Name"
    data = {
        "candidate_name": test_name,
        "position_title": "Senior Engineer",
        "recruiter_name": "John Recruiter",
        "company_name": "Test Company"
    }

    result = fill_template("hiring_intro_email", data)

    assert result["ok"] == True
    assert test_name in result["rendered_document"]


@pytest.mark.parametrize("template_id", REQUIRED_TEMPLATES)
def test_each_template_renders(template_id):
    """Parameterized test: each template should render with example data"""
    metadata = load_metadata(template_id)
    result = fill_template(template_id, metadata["example"])

    assert result["ok"] == True
    assert result["template_id"] == template_id
    assert len(result["rendered_document"]) > 100, \
        f"Rendered output seems too short for {template_id}"


def test_rejection_email_specific():
    """Test rejection_email template with specific data"""
    data = {
        "candidate_name": "John Doe",
        "position_title": "Software Engineer",
        "company_name": "Tech Corp",
        "recruiter_name": "Sarah HR"
    }

    result = fill_template("rejection_email", data)

    assert result["ok"] == True
    assert "John Doe" in result["rendered_document"]
    assert "Software Engineer" in result["rendered_document"]


def test_job_description_specific():
    """Test job_description template with required fields"""
    data = {
        "position_title": "DevOps Engineer",
        "company_name": "Cloud Systems",
        "department": "Engineering",
        "role_summary": "Lead DevOps initiatives",
        "responsibilities": "- Deploy infrastructure\n- Automate processes",
        "requirements": "- 5 years experience\n- AWS certification"
    }

    result = fill_template("job_description", data)

    assert result["ok"] == True
    assert "DevOps Engineer" in result["rendered_document"]
    assert "Cloud Systems" in result["rendered_document"]
    assert "Deploy infrastructure" in result["rendered_document"]


def test_nda_interview_invitation_specific():
    """Test nda_interview_invitation with all required fields"""
    data = {
        "candidate_name": "Emily Chen",
        "position_title": "Senior DevOps Engineer",
        "company_name": "Hellio HR",
        "interview_date": "Friday, February 21, 2026",
        "interview_time": "2:00 PM PST",
        "interview_type": "Video Conference",
        "nda_deadline": "Wednesday, February 19, 2026",
        "recruiter_name": "Jennifer Martinez",
        "recruiter_email": "jennifer@hellio.hr"
    }

    result = fill_template("nda_interview_invitation", data)

    assert result["ok"] == True
    assert "Emily Chen" in result["rendered_document"]
    assert "Friday, February 21, 2026" in result["rendered_document"]
    assert "NDA" in result["rendered_document"] or "Non-Disclosure" in result["rendered_document"]


def test_extra_fields_ignored_gracefully():
    """Test that extra fields not in schema are handled gracefully"""
    metadata = load_metadata("hiring_intro_email")
    data = metadata["example"].copy()

    # Add extra fields not in schema
    data["extra_field_1"] = "Should be ignored"
    data["unknown_field"] = "Also ignored"

    result = fill_template("hiring_intro_email", data)

    # Should still succeed
    assert result["ok"] == True

    # Extra fields should NOT be in used_fields
    assert "extra_field_1" not in result["used_fields"]
    assert "unknown_field" not in result["used_fields"]


def test_error_response_structure():
    """Test that all error responses have consistent structure"""
    # Test TEMPLATE_NOT_FOUND error
    result1 = fill_template("nonexistent", {})
    assert "ok" in result1
    assert "error_code" in result1
    assert "message" in result1

    # Test MISSING_FIELDS error
    result2 = fill_template("hiring_intro_email", {})
    assert "ok" in result2
    assert "error_code" in result2
    assert "message" in result2
    assert "missing_fields" in result2


def test_empty_field_values_treated_as_missing():
    """Test that empty strings are still provided (not treated as missing)"""
    # Provide all required fields, but some are empty strings
    data = {
        "candidate_name": "",  # Empty but provided
        "position_title": "Engineer",
        "recruiter_name": "John",
        "company_name": "Corp"
    }

    result = fill_template("hiring_intro_email", data)

    # Should succeed (empty string is still a value)
    assert result["ok"] == True
