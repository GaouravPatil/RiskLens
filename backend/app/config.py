import os

from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development")

# Comma-separated in the env, e.g.
#   ALLOWED_ORIGINS=https://risklens.example.com,https://app.example.com
# Falls back to the Vite dev server origins so local dev keeps working
# with zero config.
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

if APP_ENV != "development" and any(
    "localhost" in origin or "127.0.0.1" in origin
    for origin in ALLOWED_ORIGINS
):
    # Not fatal — some staging setups legitimately proxy through
    # localhost — but worth surfacing loudly so it isn't accidental.
    import warnings

    warnings.warn(
        "ALLOWED_ORIGINS includes a localhost origin while "
        f"APP_ENV={APP_ENV!r}. Confirm this is intentional.",
        stacklevel=2,
    )