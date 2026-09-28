from pathlib import Path
from bs4 import BeautifulSoup


def test_location_field():
    html_path = Path("templates/index.html")

    html = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    location = soup.find("input", {"name": "s1s2s3"})

    assert location is not None, "Location input field is missing"

    assert location.get("name") == "location", \
        "Location field must have name='location'"

    assert location.get("id") == "location", \
        "Location field must have id='location'"