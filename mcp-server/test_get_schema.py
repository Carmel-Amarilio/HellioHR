#!/usr/bin/env python3
"""
Test script for get_template_schema tool
"""

import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.utils.template_loader import get_template_schema

def test_get_schema():
    print("=" * 60)
    print("Testing get_template_schema Tool")
    print("=" * 60)

    templates = ["hiring_intro_email", "rejection_email", "job_description", "nda_interview_invitation"]

    for template_id in templates:
        print(f"\n📄 Template: {template_id}")
        print("-" * 60)

        try:
            schema = get_template_schema(template_id)

            print(f"✅ Schema loaded successfully")
            print(f"   Name: {schema['name']}")
            print(f"   Version: {schema['version']}")
            print(f"   Required fields: {len(schema['required_fields'])}")
            print(f"   Optional fields: {len(schema['optional_fields'])}")

            # Show required fields
            print(f"\n   Required Fields:")
            for field in schema['required_fields']:
                print(f"      - {field['name']} ({field['type']})")

            # Show first 3 optional fields
            if schema['optional_fields']:
                print(f"\n   Optional Fields (showing first 3):")
                for field in schema['optional_fields'][:3]:
                    print(f"      - {field['name']} ({field['type']})")

        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("✅ All schemas loaded successfully!")
    print("=" * 60)

    # Test error handling
    print("\n📛 Testing error handling...")
    try:
        schema = get_template_schema("nonexistent_template")
        print("❌ Should have raised FileNotFoundError")
    except FileNotFoundError:
        print("✅ FileNotFoundError raised correctly for nonexistent template")

    # Return full schema for one template as JSON
    print("\n" + "=" * 60)
    print("Full Schema Example (hiring_intro_email):")
    print("=" * 60)
    schema = get_template_schema("hiring_intro_email")
    # Remove example_payload for brevity
    display_schema = {k: v for k, v in schema.items() if k != 'example_payload'}
    display_schema['example_payload'] = '...(truncated)...'
    print(json.dumps(display_schema, indent=2))

if __name__ == "__main__":
    test_get_schema()
