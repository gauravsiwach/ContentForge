"""Step definitions for image and reel project types."""

IMAGE_STEPS = [
    {"name": "category", "label": "Category", "order": 1, "optional": False},
    {"name": "viral_dna", "label": "Viral DNA", "order": 2, "optional": True},
    {"name": "trends", "label": "Trends", "order": 3, "optional": True},
    {"name": "caption", "label": "Content", "order": 4, "optional": False},
    {"name": "visuals", "label": "Image", "order": 5, "optional": False},
    {"name": "review", "label": "Review", "order": 6, "optional": False},
]

REEL_STEPS = [
    {"name": "category", "label": "Category", "order": 1, "optional": False},
    {"name": "viral_dna", "label": "Viral DNA", "order": 2, "optional": True},
    {"name": "trends", "label": "Trends", "order": 3, "optional": True},
    {"name": "script", "label": "Script", "order": 4, "optional": False},
    {"name": "scene_images", "label": "Scenes", "order": 5, "optional": False},
    {"name": "audio", "label": "Audio", "order": 6, "optional": False},
    {"name": "assembly", "label": "Assembly", "order": 7, "optional": False},
    {"name": "review", "label": "Review", "order": 8, "optional": False},
]


def get_steps_for_type(project_type: str) -> list[dict]:
    if project_type == "image":
        return IMAGE_STEPS
    elif project_type == "reel":
        return REEL_STEPS
    raise ValueError(f"Unknown project type: {project_type}")
