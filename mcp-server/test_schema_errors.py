#!/usr/bin/env python3
"""
Test error handling for get_template_schema MCP tool
"""

import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the tool function directly
from src.tools.get_template_schema import get_template_schema

def test_error_responses():
    print("=" * 60)
    print("Testing get_template_schema Error Handling")
    print("=" * 60)

    # Test 1: Nonexistent template
    print("\n1️⃣  Test: Nonexistent template")
    print("-" * 60)
    result = get_template_schema("nonexistent_template")
    print(json.dumps(result, indent=2))

    assert result["ok"] == False, "Expected ok=False"
    assert "error_code" in result, "Missing error_code"
    assert "message" in result, "Missing message"
    assert result["error_code"] == "TEMPLATE_NOT_FOUND"
    print("✅ PASS: Error structure correct")

    # Test 2: Valid template (success case)
    print("\n2️⃣  Test: Valid template")
    print("-" * 60)
    result = get_template_schema("hiring_intro_email")

    assert result["ok"] == True, "Expected ok=True"
    assert "id" in result, "Missing id"
    assert "required_fields" in result, "Missing required_fields"
    assert "optional_fields" in result, "Missing optional_fields"
    print(f"✅ PASS: Schema returned for {result['name']}")
    print(f"   Required fields: {len(result['required_fields'])}")
    print(f"   Optional fields: {len(result['optional_fields'])}")

    # Test 3: Verify error response structure
    print("\n3️⃣  Test: Error response structure")
    print("-" * 60)
    error_result = get_template_schema("another_nonexistent")

    required_error_keys = ["ok", "error_code", "message"]
    for key in required_error_keys:
        assert key in error_result, f"Missing required error key: {key}"
        print(f"   ✅ Has key: {key}")

    print("\n" + "=" * 60)
    print("✅ All error handling tests passed!")
    print("=" * 60)

if __name__ == "__main__":
    test_error_responses()
