from fastapi import status
from common.exceptions import AppException


class UserNotFoundError(AppException):
    def __init__(self, identifier: str):
        super().__init__(
            message=f"Usuário {identifier} não encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            code="USER_NOT_FOUND"
        )