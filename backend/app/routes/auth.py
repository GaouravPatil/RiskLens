from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.database import get_connection
from app.auth import verify_password, create_access_token
from app.dependencies import get_current_user_id


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


def _get_roles(cur, user_id: int) -> list[str]:
    cur.execute("""
        SELECT r.role_name
        FROM risklens.user_roles ur
        JOIN risklens.roles r
            ON r.role_id = ur.role_id
        WHERE ur.user_id = %s
        ORDER BY r.role_id
    """, (user_id,))

    return [row[0] for row in cur.fetchall()]


@router.post("/login")
def login(data: LoginRequest):
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            # 1. Find user
            cur.execute("""
                SELECT
                    user_id,
                    user_code,
                    full_name,
                    email,
                    department,
                    status,
                    password_hash
                FROM risklens.users
                WHERE email = %s
            """, (data.email,))

            user = cur.fetchone()

            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )

            (
                user_id,
                user_code,
                full_name,
                email,
                department,
                status,
                password_hash
            ) = user

            # 2. Check account status
            if status != "active":
                raise HTTPException(
                    status_code=403,
                    detail="User account is not active"
                )

            # 3. Check password
            if not password_hash or not verify_password(
                data.password,
                password_hash
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )

            # 4. Get user's roles
            roles = _get_roles(cur, user_id)

            # 5. Create JWT
            token = create_access_token({
                "sub": str(user_id),
                "email": email,
                "roles": roles
            })

            # 6. Return safe user information
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "user_id": user_id,
                    "user_code": user_code,
                    "full_name": full_name,
                    "email": email,
                    "department": department,
                    "status": status,
                    "roles": roles
                }
            }

    finally:
        conn.close()


@router.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    """The authenticated user's profile, re-read from PostgreSQL.

    Roles come from the database rather than the token so that a
    permission change takes effect without waiting for expiry.
    """
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    user_id,
                    user_code,
                    full_name,
                    email,
                    department,
                    status
                FROM risklens.users
                WHERE user_id = %s
            """, (user_id,))

            user = cur.fetchone()

            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="Authenticated user no longer exists"
                )

            columns = [desc[0] for desc in cur.description]
            profile = dict(zip(columns, user))

            # The account may have been deactivated since the token was issued
            if profile["status"] != "active":
                raise HTTPException(
                    status_code=403,
                    detail="User account is not active"
                )

            profile["roles"] = _get_roles(cur, user_id)

            return profile

    finally:
        conn.close()