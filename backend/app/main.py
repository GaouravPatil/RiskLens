from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import ALLOWED_ORIGINS
from app.limiter import limiter
from app.routes import auth, risks

app = FastAPI(
    title="RiskLens API",
    description="Risk analytics and investigation API",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(risks.router)
app.include_router(auth.router)

#CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "RiskLens API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }