import uvicorn

from auth_service.core.app import create_app
from auth_service.core.config import settings

app = create_app()


def main():
    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level="info",
        log_config=None,
    )


if __name__ == "__main__":
    main()
    main()
