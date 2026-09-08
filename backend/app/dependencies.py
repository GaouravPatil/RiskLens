from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth import decode_access_token


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )

    return payload


def get_current_user_id(
    current_user: dict = Depends(get_current_user)
) -> int:
    """The authenticated user's database ID, taken from the JWT subject.

    Never trust a user ID sent by the client; this is the only
    acceptable source for reviewer identity on write operations.
    """
    try:
        return int(current_user["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )


def require_roles(*allowed_roles):
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_roles = current_user.get("roles", [])

        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to perform this action"
            )

        return current_user

    return role_checker
