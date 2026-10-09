"""Local FLUX and DALL-E 3 image generation + Pillow text compositing."""

import uuid
import textwrap
from typing import Awaitable, Callable
import httpx
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from app.models.settings import ProviderSettings
from app.ai.provider import get_client
from app.ai.comfyui_client import generate_workflow_image
from app.config import settings as app_settings

ProgressCallback = Callable[[int | None, str], Awaitable[None]]

async def generate_images(
    settings: ProviderSettings,
    prompt: str,
    size: str = "1024x1024",
    n: int = 2,
    progress_callback: ProgressCallback | None = None,
) -> list[dict]:
    """Generate images with the configured ComfyUI workflow or OpenAI."""
    results = []

    if settings.task_type == "image" and (settings.mode == "local" or settings.provider == "comfyui"):
        assets_dir = Path(app_settings.ASSETS_DIR)
        assets_dir.mkdir(parents=True, exist_ok=True)
        # ComfyUI returns one image per workflow execution, so submit one job per option.
        count = min(n, 4)
        for index in range(count):
            filepath = assets_dir / f"{uuid.uuid4()}.png"

            async def report_image_progress(
                percentage: int | None, message: str, image_index: int = index
            ) -> None:
                if progress_callback:
                    overall = (
                        round((image_index + percentage / 100) * 100 / count)
                        if percentage is not None
                        else None
                    )
                    await progress_callback(overall, f"Image {image_index + 1} of {count}: {message}")

            saved_path = await generate_workflow_image(
                prompt,
                base_url=settings.base_url,
                output_path=filepath,
                progress_callback=report_image_progress,
            )
            asset_url = f"/assets/{saved_path.name}"
            results.append({"url": asset_url, "local_path": str(saved_path), "asset_url": asset_url})
        return results

    client = get_client(settings)
    model = settings.model or "dall-e-3"
    for _ in range(min(n, 4)):
        response = await client.images.generate(
            model=model,
            prompt=prompt,
            size=size,  # type: ignore[arg-type]
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        if image_url:
            local_path, asset_url = await _download_image(image_url)
            results.append({"url": image_url, "local_path": local_path, "asset_url": asset_url})

    return results

async def _download_image(url: str) -> tuple[str, str]:
    """Download image to assets dir, return (local_path, servable asset_url)."""
    assets_dir = Path(app_settings.ASSETS_DIR)
    assets_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}.png"
    filepath = assets_dir / filename

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(url)
        response.raise_for_status()
        filepath.write_bytes(response.content)

    return str(filepath), f"/assets/{filename}"

def composite_text_on_image(
    image_path: str,
    overlay_text: str,
    dna_profile: dict | None = None,
) -> str:
    """
    Render overlay_text onto a background image using Pillow.
    """
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)

    font_size = max(36, int(w * 0.07))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
        font_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()
        font_bold = font

    primary_color = dna_profile.get("colors", ["#FFFFFF"])[0] if dna_profile else "#FFFFFF"
    text_color = _contrast_color(primary_color)
    composition = dna_profile.get("composition", "center") if dna_profile else "center"

    max_chars = max(10, int(w / (font_size * 0.6)))
    lines = textwrap.wrap(overlay_text, width=max_chars)
    line_height = font_size + 8
    total_text_h = len(lines) * line_height

    if composition == "lower_third":
        text_y = h - total_text_h - int(h * 0.10)
    else:
        text_y = (h - total_text_h) // 2

    shadow_offset = max(2, font_size // 18)
    shadow_color = (0, 0, 0, 180)

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_bold)
        line_w = bbox[2] - bbox[0]
        x = (w - line_w) // 2
        y = text_y + i * line_height
        draw.text((x + shadow_offset, y + shadow_offset), line, font=font_bold, fill=shadow_color)
        draw.text((x, y), line, font=font_bold, fill=text_color)

    assets_dir = Path(app_settings.ASSETS_DIR)
    assets_dir.mkdir(parents=True, exist_ok=True)
    out_path = assets_dir / f"{uuid.uuid4()}_composited.png"
    img = img.convert("RGB")
    img.save(str(out_path), "PNG")
    return str(out_path)

def _contrast_color(hex_color: str) -> tuple:
    """Return white or black RGBA based on luminance of the given hex color."""
    try:
        h = hex_color.lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return (0, 0, 0, 255) if luminance > 0.55 else (255, 255, 255, 255)
    except Exception:
        return (255, 255, 255, 255)

def build_image_prompt(
    category: str,
    caption: str | None = None,
    dna_profile: dict | None = None,
    style_preset: str = "minimal",
    enhancement: str | None = None,
) -> str:
    """Build an optimized image prompt from content context."""
    style_descriptions = {
        "minimal": "clean minimal design, white space, professional",
        "bold": "bold typography, high contrast, vibrant colors, energetic",
        "cinematic": "cinematic lighting, dramatic shadows, photorealistic, moody atmosphere",
        "flat": "flat design, geometric shapes, pastel colors, modern illustration",
    }
    style_desc = style_descriptions.get(style_preset, style_descriptions["minimal"])
    mood = f", {dna_profile.get('mood', 'energetic')} mood" if dna_profile else ""
    caption_context = f", inspired by: {caption[:80]}" if caption else ""
    enhancement_context = f", {enhancement}" if enhancement else ""

    return (
        f"Social media {category} content image, {style_desc}{mood}{caption_context}"
        f"{enhancement_context}. No text or watermarks. Square format, high quality."
    )
