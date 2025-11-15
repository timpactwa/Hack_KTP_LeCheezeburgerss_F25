"""Seed helper for quickly populating SQLite via backend.models.

This script creates demo users and trusted contacts for testing.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import db_session, init_db
from backend.services import auth as auth_service


def seed_demo_users():
    """Create demo users for testing."""
    init_db()
    
    with db_session() as session:
        # Demo user 1
        demo_email = "demo@sferoute.app"
        existing = auth_service.get_user_by_email(session, demo_email)
        if not existing:
            user = auth_service.create_user(
                session,
                email=demo_email,
                password="password123",
                phone="+15555555555"
            )
            session.commit()
            print(f"[OK] Created demo user: {demo_email} / password123")
        else:
            print(f"[INFO] Demo user already exists: {demo_email}")
        
        # Demo user 2
        demo_email2 = "test@example.com"
        existing2 = auth_service.get_user_by_email(session, demo_email2)
        if not existing2:
            user2 = auth_service.create_user(
                session,
                email=demo_email2,
                password="test123",
                phone="+15555555556"
            )
            session.commit()
            print(f"[OK] Created demo user: {demo_email2} / test123")
        else:
            print(f"[INFO] Demo user already exists: {demo_email2}")
    
    print("\nDemo users created! You can now log in with:")
    print("  Email: demo@sferoute.app")
    print("  Password: password123")
    print("\n  OR")
    print("  Email: test@example.com")
    print("  Password: test123")


if __name__ == "__main__":
    print("Seeding database with demo users...")
    seed_demo_users()
    print("\nDone!")
