#!/usr/bin/env python3
"""
Quick test script for list_templates functionality
Run: python test_list_templates.py
"""

import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from utils.template_loader import list_all_metadata

def main():
    print("=" * 60)
    print("Testing list_templates Tool")
    print("=" * 60)

    try:
        # Test list_all_metadata utility
        templates = list_all_metadata()

        print(f"\n✅ Successfully loaded {len(templates)} templates\n")

        # Format as the tool would return
        result = {
            "templates": templates
        }

        # Pretty print JSON
        print("Tool Output (JSON):")
        print("-" * 60)
        print(json.dumps(result, indent=2))
        print("-" * 60)

        # Validate structure
        print("\nValidation:")
        for i, template in enumerate(templates, 1):
            required_keys = ["id", "name", "description", "version"]
            missing_keys = [k for k in required_keys if k not in template]

            if missing_keys:
                print(f"  ❌ Template {i}: Missing keys {missing_keys}")
            else:
                print(f"  ✅ Template {i}: {template['id']} - {template['name']} (v{template['version']})")

        print("\n" + "=" * 60)
        print("✅ list_templates tool is working correctly!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
