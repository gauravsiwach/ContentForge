"""DNA injector — enrich AI prompts with viral DNA profile context."""


def inject_dna(base_prompt: str, dna_profile: dict) -> str:
    """Inject viral DNA into a base prompt to enhance AI generation."""
    if not dna_profile:
        return base_prompt

    parts = [base_prompt]

    style = dna_profile.get("style")
    if style:
        parts.append(f"Visual style: {style.replace('_', ' ')}")

    mood = dna_profile.get("mood")
    if mood:
        parts.append(f"Mood: {mood}")

    colors = dna_profile.get("colors", [])
    if colors:
        parts.append(f"Color palette: {', '.join(colors[:3])}")

    composition = dna_profile.get("composition")
    if composition:
        parts.append(f"Composition: {composition.replace('_', ' ')}")

    hooks = dna_profile.get("hooks", [])
    if hooks:
        parts.append(f"Content hooks: {', '.join(hooks[:2])}")

    return ". ".join(parts)


def inject_dna_for_caption(base_context: str, dna_profile: dict) -> str:
    """Inject DNA context specifically for caption generation."""
    if not dna_profile:
        return base_context

    cta = dna_profile.get("cta", "").replace("_", " ")
    mood = dna_profile.get("mood", "")
    hooks = dna_profile.get("hooks", [])

    additions = []
    if mood:
        additions.append(f"Tone: {mood}")
    if cta:
        additions.append(f"CTA style: {cta}")
    if hooks:
        additions.append(f"Use hooks: {', '.join(hooks[:2])}")

    if additions:
        return base_context + "\n" + ". ".join(additions)
    return base_context
