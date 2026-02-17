"""
Bedrock LLM Client - Non-Streaming
Mirrors the TypeScript backend's BedrockLLMClient.ts
Uses InvokeModel (non-streaming) instead of InvokeModelWithResponseStream
"""

import os
import json
import boto3
from typing import Dict, Optional


class BedrockClient:
    """
    AWS Bedrock client using non-streaming API (InvokeModel)
    Same approach as TypeScript backend to avoid IAM permission issues
    """

    def __init__(
        self,
        model_id: str = None,
        region: str = None,
        access_key: str = None,
        secret_key: str = None
    ):
        """
        Initialize Bedrock client with non-streaming API

        Args:
            model_id: Bedrock model ID (e.g., 'amazon.nova-lite-v1:0')
            region: AWS region (default: us-east-1)
            access_key: AWS access key (default: from env)
            secret_key: AWS secret key (default: from env)
        """
        self.model_id = model_id or os.getenv('BEDROCK_MODEL', 'amazon.nova-lite-v1:0')
        self.region = region or os.getenv('AWS_REGION', 'us-east-1')

        # Initialize boto3 client (non-streaming)
        self.client = boto3.client(
            service_name='bedrock-runtime',
            region_name=self.region,
            aws_access_key_id=access_key or os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=secret_key or os.getenv('AWS_SECRET_ACCESS_KEY')
        )

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.3
    ) -> Dict:
        """
        Generate text using Bedrock (non-streaming)
        Mirrors TypeScript backend's generate() method

        Args:
            prompt: User prompt
            system_prompt: System instructions (optional)
            max_tokens: Max tokens to generate
            temperature: Sampling temperature

        Returns:
            dict: {
                "text": str,
                "usage": {
                    "promptTokens": int,
                    "completionTokens": int,
                    "totalTokens": int
                },
                "modelId": str
            }
        """
        # Determine model type
        is_nova = self.model_id.startswith('amazon.nova')
        is_claude = self.model_id.startswith('anthropic.claude')

        if not is_nova and not is_claude:
            raise ValueError(f"Unsupported model: {self.model_id}")

        # Build request body
        if is_nova:
            request_body = self._build_nova_request(prompt, system_prompt, max_tokens, temperature)
        else:
            request_body = self._build_claude_request(prompt, system_prompt, max_tokens, temperature)

        # Call Bedrock using InvokeModel (non-streaming)
        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )

            # Parse response
            response_body = json.loads(response['body'].read())

            # Extract text and usage
            if is_nova:
                result = self._parse_nova_response(response_body)
            else:
                result = self._parse_claude_response(response_body)

            return {
                "text": result["text"],
                "usage": result["usage"],
                "modelId": self.model_id
            }

        except Exception as e:
            if 'AccessDeniedException' in str(e):
                raise PermissionError(
                    f"AWS Bedrock access denied for model {self.model_id}. "
                    "Ensure IAM user has bedrock:InvokeModel permission."
                )
            raise

    def _build_nova_request(self, prompt: str, system_prompt: Optional[str], max_tokens: int, temperature: float) -> Dict:
        """Build request for Amazon Nova models (same as TypeScript backend)"""
        user_message = prompt
        if system_prompt:
            user_message = f"{system_prompt}\n\n{prompt}"

        return {
            "schemaVersion": "messages-v1",
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": user_message}]
                }
            ],
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": temperature
            }
        }

    def _build_claude_request(self, prompt: str, system_prompt: Optional[str], max_tokens: int, temperature: float) -> Dict:
        """Build request for Anthropic Claude models (same as TypeScript backend)"""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": temperature
        }

        if system_prompt:
            body["system"] = system_prompt

        return body

    def _parse_nova_response(self, response_body: Dict) -> Dict:
        """Parse Amazon Nova response (same as TypeScript backend)"""
        text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '')
        usage = response_body.get('usage', {})

        return {
            "text": text,
            "usage": {
                "promptTokens": usage.get('inputTokens', 0),
                "completionTokens": usage.get('outputTokens', 0),
                "totalTokens": usage.get('totalTokens', 0)
            }
        }

    def _parse_claude_response(self, response_body: Dict) -> Dict:
        """Parse Anthropic Claude response (same as TypeScript backend)"""
        text = response_body.get('content', [{}])[0].get('text', '')
        usage = response_body.get('usage', {})

        return {
            "text": text,
            "usage": {
                "promptTokens": usage.get('input_tokens', 0),
                "completionTokens": usage.get('output_tokens', 0),
                "totalTokens": usage.get('input_tokens', 0) + usage.get('output_tokens', 0)
            }
        }


# Singleton instance
_bedrock_client = None

def get_bedrock_client() -> BedrockClient:
    """Get singleton Bedrock client instance"""
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = BedrockClient()
    return _bedrock_client
