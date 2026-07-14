from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from nan_memory.domain.errors import AuthenticationError
from nan_memory.domain.models import User

bearer = HTTPBearer(auto_error=False)


def container(request: Request):
    return request.app.state.container


async def optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    app_container=Depends(container),
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = app_container.auth.tokens.decode(credentials.credentials, "access")
        user = await app_container.users.get_by_id(payload["sub"])
        if user is None or not user.active:
            raise AuthenticationError("Account unavailable")
        return user
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=401, detail=str(exc), headers={"WWW-Authenticate": "Bearer"}
        ) from exc


async def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
