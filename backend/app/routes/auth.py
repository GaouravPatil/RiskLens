from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_connection
from app.auth import verify_password, create_access_token


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


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
            cur.execute("""
                SELECT r.role_name
                FROM risklens.user_roles ur
                JOIN risklens.roles r
                    ON r.role_id = ur.role_id
                WHERE ur.user_id = %s
                ORDER BY r.role_id
            """, (user_id,))

            roles = [row[0] for row in cur.fetchall()]

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