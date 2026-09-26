from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    send_from_directory,
    jsonify
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

    # --------------------------------------------------------
    # FARM DETAILS TABLE
    # --------------------------------------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS farm_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farmer_id INTEGER NOT NULL,
            farm_name TEXT,
            location TEXT,
            land_size TEXT,
            farm_type TEXT,
            farm_conditions TEXT,
            notes TEXT,
            items TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

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
            session["farmer_phone"] = farmer["phone"]

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

    # Get additional farmer information from database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT name, phone, email
        FROM farmers
        WHERE id = ?
        """,
        (session["farmer_id"],)
    )

    farmer = cursor.fetchone()

    # Get farm details
    cursor.execute(
        """
        SELECT * FROM farm_details
        WHERE farmer_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (session["farmer_id"],)
    )

    farm_details = cursor.fetchone()
    conn.close()

    farm_details_data = None
    if farm_details:
        import json
        farm_details_data = {
            "farmName": farm_details["farm_name"],
            "location": farm_details["location"],
            "landSize": farm_details["land_size"],
            "farmType": farm_details["farm_type"],
            "farmConditions": farm_details["farm_conditions"],
            "notes": farm_details["notes"],
            "crops": json.loads(farm_details["items"]) if farm_details["items"] else [],
            "updated_at": farm_details["updated_at"]
        }

    return render_template(
        "dashboard.html",
        farmer_name=farmer["name"] if farmer else session.get("farmer_name", ""),
        farmer_email=farmer["email"] if farmer else session.get("farmer_email", ""),
        farmer_phone=farmer["phone"] if farmer else "",
        farm_details=farm_details_data
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
# FARMER DETAILS ROUTE
# ============================================================

@app.route("/farmer-details")
def farmer_details():

    if "farmer_id" not in session:
        flash("Please login to access your farmer details.")
        return redirect(url_for("login"))

    # Get farmer information from database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT name, phone, email
        FROM farmers
        WHERE id = ?
        """,
        (session["farmer_id"],)
    )

    farmer = cursor.fetchone()
    conn.close()

    # Read the HTML file and inject farmer data
    html_candidates = [
        os.path.join(PROJECT_ROOT, "static", "index.html"),
        os.path.join(PROJECT_ROOT, "index.html"),
        os.path.join(os.path.dirname(__file__), "..", "static", "index.html"),
        os.path.join(os.path.dirname(__file__), "..", "index.html")
    ]
    html_path = None
    for p in html_candidates:
        if os.path.exists(p):
            html_path = p
            break

    if not html_path:
        return "Farmer details page not found.", 404

    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    import json
    farmer_data = {
        "name": farmer["name"] if farmer else "",
        "phone": farmer["phone"] if farmer else "",
        "email": farmer["email"] if farmer else ""
    }
    farmer_data_script = f"""
    <script>
        window.farmerData = {json.dumps(farmer_data)};
    </script>
    """

    # Replace the back button link with the proper dashboard URL
    html_content = html_content.replace('href="/dashboard"', f'href="{url_for("dashboard")}"')

    # Insert the script before the closing </body> tag
    html_content = html_content.replace("</body>", farmer_data_script + "</body>")

    return html_content


# ============================================================
# STATIC FILE SERVING
# ============================================================

@app.route("/static/<path:filename>")
def serve_static(filename):
    for base in [
        os.path.join(PROJECT_ROOT, "static"),
        os.path.join(PROJECT_ROOT, "backend", "static"),
        PROJECT_ROOT
    ]:
        if os.path.exists(os.path.join(base, filename)):
            return send_from_directory(base, filename)
    return send_from_directory(os.path.join(PROJECT_ROOT, "static"), filename)

@app.route("/styles.css")
def serve_root_styles():
    for base in [os.path.join(PROJECT_ROOT, "static"), PROJECT_ROOT]:
        if os.path.exists(os.path.join(base, "styles.css")):
            return send_from_directory(base, "styles.css")
    return "", 404

@app.route("/script.js")
def serve_root_script():
    for base in [os.path.join(PROJECT_ROOT, "static"), PROJECT_ROOT]:
        if os.path.exists(os.path.join(base, "script.js")):
            return send_from_directory(base, "script.js")
    return "", 404


# ============================================================
# FARM DETAILS API
# ============================================================

@app.route("/api/farm-details", methods=["POST"])
def save_farm_details():
    if "farmer_id" not in session:
        return jsonify({"success": False, "message": "Please login to save farm details"}), 401

    try:
        data = request.get_json()

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if farmer already has farm details
        cursor.execute(
            """
            SELECT id
            FROM farm_details
            WHERE farmer_id = ?
            """,
            (session["farmer_id"],)
        )

        existing = cursor.fetchone()

        import json
        items_json = json.dumps(data.get("items", []))

        if existing:
            # Update existing record
            cursor.execute(
                """
                UPDATE farm_details
                SET farm_name = ?, location = ?, land_size = ?, farm_type = ?,
                    farm_conditions = ?, notes = ?, items = ?, updated_at = CURRENT_TIMESTAMP
                WHERE farmer_id = ?
                """,
                (
                    data.get("farmName", ""),
                    data.get("location", ""),
                    data.get("landSize", ""),
                    data.get("farmType", ""),
                    data.get("farmConditions", ""),
                    data.get("notes", ""),
                    items_json,
                    session["farmer_id"]
                )
            )
        else:
            # Insert new record
            cursor.execute(
                """
                INSERT INTO farm_details
                (farmer_id, farm_name, location, land_size, farm_type, farm_conditions, notes, items)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session["farmer_id"],
                    data.get("farmName", ""),
                    data.get("location", ""),
                    data.get("landSize", ""),
                    data.get("farmType", ""),
                    data.get("farmConditions", ""),
                    data.get("notes", ""),
                    items_json
                )
            )

        conn.commit()
        conn.close()

        return jsonify({"success": True, "message": "Farm details saved successfully"})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error saving farm details: {str(e)}"}), 500


@app.route("/api/farm-details", methods=["GET"])
def get_farm_details():
    if "farmer_id" not in session:
        return jsonify({"success": False, "message": "Please login to view farm details"}), 401

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM farm_details
            WHERE farmer_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (session["farmer_id"],)
        )

        farm_details = cursor.fetchone()
        conn.close()

        if farm_details:
            import json
            crops = json.loads(farm_details["items"]) if farm_details["items"] else []

            return jsonify({
                "success": True,
                "data": {
                    "farmName": farm_details["farm_name"],
                    "location": farm_details["location"],
                    "landSize": farm_details["land_size"],
                    "farmType": farm_details["farm_type"],
                    "farmConditions": farm_details["farm_conditions"],
                    "notes": farm_details["notes"],
                    "crops": crops,
                    "updated_at": farm_details["updated_at"]
                }
            })
        else:
            return jsonify({"success": True, "data": None})

    except Exception as e:
        return jsonify({"success": False, "message": f"Error fetching farm details: {str(e)}"}), 500


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )