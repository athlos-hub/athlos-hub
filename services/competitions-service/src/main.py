import uvicorn
from src.config.settings import settings
from src.core.app import create_app

# Cria a instância da aplicação chamando a factory
app = create_app()

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )