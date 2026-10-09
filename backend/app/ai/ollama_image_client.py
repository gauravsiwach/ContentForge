import httpx
import base64
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

class OllamaImageClient:
    """Client for Ollama image generation API (mirrored from ContentFlow)"""

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        # Use settings.OLLAMA_BASE_URL if available, otherwise default to standard Ollama port
        self.base_url = base_url or getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = model or getattr(settings, 'OLLAMA_IMAGE_MODEL', 'flux')
        self.timeout = 300  # 5 minutes default for image gen

    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        """
        Generate an image from text prompt using Ollama's image endpoint
        """
        # Ensure base_url doesn't have trailing slash for consistent URL construction
        base = self.base_url.rstrip('/')
        url = f"{base}/v1/images/generations"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "size": size,
            "n": 1,
            "response_format": "b64_json"
        }

        logger.info(f"Generating local image with model: {self.model}, prompt: {prompt[:100]}...")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

                # Extract base64 image data
                image_b64 = data["data"][0]["b64_json"]
                image_bytes = base64.b64decode(image_b64)

                logger.info(f"Local image generated successfully, size: {len(image_bytes)} bytes")
                return image_bytes

        except httpx.HTTPError as e:
            logger.error(f"HTTP error generating local image: {e}")
            raise Exception(f"Failed to generate local image: {e}")
        except Exception as e:
            logger.error(f"Error generating local image: {e}")
            raise Exception(f"Failed to generate local image: {e}")
