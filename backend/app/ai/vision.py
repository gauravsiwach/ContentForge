"""GPT-4o Vision — analyze images for viral DNA."""

import json
from app.models.settings import ProviderSettings
from app.ai.provider import get_client


async def analyze_image_for_dna(
    settings: ProviderSettings,
    image_url: str,
    category: str,
) -> dict:
    """Analyze an image using GPT-4o vision to extract viral DNA profile."""
    client = get_client(settings)
    model = settings.model or "gpt-4o"

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Analyze this viral {category} social media image and extract its visual DNA.

Respond in this exact JSON format:
{{
  "colors": ["#hex1", "#hex2", "#hex3"],
  "style": "bold_minimal|cinematic|flat|editorial|lifestyle",
  "mood": "energetic|calm|inspiring|humorous|dramatic|professional",
  "cta": "save_share|comment|follow|shop|challenge",
  "hooks": ["hook1", "hook2"],
  "composition": "center|rule_of_thirds|symmetry|dynamic",
  "text_overlay": true,
  "face_visible": false
}}""",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url, "detail": "low"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
    )

    content = response.choices[0].message.content or "{}"
    return json.loads(content)


async def analyze_multiple_images(
    settings: ProviderSettings,
    image_urls: list[str],
    category: str,
) -> dict:
    """Analyze multiple images and merge their DNA into a composite profile."""
    profiles = []
    for url in image_urls[:3]:  # cap at 3 to control cost
        try:
            profile = await analyze_image_for_dna(settings, url, category)
            profiles.append(profile)
        except Exception:
            continue

    if not profiles:
        return _default_dna(category)

    # Merge: pick most common values
    merged = _merge_profiles(profiles)
    return merged


def _default_dna(category: str) -> dict:
    return {
        "colors": ["#7C3AED", "#06B6D4", "#10B981"],
        "style": "bold_minimal",
        "mood": "energetic",
        "cta": "save_share",
        "hooks": ["transformation", "results"],
        "composition": "center",
        "text_overlay": False,
        "face_visible": False,
    }


def _merge_profiles(profiles: list[dict]) -> dict:
    """Simple merge — flatten and deduplicate."""
    all_colors = []
    all_hooks = []
    styles = []
    moods = []
    ctas = []

    for p in profiles:
        all_colors.extend(p.get("colors", []))
        all_hooks.extend(p.get("hooks", []))
        if p.get("style"):
            styles.append(p["style"])
        if p.get("mood"):
            moods.append(p["mood"])
        if p.get("cta"):
            ctas.append(p["cta"])

    def most_common(lst: list) -> str | None:
        return max(set(lst), key=lst.count) if lst else None

    return {
        "colors": list(dict.fromkeys(all_colors))[:5],
        "style": most_common(styles) or "bold_minimal",
        "mood": most_common(moods) or "energetic",
        "cta": most_common(ctas) or "save_share",
        "hooks": list(dict.fromkeys(all_hooks))[:4],
        "composition": profiles[0].get("composition", "center"),
        "text_overlay": profiles[0].get("text_overlay", False),
        "face_visible": profiles[0].get("face_visible", False),
    }
