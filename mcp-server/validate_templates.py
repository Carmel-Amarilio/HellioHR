#!/usr/bin/env python3
"""
Quick validation script for templates and metadata
Run: python validate_templates.py
"""

import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

TEMPLATES_DIR = Path("templates")
METADATA_DIR = Path("metadata")

REQUIRED_TEMPLATES = [
    "hiring_intro_email",
    "rejection_email",
    "job_description",
    "nda_interview_invitation"
]

def main():
    print("=" * 60)
    print("Template & Metadata Validation")
    print("=" * 60)

    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    for template_id in REQUIRED_TEMPLATES:
        print(f"\n📄 {template_id}")

        # Check files exist
        template_file = TEMPLATES_DIR / f"{template_id}.j2"
        metadata_file = METADATA_DIR / f"{template_id}.json"

        if not template_file.exists():
            print(f"  ❌ Template file missing: {template_file}")
            continue

        if not metadata_file.exists():
            print(f"  ❌ Metadata file missing: {metadata_file}")
            continue

        # Load metadata
        with open(metadata_file) as f:
            metadata = json.load(f)

        print(f"  ✅ Files exist")
        print(f"  📝 Name: {metadata['name']}")
        print(f"  🔢 Version: {metadata['version']}")
        print(f"  📌 Required fields: {len(metadata['required'])}")
        print(f"  📍 Optional fields: {len(metadata['optional'])}")

        # Try rendering with example data
        try:
            template = env.get_template(f"{template_id}.j2")
            rendered = template.render(**metadata['example'])

            # Check for unrendered tags
            if "{{" in rendered or "}}" in rendered:
                print(f"  ⚠️  Warning: Unrendered Jinja2 tags detected")
            else:
                print(f"  ✅ Renders successfully ({len(rendered)} chars)")

            # Verify required fields appear in output
            missing_in_output = []
            for field in ['candidate_name', 'company_name', 'position_title']:
                if field in metadata['example']:
                    if metadata['example'][field] not in rendered:
                        missing_in_output.append(field)

            if missing_in_output:
                print(f"  ⚠️  Warning: Fields not in output: {missing_in_output}")

        except Exception as e:
            print(f"  ❌ Rendering failed: {e}")

    print("\n" + "=" * 60)
    print("✅ Validation Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
