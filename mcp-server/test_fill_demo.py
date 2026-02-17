#!/usr/bin/env python3
"""
Demo script for fill_template tool

Shows actual rendered output for each template type
"""

import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.tools.fill_template import fill_template
from src.utils.template_loader import load_metadata

def print_separator(char="=", length=70):
    print(char * length)

def demo_fill_template():
    print_separator()
    print(" fill_template Tool Demonstration")
    print_separator()

    templates = [
        "hiring_intro_email",
        "rejection_email",
        "job_description",
        "nda_interview_invitation"
    ]

    for i, template_id in enumerate(templates, 1):
        print(f"\n{i}️⃣  Template: {template_id}")
        print_separator("-")

        # Load metadata and get example data
        metadata = load_metadata(template_id)
        example_data = metadata["example"]

        # Render template
        result = fill_template(template_id, example_data)

        if result["ok"]:
            print(f"✅ Status: SUCCESS")
            print(f"📝 Template: {result['template_id']}")
            print(f"📊 Used fields: {len(result['used_fields'])}")
            print(f"\n📄 Rendered Document (first 500 chars):")
            print_separator("-", 70)
            print(result["rendered_document"][:500] + "...")
            print_separator("-", 70)
            print(f"📏 Full length: {len(result['rendered_document'])} characters")
        else:
            print(f"❌ Status: FAILED")
            print(f"🚫 Error: {result['error_code']}")
            print(f"💬 Message: {result['message']}")

    # Test error cases
    print("\n" + "=" * 70)
    print(" Error Handling Demonstration")
    print_separator()

    print("\n❌ Test 1: Missing Required Fields")
    print_separator("-")
    incomplete_data = {
        "candidate_name": "John Doe"
        # Missing: position_title, recruiter_name, company_name
    }
    result = fill_template("hiring_intro_email", incomplete_data)
    print(json.dumps(result, indent=2))

    print("\n❌ Test 2: Nonexistent Template")
    print_separator("-")
    result = fill_template("nonexistent_template", {"some": "data"})
    print(json.dumps(result, indent=2))

    print("\n" + "=" * 70)
    print("✅ Demonstration Complete!")
    print_separator()

if __name__ == "__main__":
    demo_fill_template()
