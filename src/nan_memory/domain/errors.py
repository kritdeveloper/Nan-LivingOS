class DomainError(Exception):
    """Base error safe to translate at the delivery boundary."""


class NotFoundError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class AuthenticationError(DomainError):
    pass


class AuthorizationError(DomainError):
    pass


class ValidationError(DomainError):
    pass
