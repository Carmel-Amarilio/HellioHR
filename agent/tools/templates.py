"""
Email template loading and rendering for Hellio HR agent.
"""

import os
import yaml
from typing import Dict, Any, Optional


class TemplateLoader:
    """Loads and renders email templates from YAML file."""

    def __init__(self, template_file: str = None):
        """
        Initialize template loader.

        Args:
            template_file: Path to YAML template file. Defaults to config/draft_templates.yaml
        """
        if template_file is None:
            # Default to config/draft_templates.yaml relative to agent directory
            agent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_file = os.path.join(agent_dir, 'config', 'draft_templates.yaml')

        self.template_file = template_file
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, Dict[str, str]]:
        """Load templates from YAML file."""
        try:
            with open(self.template_file, 'r', encoding='utf-8') as f:
                templates = yaml.safe_load(f)
            print(f"[Templates] Loaded {len(templates)} templates from {self.template_file}")
            return templates
        except Exception as e:
            print(f"[Templates] ERROR Failed to load templates: {e}")
            return {}

    def render(self, template_name: str, variables: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        Render a template with variables.

        Args:
            template_name: Name of template (e.g., 'candidate_welcome')
            variables: Dict of variables to substitute (e.g., {'candidate_name': 'Jane', ...})

        Returns:
            Dict with 'subject' and 'body' keys, or None if template not found
        """
        if template_name not in self.templates:
            print(f"[Templates] ERROR Template '{template_name}' not found")
            return None

        template = self.templates[template_name]

        try:
            # Render subject and body with variable substitution
            subject = template['subject'].format(**variables)
            body = template['body'].format(**variables)

            return {
                'subject': subject,
                'body': body
            }
        except KeyError as e:
            print(f"[Templates] ERROR Missing variable in template '{template_name}': {e}")
            return None
        except Exception as e:
            print(f"[Templates] ERROR Failed to render template '{template_name}': {e}")
            return None

    def list_templates(self) -> list:
        """List all available template names."""
        return list(self.templates.keys())


# Singleton instance
_template_loader = None


def get_template_loader() -> TemplateLoader:
    """Get singleton template loader instance."""
    global _template_loader
    if _template_loader is None:
        _template_loader = TemplateLoader()
    return _template_loader


def render_template(template_name: str, variables: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """
    Convenience function to render a template.

    Args:
        template_name: Name of template
        variables: Dict of variables to substitute

    Returns:
        Dict with 'subject' and 'body', or None if error
    """
    loader = get_template_loader()
    return loader.render(template_name, variables)
