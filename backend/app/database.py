import os
import atexit
from contextlib import contextmanager

import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Connection Pool
# ============================================================
# ThreadedConnectionPool is safe for multi-threaded WSGI /
# ASGI servers (uvicorn with workers, gunicorn, etc.).
# Connections are checked out via get_connection() and
# automatically returned when the context manager exits.
# ============================================================

_pool: pool.ThreadedConnectionPool | None = None


def _get_pool() -> pool.ThreadedConnectionPool:
    """Lazily initialise the connection pool on first use."""
    global _pool

    if _pool is None or _pool.closed:
        _pool = pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=int(os.getenv("DB_POOL_MAX", "10")),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "risklens"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD"),
        )

    return _pool


@contextmanager
def get_connection():
    """Yield a pooled connection and return it when done.

    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
    """
    p = _get_pool()
    conn = p.getconn()

    try:
        yield conn
    finally:
        p.putconn(conn)


def close_pool():
    """Shut down the pool cleanly on process exit."""
    global _pool

    if _pool is not None and not _pool.closed:
        _pool.closeall()
        _pool = None


# Ensure pool is torn down when the process exits
atexit.register(close_pool)