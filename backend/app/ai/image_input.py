"""Safely fetch and encode a remote image for vision-model requests."""

import asyncio
import base64
import ipaddress
import socket
from io import BytesIO
from urllib.parse import urljoin, urlparse

import httpx
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_REDIRECTS = 3
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


class ImageInputError(ValueError):
    """Raised when a remote URL is unsafe or does not contain a supported image."""


async def fetch_image_data_url(image_url: str) -> str:
    """Fetch a public image URL and return a MIME-qualified base64 data URL."""
    current_url = image_url
    timeout = httpx.Timeout(15.0, connect=5.0)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for redirect_count in range(MAX_REDIRECTS + 1):
            await _validate_public_https_url(current_url)
            async with client.stream("GET", current_url) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    if redirect_count >= MAX_REDIRECTS:
                        raise ImageInputError("Image URL redirected too many times")
                    location = response.headers.get("location")
                    if not location:
                        raise ImageInputError("Image URL returned an invalid redirect")
                    current_url = urljoin(current_url, location)
                    continue

                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
                if not content_type.startswith("image/"):
                    raise ImageInputError("The URL did not return an image")

                content_length = response.headers.get("content-length")
                if content_length:
                    try:
                        length = int(content_length)
                    except ValueError as exc:
                        raise ImageInputError("Image response has an invalid content length") from exc
                    if length > MAX_IMAGE_BYTES:
                        raise ImageInputError("Image is too large (maximum 12 MB)")

                chunks: list[bytes] = []
                total_bytes = 0
                async for chunk in response.aiter_bytes():
                    total_bytes += len(chunk)
                    if total_bytes > MAX_IMAGE_BYTES:
                        raise ImageInputError("Image is too large (maximum 12 MB)")
                    chunks.append(chunk)
                image_bytes = b"".join(chunks)
                mime_type = _validate_image_bytes(image_bytes)
                encoded = base64.b64encode(image_bytes).decode("ascii")
                return f"data:{mime_type};base64,{encoded}"

    raise ImageInputError("Could not fetch the image")


async def _validate_public_https_url(image_url: str) -> None:
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ImageInputError("Enter a public HTTPS URL for an image")
    try:
        port = parsed.port
    except ValueError as exc:
        raise ImageInputError("Image URL has an invalid port") from exc
    if port not in (None, 443):
        raise ImageInputError("Image URLs on non-standard ports are not supported")

    host = parsed.hostname.rstrip(".")
    try:
        literal_ip = ipaddress.ip_address(host)
    except ValueError:
        literal_ip = None

    if literal_ip is not None:
        addresses = [literal_ip]
    else:
        try:
            records = await asyncio.to_thread(
                socket.getaddrinfo,
                host,
                443,
                type=socket.SOCK_STREAM,
            )
        except OSError as exc:
            raise ImageInputError("Could not resolve the image host") from exc
        addresses = [ipaddress.ip_address(record[4][0]) for record in records]

    if not addresses or any(not address.is_global for address in addresses):
        raise ImageInputError("Image URLs must resolve to a public host")


def _validate_image_bytes(image_bytes: bytes) -> str:
    if not image_bytes:
        raise ImageInputError("The image response was empty")
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image_format = image.format
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ImageInputError("Image dimensions are too large to analyze")
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageInputError("The URL did not return a valid image") from exc
    except Image.DecompressionBombError as exc:
        raise ImageInputError("Image dimensions are too large to analyze") from exc

    mime_type = SUPPORTED_IMAGE_FORMATS.get(image_format or "")
    if not mime_type:
        raise ImageInputError("Use a JPEG, PNG, or WebP image")
    return mime_type
