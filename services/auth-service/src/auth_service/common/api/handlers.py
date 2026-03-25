import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from auth_service.common.exceptions import AppException, TokenExpiredError
from auth_service.infrastructure.database.exceptions import DatabaseError as TechnicalDatabaseError

logger = logging.getLogger("api.handlers")


async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(
        "AppException: %s | Code: %s | Path: %s",
        exc.message,
        exc.code,
        request.url.path,
    )

    content = {
        "error": exc.__class__.__name__,
        "message": exc.message,
        "path": str(request.url.path),
    }
    if exc.code:
        content["code"] = exc.code

    if isinstance(exc, TokenExpiredError):
        content["action"] = "refresh_token"

    return JSONResponse(status_code=exc.status_code, content=content)


async def database_technical_handler(request: Request, exc: TechnicalDatabaseError):
    logger.error("Database Crash: %s | Path: %s", exc, request.url.path, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "ServiceDatabaseError",
            "message": "Serviço temporariamente indisponível",
            "code": "DB_CONN_ERROR",
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append(
            {
                "field": field,
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.info("Validation error on %s: %s", request.url.path, errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "ValidationError",
            "message": "Dados inválidos na requisição",
            "details": errors,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled exception: {exc} | Path: {request.url.path}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "Erro interno do servidor",
            "path": str(request.url.path),
        },
    )


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(TechnicalDatabaseError, database_technical_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
