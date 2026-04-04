from src.main import app


def test_app_title():
    assert app.title == "Social Service API"
