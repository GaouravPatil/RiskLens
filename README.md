# RiskLens — Financial Risk Monitoring & Investigation Platform

RiskLens is a full-stack risk management platform designed for monitoring financial transactions and access logs, scoring risks, and managing analyst investigations.

---

## System Architecture

```
                               ┌───────────────────────────┐
                               │     Python Generator      │
                               │  (Synthetic Transactions  │
                               │      & Access Logs)       │
                               └─────────────┬─────────────┘
                                             │ CSV Ingestion
                                             ▼
                               ┌───────────────────────────┐
                               │   PostgreSQL Database     │
                               │  • ETL Staging & Core     │
                               │  • SQL Risk Analytics     │
                               └─────────────┬─────────────┘
                                             │ SQL Queries / psycopg2 pool
                                             ▼
                               ┌───────────────────────────┐
                               │      FastAPI Backend      │
                               │  • JWT Authentication     │
                               │  • Rate Limiting          │
                               │  • Audit Trail API        │
                               └─────────────┬─────────────┘
                                             │ REST API (Vite env)
                                             ▼
                               ┌───────────────────────────┐
                               │  React 19 + Vite Frontend │
                               │  • Real-time Dashboard    │
                               │  • Severity Distribution  │
                               │  • Role-gated Audit Flow  │
                               └───────────────────────────┘
```

---

## Quick Start

### 1. Database Setup (PostgreSQL)

Create database `risklens_db` and apply schema, migration, seed, ETL, and analytics scripts:

```bash
# Create database
createdb risklens_db

# Initialize database schema and data
psql -d risklens_db -f database/schema.sql
psql -d risklens_db -f database/migrations/001_auth_and_status_history.sql
psql -d risklens_db -f database/migrations/002_status_history_reviewer_fk.sql
psql -d risklens_db -f database/seed.sql

# Run ETL & Analytics pipeline
psql -d risklens_db -f database/etl/staging.sql
psql -d risklens_db -f database/etl/load_core.sql
psql -d risklens_db -f database/analytics/risk_events.sql
psql -d risklens_db -f database/analytics/risk_features.sql
psql -d risklens_db -f database/analytics/risk_scoring.sql
psql -d risklens_db -f database/analytics/risk_decisions.sql
```

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run development server
npm run dev
```

---

## Seed User Accounts

| Username | Password | Role | Description |
|---|---|---|---|
| `U10001` | `Password123!` | ADMIN | System Administrator |
| `U10002` | `Password123!` | RISK_MANAGER | Risk Operations Manager |
| `U10003` | `Password123!` | RISK_ANALYST | Lead Risk Analyst |
| `U10004` | `Password123!` | AUDITOR | Read-Only Compliance Auditor |

---

## Project Structure

```
RiskLens/
├── backend/
│   ├── app/
│   │   ├── database.py       # Connection pool & DB helpers
│   │   ├── dependencies.py   # Auth & Role verification
│   │   ├── main.py           # FastAPI entrypoint & middleware
│   │   ├── security.py       # Password hashing & JWT tokens
│   │   └── routes/
│   │       ├── auth.py       # /api/auth endpoints
│   │       └── risks.py      # /api/risks endpoints
│   └── requirements.txt
├── database/
│   ├── analytics/            # SQL risk detection & scoring rules
│   ├── etl/                  # Raw CSV staging & core loading
│   ├── migrations/           # Schema migration scripts
│   ├── schema.sql            # Complete DB DDL definition
│   └── seed.sql              # Seed users & initial data
├── data_generator/           # Python synthetic dataset generator
├── frontend/
│   ├── src/                  # React dashboard components & API client
│   ├── index.html
│   └── package.json
└── README.md
```
