"""Viral DNA auto-discovery — find image references for a category."""

CATEGORY_SEARCH_TERMS = {
    "Fitness": "fitness motivation workout viral instagram",
    "Food & Cooking": "food recipe viral instagram aesthetic",
    "Technology": "tech gadget viral instagram content",
    "Art & Design": "art design creative viral instagram",
    "Travel": "travel destination viral instagram aesthetic",
    "Education": "education study tips viral instagram",
    "Business": "business entrepreneur viral instagram motivation",
    "Lifestyle": "lifestyle wellness viral instagram aesthetic",
}


async def discover_viral_images(category: str, limit: int = 6) -> list[str]:
    """
    Discover viral image URLs for a category.
    Uses Unsplash API-compatible source for safe, high-quality images.
    Falls back to curated Unsplash collection URLs if search fails.
    """
    search_term = CATEGORY_SEARCH_TERMS.get(category, f"{category} viral instagram")
    urls = _get_unsplash_urls(search_term, limit)
    return urls


def _get_unsplash_urls(search_term: str, limit: int) -> list[str]:
    """
    Generate Unsplash source URLs for a search term.
    These are free, high-quality images — no API key needed.
    """
    keywords = search_term.replace(" ", ",")
    urls = []
    for i in range(limit):
        # Unsplash source provides random images by keyword with a seed
        urls.append(f"https://source.unsplash.com/800x800/?{keywords}&sig={i}")
    return urls
