"""Vision-model analysis for project-level Viral DNA profiles."""

import json
import logging
from collections import Counter

from app.ai.image_input import fetch_image_data_url
from app.ai.provider import get_client
from app.models.settings import ProviderSettings

logger = logging.getLogger(__name__)

DNA_ANALYSIS_PROMPT = """Analyze this reference image to extract reusable creative DNA for an original social-media post in the {category} category. Describe both what is visible and why its communication may work; do not reproduce the reference.

Evidence and originality:
- Base every observation on visible evidence. Never infer virality, trend status, popularity, or performance from an image alone.
- Do not quote visible copy or recommend copying identifiable people, logos, or distinctive branded designs. Paraphrase the message and generalize the technique.
- Identify hook mechanisms (such as curiosity, relatability, surprise, aspiration, humor, or contrast) only when supported by visible text or visual evidence. For each, state the mechanism and the evidence/pattern that supports it. Return [] if none is supported.
- Keep observations separate from creative_direction. Recommend one fresh, specific concept for this category, applying useful visual/emotional principles without imitating the reference.
- Make text-based findings informative and concrete: describe observed placement, hierarchy, contrast, scale, and lighting rather than using one-word labels. Use concise complete phrases.
- In the recommendation, prioritize mobile readability, a clear visual hierarchy, concise messaging, and originality. Do not invent a finished slogan or claim that a technique will perform well.
- If evidence is insufficient, use \"unclear\", \"none\", or an empty array instead of guessing.

Return valid JSON only, with exactly these keys and types:
{{
  "colors": ["#hex1", "#hex2", "#hex3"],
  "style": "bold_minimal|cinematic|flat|editorial|lifestyle",
  "mood": "energetic|calm|inspiring|humorous|dramatic|professional",
  "cta": "save_share|comment|follow|shop|challenge|none|unclear",
  "hooks": ["mechanism — evidence-based generalized pattern"],
  "composition": "center|rule_of_thirds|symmetry|dynamic",
  "text_overlay": true,
  "face_visible": false,
  "lighting": "specific visible light, color, and shadow qualities, or unclear",
  "typography": "visible font impression, scale, hierarchy, and placement, or none",
  "visible_text_summary": "brief paraphrase of the message, or none",
  "attention_hierarchy": "what attracts attention first, second, and third, based on visible evidence",
  "creative_direction": "a concrete original concept with visual execution guidance for this category"
}}

Choose exactly one listed style, mood, and composition value. Return three to five dominant colors as estimated hex codes. Set text_overlay and face_visible strictly from visual evidence. Use a CTA only when one is explicit and legible; otherwise return none or unclear. Keep hooks to up to three supported mechanisms, each as a concise mechanism-plus-evidence phrase. Write lighting, typography, visible_text_summary, attention_hierarchy, and creative_direction as useful concise sentences, not generic labels. Do not add keys, markdown, or explanation."""


async def analyze_image_for_dna(
    settings: ProviderSettings,
    image_url: str,
    category: str,
) -> dict:
    """Fetch an image and ask the configured compatible vision model to analyze it."""
    image_data_url = await fetch_image_data_url(image_url)
    client = get_client(settings)
    model = settings.model or "gpt-4o"

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": DNA_ANALYSIS_PROMPT.format(category=category)},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url, "detail": "low"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        max_tokens=1100,
    )

    content = response.choices[0].message.content or "{}"
    result = json.loads(content)
    if not isinstance(result, dict):
        raise ValueError("Vision model returned a non-object profile")
    logger.info(
        "Viral DNA image analysis succeeded provider=%s model=%s",
        settings.provider,
        model,
    )
    return result


async def analyze_multiple_images(
    settings: ProviderSettings,
    image_urls: list[str],
    category: str,
) -> dict:
    """Analyze up to three references and merge the successful visual observations."""
    profiles = []
    for index, url in enumerate(image_urls[:3], start=1):
        try:
            profiles.append(await analyze_image_for_dna(settings, url, category))
        except Exception as exc:
            logger.warning(
                "Viral DNA reference analysis failed provider=%s image_index=%d error_type=%s",
                settings.provider,
                index,
                type(exc).__name__,
            )

    if not profiles:
        raise RuntimeError("Vision analysis failed for every reference image")
    return _merge_profiles(profiles)


def _merge_profiles(profiles: list[dict]) -> dict:
    """Combine repeated observations while retaining actionable visual guidance."""
    colors = _unique_strings(profiles, "colors", limit=5)
    hooks = _unique_strings(profiles, "hooks", limit=5)
    creative_directions = _unique_strings(profiles, "creative_direction", limit=3)

    result = {
        "colors": colors,
        "style": _most_common(profiles, "style", "bold_minimal"),
        "mood": _most_common(profiles, "mood", "inspiring"),
        "cta": _most_common(profiles, "cta", "unclear"),
        "hooks": hooks,
        "composition": _most_common(profiles, "composition", "center"),
        "text_overlay": any(profile.get("text_overlay") is True for profile in profiles),
        "face_visible": any(profile.get("face_visible") is True for profile in profiles),
        "lighting": _most_common(profiles, "lighting", "unclear"),
        "typography": _most_common(profiles, "typography", "none"),
        "visible_text_summary": _most_common(profiles, "visible_text_summary", "none"),
        "attention_hierarchy": _most_common(profiles, "attention_hierarchy", "unclear"),
        "creative_direction": creative_directions[0] if creative_directions else "",
    }
    return result


def _most_common(profiles: list[dict], key: str, default: str) -> str:
    values = [profile.get(key) for profile in profiles]
    valid_values = [value for value in values if isinstance(value, str) and value.strip()]
    return Counter(valid_values).most_common(1)[0][0] if valid_values else default


def _unique_strings(profiles: list[dict], key: str, limit: int) -> list[str]:
    values: list[str] = []
    for profile in profiles:
        value = profile.get(key)
        candidates = value if isinstance(value, list) else [value]
        for candidate in candidates:
            if isinstance(candidate, str) and candidate.strip() and candidate not in values:
                values.append(candidate.strip())
                if len(values) >= limit:
                    return values
    return values
