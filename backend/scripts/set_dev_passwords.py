"""Set development passwords for the seeded RiskLens users.

Development helper only. Every seeded account except U10001 was created
without a password_hash, so the RISK_MANAGER, ADMIN and VIEWER roles
could not be exercised end to end.

Run from the backend directory so that .env is picked up:

    python -m scripts.set_dev_passwords

Pass --password to choose a different shared password. Existing hashes
are left alone unless --force is given.
"""

import argparse
import sys

from app.auth import hash_password
from app.database import get_connection


DEV_USERS = (
    "rahul@example.com",
    "priya@example.com",
    "amit@example.com",
    "sneha@example.com",
)

DEFAULT_PASSWORD = "password123"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite accounts that already have a password_hash"
    )
    args = parser.parse_args()

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            for email in DEV_USERS:
                cur.execute("""
                    UPDATE risklens.users
                    SET password_hash = %s
                    WHERE email = %s
                      AND (%s OR password_hash IS NULL)
                    RETURNING user_id
                """, (hash_password(args.password), email, args.force))

                row = cur.fetchone()

                if row:
                    print(f"set password for {email} (user_id={row[0]})")
                else:
                    print(f"skipped {email} (no such user, or already set)")

        conn.commit()

    finally:
        conn.close()

    print(f"\nShared development password: {args.password}")
    print("Do not use this script or this password outside development.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
