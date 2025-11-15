"""Reset the demo user's password to ensure it works."""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import db_session
from backend.services import auth as auth_service


def reset_demo_user():
    """Reset demo user password."""
    demo_email = "demo@sferoute.app"
    new_password = "password123"
    
    with db_session() as session:
        user = auth_service.get_user_by_email(session, demo_email)
        if user:
            # Update password hash
            user.password_hash = auth_service.hash_password(new_password)
            session.commit()
            print(f"[OK] Reset password for {demo_email}")
            print(f"     New password: {new_password}")
        else:
            # Create user if it doesn't exist
            auth_service.create_user(
                session,
                email=demo_email,
                password=new_password,
                phone="+15555555555"
            )
            session.commit()
            print(f"[OK] Created demo user: {demo_email}")
            print(f"     Password: {new_password}")


if __name__ == "__main__":
    print("Resetting demo user password...")
    reset_demo_user()
    print("\nDone! You can now log in with:")
    print(f"  Email: demo@sferoute.app")
    print(f"  Password: password123")

