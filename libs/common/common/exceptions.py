from fastapi import status

class AppException(Exception):
    """Base para todas as exceções lógicas da aplicação."""
    def __init__(self, message: str, status_code: int = 500, code: str = None):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(self.message)

class InvalidCredentialsError(AppException):
    def __init__(self, message: str = "Email ou senha incorretos"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS"
        )

class TokenExpiredError(AppException):
    def __init__(self, message: str = "Token expirado"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_EXPIRED"
        )

class ResourceNotFoundError(AppException):
    """Genérico para 404"""
    def __init__(self, resource_name: str, identifier: str):
        super().__init__(
            message=f"{resource_name} {identifier} não encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND"
        )

class ServiceDatabaseError(AppException):
    """Erro HTTP para retornar ao usuário quando o banco falha"""
    def __init__(self, detail: str = "Erro temporário no serviço"):
        super().__init__(
            message=detail,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="SERVICE_UNAVAILABLE"
        )