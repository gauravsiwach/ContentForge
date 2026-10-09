"""GPT-4o text generation — captions and trends."""

import json
import logging
from sqlalchemy.orm import Session
from app.models.settings import ProviderSettings
from app.ai.provider import get_client

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

async def generate_content(
    settings: ProviderSettings,
    category: str,
    platform: str,
    dna_profile: dict | None = None,
    trend_topic: str | None = None,
    enhancement: str | None = None,
) -> dict:
    """
    Generate 3 content variants using GPT-4o.
    Each variant has overlay_text (goes ON the image), feed_caption, and hashtags.
    """
    logger.info(f"Generating content for category: {category}, platform: {platform}")
    client = get_client(settings)
    model = settings.model or "gpt-4o"

    dna_context = ""
    if dna_profile:
        dna_context = (
            f"\nViral DNA: style={dna_profile.get('style')}, "
            f"mood={dna_profile.get('mood')}, CTA={dna_profile.get('cta')}, "
            f"hooks={dna_profile.get('hooks')}"
        )

    trend_context = f"\nTrending topic/angle: {trend_topic}" if trend_topic else ""
    enhancement_context = f"\nUser enhancement request: {enhancement}" if enhancement else ""

    system_prompt = (
        "You are an expert social media content creator. "
        "Your output drives both the text rendered on the image itself "
        "and the caption posted in the feed."
    )

    user_prompt = f"""Generate 3 content variants for a {platform} post in the {category} niche.
{dna_context}{trend_context}{enhancement_context}

For EACH variant produce:
1. overlay_text — the short punchy text displayed ON the image itself.
   Rules: max 10 words, no hashtags, must be impactful as a standalone statement.
   Examples by niche:
     Motivation → "Discipline beats motivation. Every single day."
     Fitness    → "No gym? No excuse. 20 min. Full body."
     Food       → "5 ingredients. 15 minutes. Unforgettable."
     Tech       → "The AI tool 90% of creators still don't know."
     Travel     → "One yes. That's all it takes."

2. feed_caption — longer text posted BELOW the image in the feed.
   Rules: engaging, platform-optimised, includes emojis and a clear CTA, 2-4 sentences.

3. hashtags — list of 8-15 relevant hashtags.

Respond in this exact JSON format:
{{
  "variants": [
    {{
      "overlay_text": "short punchy text for image",
      "feed_caption": "longer feed caption with emojis and CTA",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }},
    {{
      "overlay_text": "short punchy text for image",
      "feed_caption": "longer feed caption with emojis and CTA",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }},
    {{
      "overlay_text": "short punchy text for image",
      "feed_caption": "longer feed caption with emojis and CTA",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }}
  ]
}}"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        content = response.choices[0].message.content or "{}"
        logger.info(f"Content generated successfully using model: {model}")
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error generating content with model {model}: {str(e)}")
        raise e


async def generate_trends(
    settings: ProviderSettings,
    category: str,
    platform: str = "instagram",
) -> dict:
    """Generate trending topics for a category using GPT-4o."""
    logger.info(f"Generating trends for category: {category} on {platform}")
    client = get_client(settings)
    model = settings.model or "gpt-4o"

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a social media trend analyst with expertise in viral content patterns.",
                },
                {
                    "role": "user",
                    "content": f"""List 6 currently trending topics in the {category} niche on {platform}.
For each topic provide a virality score (0-100).

Respond in this exact JSON format:
{{
  "topics": [
    {{"topic": "topic name", "score": 92, "description": "why it's trending"}},
    {{"topic": "topic name", "score": 87, "description": "why it's trending"}}
  ]
}}""",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        content = response.choices[0].message.content or "{}"
        logger.info(f"Trends generated successfully using model: {model}")
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error generating trends with model {model}: {str(e)}")
        raise e


async def generate_script(
    settings: ProviderSettings,
    category: str,
    platform: str = "instagram",
    duration_target: int = 30,
    dna_profile: dict | None = None,
    trend_topic: str | None = None,
    enhancement: str | None = None,
) -> dict:
    """Generate a scene-by-scene reel script using GPT-4o. Returns dict with a scenes list."""
    logger.info(f"Generating script for category: {category}, topic: {trend_topic}")
    client = get_client(settings)
    model = settings.model or "gpt-4o"

    dna_context = ""
    if dna_profile:
        dna_context = f"\nViral DNA profile: hook={dna_profile.get('hooks')}, mood={dna_profile.get('mood')}, CTA={dna_profile.get('cta')}"

    trend_context = f"\nTrending topic to align with: {trend_topic}" if trend_topic else ""
    enhancement_context = f"\nUser enhancement request: {enhancement}" if enhancement else ""

    system_prompt = (
        "You are an expert short-form video scriptwriter specializing in viral hooks and pacing."
    )

    user_prompt = f"""Write a {duration_target}-second scene-by-scene script for a {platform} reel in the {category} niche.
{dna_context}{trend_context}{enhancement_context}

Break it into 4 scenes: Hook, Context, Core, CTA. For each scene provide narration, a visual description for
an AI image generator, and a duration in seconds that sums to about {duration_target}s total.

Respond in this exact JSON format:
{{
  "scenes": [
    {{"scene_number": 1, "narration": "...", "visual_desc": "...", "duration_sec": 3}},
    {{"scene_number": 2, "narration": "...", "visual_desc": "...", "duration_sec": 7}},
    {{"scene_number": 3, "narration": "...", "visual_desc": "...", "duration_sec": 15}},
    {{"scene_number": 4, "narration": "...", "visual_desc": "...", "duration_sec": 5}}
  ]
}}"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        content = response.choices[0].message.content or "{}"
        logger.info(f"Script generated successfully using model: {model}")
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error generating script with model {model}: {str(e)}")
        raise e
