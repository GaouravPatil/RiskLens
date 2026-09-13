from slowapi import Limiter
from slowapi.util import get_remote_address

# Keyed by client IP. Applied per-route (see routes/auth.py) rather than
# globally, since login is the sensitive endpoint that needs brute-force
# protection — read endpoints don't need the same limit.
limiter = Limiter(key_func=get_remote_address)