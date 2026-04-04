from fastapi import status


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500, code: str | None = None):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(self.message)


class ResourceNotFoundError(AppException):
    def __init__(self, resource_name: str, identifier: str):
        super().__init__(
            message=f"{resource_name} {identifier} não encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
        )


class TokenExpiredError(AppException):
    def __init__(self, message: str = "Token expirado"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_EXPIRED",
        )
