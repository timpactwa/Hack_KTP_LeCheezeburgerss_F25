"""Simple script to run the Flask backend server."""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.app import app

if __name__ == "__main__":
    print("Starting SafeRoute NYC Backend...")
    print("Server will be available at http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server\n")
    app.run(host="127.0.0.1", port=5000, debug=True)

