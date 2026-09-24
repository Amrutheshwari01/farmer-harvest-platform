from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

import sqlite3
import os


# ============================================================
# FLASK APPLICATION
# ============================================================

app = Flask(__name__)

# Secret key for sessions and flash messages
app.secret_key = os.environ.get(
    "SECRET_KEY",
    "development-secret-key-change-this"
)


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

# Project structure:
#
# farmer-harvest-platform/
# │
# ├── data/
# │   └── farmers.db
# │
# └── backend/
#     └── app.py
#

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DB_DIR = os.path.join(
    PROJECT_ROOT,
    "data"
)

DB_PATH = os.path.join(
    DB_DIR,
    "farmers.db"
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():

    # Create data directory if it does not exist
    os.makedirs(DB_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)

    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON")

    cursor = conn.cursor()

    # --------------------------------------------------------
    # FARMERS TABLE
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # HARVESTS TABLE
    # --------------------------------------------------------

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

    print(f"Database initialized at: {DB_PATH}")


# Initialize database when application starts
init_db()


# ============================================================
# HOME PAGE
# ============================================================

@app.route("/")
def home():

    # Send user to signup page
    return redirect(url_for("signup"))


# ============================================================
# FARMER SIGNUP
# ============================================================

@app.route("/signup", methods=["GET", "POST"])
def signup():

    if request.method == "POST":

        # Get form data
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get(
            "confirm_password",
            ""
        )

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not name or not phone or not email or not password:
            flash("Please fill in all required fields.")
            return redirect(url_for("signup"))

        # Check password confirmation
        if password != confirm_password:
            flash("Passwords do not match.")
            return redirect(url_for("signup"))

        # Check password length
        if len(password) < 6:
            flash(
                "Password must contain at least 6 characters."
            )
            return redirect(url_for("signup"))

        # ----------------------------------------------------
        # DATABASE CONNECTION
        # ----------------------------------------------------

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check whether email already exists
        cursor.execute(
            """
            SELECT id
            FROM farmers
            WHERE email = ?
            """,
            (email,)
        )

        existing_farmer = cursor.fetchone()

        if existing_farmer:

            conn.close()

            flash(
                "An account with this email already exists."
            )

            return redirect(url_for("signup"))

        # ----------------------------------------------------
        # HASH PASSWORD
        # ----------------------------------------------------

        hashed_password = generate_password_hash(
            password
        )

        # ----------------------------------------------------
        # INSERT FARMER
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO farmers
            (
                name,
                phone,
                email,
                password
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                name,
                phone,
                email,
                hashed_password
            )
        )

        conn.commit()
        conn.close()

        flash(
            "Account created successfully. Please login."
        )

        return redirect(url_for("login"))

    return render_template("signup.html")


# ============================================================
# FARMER LOGIN
# ============================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        # Get login details
        email = request.form.get(
            "email",
            ""
        ).strip().lower()

        password = request.form.get(
            "password",
            ""
        )

        # Basic validation
        if not email or not password:

            flash(
                "Please enter your email and password."
            )

            return redirect(url_for("login"))

        # ----------------------------------------------------
        # FIND FARMER
        # ----------------------------------------------------

        conn = sqlite3.connect(DB_PATH)

        # Allows accessing columns using column names
        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT *
            FROM farmers
            WHERE email = ?
            """,
            (email,)
        )

        farmer = cursor.fetchone()

        conn.close()

        # ----------------------------------------------------
        # VERIFY PASSWORD
        # ----------------------------------------------------

        if farmer and check_password_hash(
            farmer["password"],
            password
        ):

            # Store farmer information in session
            session["farmer_id"] = farmer["id"]
            session["farmer_name"] = farmer["name"]
            session["farmer_email"] = farmer["email"]

            flash("Login successful!")

            return redirect(
                url_for("dashboard")
            )

        # Invalid login
        flash(
            "Invalid email or password."
        )

        return redirect(
            url_for("login")
        )

    return render_template("login.html")


# ============================================================
# FARMER DASHBOARD
# ============================================================

@app.route("/dashboard")
def dashboard():

    # Check whether farmer is logged in
    if "farmer_id" not in session:

        flash(
            "Please login to access your dashboard."
        )

        return redirect(
            url_for("login")
        )

    return render_template(
        "dashboard.html",
        farmer_name=session["farmer_name"],
        farmer_email=session["farmer_email"]
    )


# ============================================================
# LOGOUT
# ============================================================

@app.route("/logout")
def logout():

    # Clear session
    session.clear()

    flash(
        "You have been logged out successfully."
    )

    return redirect(
        url_for("login")
    )


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )