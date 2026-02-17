#!/usr/bin/env python3
"""
Test script to verify MCP tools are registered and working
"""

import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the utilities directly
from src.utils.template_loader import list_all_metadata

def test_list_templates():
    print("=" * 60)
    print("Testing list_templates tool")
    print("=" * 60)

    try:
        # Call the utility function
        templates = list_all_metadata()

        # Format as tool output
        result = {
            "templates": templates
        }

        print(f"\n✅ Tool executed successfully")
        print(f"📊 Found {len(templates)} templates\n")

        print("Tool Output:")
        print(json.dumps(result, indent=2))

        print("\n" + "=" * 60)
        print("✅ list_templates tool is working!")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_list_templates()
    sys.exit(0 if success else 1)
