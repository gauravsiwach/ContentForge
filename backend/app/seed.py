"""Seed the database with initial categories."""

from app.database import SessionLocal, create_tables
from app.models import Category

SEED_CATEGORIES = [
    {"name": "Fitness", "icon": "fitness_center", "keywords": ["workout", "gym", "health", "exercise", "training"]},
    {"name": "Food & Cooking", "icon": "restaurant", "keywords": ["recipe", "cooking", "food", "meal", "kitchen"]},
    {"name": "Technology", "icon": "code", "keywords": ["tech", "programming", "AI", "software", "gadgets"]},
    {"name": "Art & Design", "icon": "brush", "keywords": ["art", "design", "creative", "illustration", "graphic"]},
    {"name": "Travel", "icon": "travel_explore", "keywords": ["travel", "adventure", "explore", "destination", "trip"]},
    {"name": "Education", "icon": "school", "keywords": ["learning", "teaching", "study", "knowledge", "course"]},
    {"name": "Business", "icon": "business", "keywords": ["startup", "entrepreneur", "marketing", "finance", "growth"]},
    {"name": "Lifestyle", "icon": "self_improvement", "keywords": ["lifestyle", "wellness", "mindset", "motivation", "habits"]},
]


def seed_categories():
    create_tables()
    db = SessionLocal()
    try:
        existing = db.query(Category).count()
        if existing > 0:
            print(f"Categories already seeded ({existing} found). Skipping.")
            return

        for cat_data in SEED_CATEGORIES:
            cat = Category(**cat_data)
            db.add(cat)
        db.commit()
        print(f"Seeded {len(SEED_CATEGORIES)} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()
