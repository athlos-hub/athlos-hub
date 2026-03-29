"""Exceções de domínio."""


class InvalidLiveTransitionError(Exception):
    """Transição de estado inválida para uma live."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LiveAlreadyFinishedError(Exception):
    """Operação inválida em live já terminada."""
