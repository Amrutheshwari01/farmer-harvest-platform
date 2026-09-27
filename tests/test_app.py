from backend.app import app


def test_home_page_redirects():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 302