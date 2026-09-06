from fastapi import FastAPI
from app.routes.risks import router as risk_router

app = FastAPI(
    title="RiskLens API",
    description="Risk analytics and investigation API",
    version="1.0.0"
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


app.include_router(risk_router)