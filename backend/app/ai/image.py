"""Local FLUX and DALL-E 3 image generation + Pillow text compositing."""

import uuid
import textwrap
import logging
from typing import Awaitable, Callable
import httpx
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from app.models.settings import ProviderSettings
from app.ai.provider import get_client
from app.ai.comfyui_client import generate_workflow_image
from app.config import settings as app_settings

logger = logging.getLogger(__name__)

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
    """Render the post headline onto the generated background, preserving one final asset."""
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    font_size = max(24, int(w * 0.085))
    font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    if not Path(font_path).exists():
        font_path = "/System/Library/Fonts/Helvetica.ttc"
    try:
        font_bold = ImageFont.truetype(font_path, font_size)
    except Exception:
        font_bold = ImageFont.load_default()

    profile = dna_profile or {}
    colors = profile.get("colors") or []
    primary_color = colors[0] if colors else "#FFFFFF"
    text_color = _readable_dna_color(primary_color) or (255, 255, 255, 255)
    composition = profile.get("composition", "center")

    max_width = int(w * 0.82)
    while font_size > 20:
        try:
            font_bold = ImageFont.truetype(font_path, font_size)
        except Exception:
            font_bold = ImageFont.load_default()
        max_chars = max(8, int(max_width / max(font_size * 0.56, 1)))
        lines = textwrap.wrap(overlay_text.strip(), width=max_chars) or [overlay_text.strip()]
        line_width = max(draw.textbbox((0, 0), line, font=font_bold)[2] for line in lines)
        if line_width <= max_width:
            break
        font_size -= 2

    line_height = int(font_size * 1.2)
    total_text_h = len(lines) * line_height

    if composition in ("rule_of_thirds", "lower_third", "dynamic"):
        text_y = h - total_text_h - int(h * 0.12)
    else:
        text_y = (h - total_text_h) // 2

    text_y = max(int(h * 0.08), min(text_y, h - total_text_h - int(h * 0.08)))
    padding_x, padding_y = int(w * 0.055), int(h * 0.035)
    widest = max(draw.textbbox((0, 0), line, font=font_bold)[2] for line in lines)
    box_left = max(0, (w - widest) // 2 - padding_x)
    box_right = min(w, (w + widest) // 2 + padding_x)
    overlay_draw.rounded_rectangle(
        (box_left, text_y - padding_y, box_right, text_y + total_text_h + padding_y),
        radius=max(8, int(w * 0.025)),
        fill=(0, 0, 0, 105),
    )

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font_bold)
        line_w = bbox[2] - bbox[0]
        x = (w - line_w) // 2
        y = text_y + i * line_height
        overlay_draw.text((x, y), line, font=font_bold, fill=text_color)

    path = Path(image_path)
    temp_path = path.with_name(f"{path.stem}_overlay_tmp.png")
    Image.alpha_composite(img, overlay).convert("RGB").save(str(temp_path), "PNG")
    temp_path.replace(path)
    logger.info("image.headline_composited path=%s dimensions=%sx%s", path.name, w, h)
    return str(path)


def _readable_dna_color(value: str) -> tuple | None:
    """Use a valid DNA accent only when it remains readable over the headline scrim."""
    try:
        color = value.lstrip("#")
        if len(color) != 6:
            return None
        rgb = tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))
        return (*rgb, 255) if sum(rgb) / (3 * 255) > 0.68 else (255, 255, 255, 255)
    except (AttributeError, ValueError):
        return None


def build_image_prompt(
    category: str,
    caption: str | None = None,
    dna_profile: dict | None = None,
    style_preset: str = "minimal",
    enhancement: str | None = None,
    trend_topic: str | None = None,
    background_only: bool = True,
) -> str:
    """Build a scene-focused image prompt; the app renders the headline separately."""
    style_descriptions = {
        "minimal": "minimal, restrained detail, generous negative space",
        "bold": "bold shapes, strong contrast, confident color",
        "cinematic": "cinematic light, depth, dramatic but natural shadows",
        "flat": "flat illustration, clean geometry, simple shapes",
    }
    profile = dna_profile or {}
    colors = [color for color in profile.get("colors", [])[:5] if isinstance(color, str)]
    selected_style = style_preset if style_preset in style_descriptions else "minimal"
    topic = " ".join((trend_topic or "").split())
    scene = " ".join((caption or "").split())
    user_direction = " ".join((enhancement or "").split())
    mood = profile.get("mood")
    composition = profile.get("composition")
    topic_key = topic.casefold().replace("&", "and")

    # This topic has a reviewed, concrete visual direction. Keep it scoped to this
    # trend so other motivation topics do not all inherit the same metaphor.
    if topic_key == "small wins and celebrating progress":
        color_names = {
            "#0066cc": "deep blue",
            "#ff4d4f": "coral-red",
            "#ffffff": "white",
            "#808080": "grey",
            "#f0f0f0": "soft-grey",
        }
        palette = [
            f"{color_names.get(color.casefold(), color)} ({color})"
            for color in colors
        ]
        dominant = palette[0] if palette else "deep blue (#0066cc)"
        accents = ", ".join(palette[1:]) or "coral-red, white, and soft-grey"
        selected_mood = mood.strip() if isinstance(mood, str) and mood.strip() else "inspiring"
        directions = [
            f"Create an original square 1:1 {selected_style} ({style_descriptions[selected_style]}) social-media image about {topic.casefold()}.",
            "A small green shoot grows from a crack beside a few ascending blue stone steps, catching a beam of warm morning light.",
            "Place the shoot in the lower-right third, with the steps leading the eye upward.",
            f"Use {dominant} as the dominant color, with restrained {accents} accents.",
            f"Natural dramatic shadows, realistic stone texture, atmospheric depth, {selected_mood} mood, clean professional art direction.",
            "Keep the upper-left area simple and uncluttered for a headline to be added later.",
        ]
    else:
        directions = [f"Create an original square 1:1 {selected_style} social-media image about {topic or category}."]
        if scene:
            directions.append(f"Show this scene: {scene}.")
        else:
            directions.append("Represent the concept with one specific, original scene and a clear focal point.")
        directions.append(style_descriptions[selected_style] + ".")
        if isinstance(mood, str) and mood.strip():
            directions.append(f"Mood: {mood.strip()}.")
        if colors:
            directions.append(f"Use {colors[0]} as the dominant color, with restrained accents from {', '.join(colors[1:]) or 'the same palette'}.")
        if isinstance(composition, str) and composition.strip():
            directions.append(f"Composition: {composition.strip()}.")

    if profile:
        directions.append("Use Visual DNA as inspiration, not as a template.")
    if user_direction:
        directions.append(f"Additional visual direction: {user_direction}.")
    if background_only:
        directions.append(
            "Background artwork only: absolutely no text, letters, numbers, signs, logos, watermarks, or text-like marks."
        )
    prompt = "\n".join(directions)
    logger.info("prompt build -> %s", prompt)
    return prompt
