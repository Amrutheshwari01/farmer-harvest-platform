import sqlite3
import os

# Database directory and file
DB_DIR = "data"
DB_PATH = os.path.join(DB_DIR, "farmers.db")


def get_db_connection():
    """Create and return a database connection."""
    os.makedirs(DB_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Enable foreign key support
    conn.execute("PRAGMA foreign_keys = ON")

    return conn


def init_db():
    """Initialize the database and create required tables."""

    # Create data directory
    os.makedirs(DB_DIR, exist_ok=True)

    # Connect to database
    conn = sqlite3.connect(DB_PATH)

    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    cursor = conn.cursor()

    # -------------------------
    # Farmers Table
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farmers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # -------------------------
    # Harvests Table
    # -------------------------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS harvests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            crop TEXT NOT NULL,
            quantity REAL NOT NULL,
            harvest_date TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (farmer_id)
                REFERENCES farmers(id)
                ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

    print(f"Database initialized successfully at: {DB_PATH}")


if __name__ == "__main__":
    init_db()