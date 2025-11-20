from fastapi import status
from common.exceptions import AppException


class UserNotFoundError(AppException):
    def __init__(self, identifier: str):
        super().__init__(
            message=f"Usuário {identifier} não encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            code="USER_NOT_FOUND"
        )

class OrganizationAlreadyExists(AppException):
    def __init__(self, detail: str = None):
        msg = "Já existe uma organização com esse nome/slug."
        if detail:
            msg = f"Já existe uma organização identificada por '{detail}'."

        super().__init__(
            message=msg,
            status_code=status.HTTP_409_CONFLICT,
            code="ORGANIZATION_ALREADY_EXISTS"
        )