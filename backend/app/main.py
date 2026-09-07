from app.routes import risks
from fastapi import FastAPI
from app.routes.risks import router as risk_router
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth

app = FastAPI(
    title="RiskLens API",
    description="Risk analytics and investigation API",
    version="1.0.0"
)
app.include_router(risks.router)
app.include_router(auth.router)
#CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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


app.include_router(risk_router)