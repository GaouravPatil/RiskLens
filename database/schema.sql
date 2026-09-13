-- ============================================================
-- RiskLens Database Schema
-- ============================================================

-- Create application schema
CREATE SCHEMA IF NOT EXISTS risklens;

SET search_path TO risklens;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    user_code VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    home_location VARCHAR(100),
    password_hash VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_user_status
        CHECK (status IN ('active', 'inactive', 'suspended'))
);


-- ============================================================
-- 2. ACCOUNTS
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
    account_id BIGSERIAL PRIMARY KEY,
    account_code VARCHAR(30) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,

    account_type VARCHAR(30) NOT NULL DEFAULT 'standard',
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_account_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_account_status
        CHECK (status IN ('active', 'inactive', 'blocked'))
);


-- ============================================================
-- 3. TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id BIGSERIAL PRIMARY KEY,

    transaction_code VARCHAR(30) UNIQUE NOT NULL,
    account_id BIGINT NOT NULL,

    transaction_timestamp TIMESTAMPTZ NOT NULL,

    amount NUMERIC(18,2) NOT NULL,
    currency CHAR(3) NOT NULL,

    merchant VARCHAR(150),
    category VARCHAR(100),

    location VARCHAR(100),

    payment_method VARCHAR(30),
    channel VARCHAR(30),

    status VARCHAR(20) NOT NULL DEFAULT 'success',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transaction_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(account_id),

    CONSTRAINT chk_transaction_amount
        CHECK (amount >= 0),

    CONSTRAINT chk_transaction_status
        CHECK (
            status IN (
                'success',
                'failed',
                'pending',
                'reversed'
            )
        )
);


-- ============================================================
-- 4. ACCESS LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS access_logs (
    log_id BIGSERIAL PRIMARY KEY,

    log_code VARCHAR(30) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,

    event_timestamp TIMESTAMPTZ NOT NULL,

    ip_address INET,

    resource VARCHAR(150) NOT NULL,
    action VARCHAR(30) NOT NULL,

    status VARCHAR(20) NOT NULL,

    location VARCHAR(100),
    device_type VARCHAR(50),

    session_id VARCHAR(100),

    failure_reason VARCHAR(255),

    CONSTRAINT fk_access_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id),

    CONSTRAINT chk_access_status
        CHECK (status IN ('success', 'failed'))
);


-- ============================================================
-- 5. RISK EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_events (
    risk_id BIGSERIAL PRIMARY KEY,

    risk_code VARCHAR(30) UNIQUE NOT NULL,

    entity_type VARCHAR(30) NOT NULL,
    entity_id BIGINT NOT NULL,

    risk_type VARCHAR(50) NOT NULL,

    risk_score NUMERIC(5,2) NOT NULL,

    severity VARCHAR(20) NOT NULL,

    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20) NOT NULL DEFAULT 'open',

    ai_summary TEXT,

    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,

    CONSTRAINT chk_risk_score
        CHECK (risk_score >= 0 AND risk_score <= 100),

    CONSTRAINT chk_risk_severity
        CHECK (
            severity IN (
                'low',
                'medium',
                'high',
                'critical'
            )
        ),

    CONSTRAINT chk_risk_status
        CHECK (
            status IN (
                'open',
                'investigating',
                'resolved',
                'false_positive'
            )
        ),

    CONSTRAINT fk_risk_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id)
);


-- ============================================================
-- 6. RISK EVIDENCE
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_evidence (
    evidence_id BIGSERIAL PRIMARY KEY,

    risk_id BIGINT NOT NULL,

    evidence_type VARCHAR(50) NOT NULL,

    metric_name VARCHAR(100) NOT NULL,

    metric_value NUMERIC,

    description TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_evidence_risk
        FOREIGN KEY (risk_id)
        REFERENCES risk_events(risk_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 7. ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);


-- ============================================================
-- 8. USER ROLES
-- ============================================================

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id INT NOT NULL,

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
        ON DELETE CASCADE
);


-- ============================================================
-- 9. RISK STATUS HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS risk_status_history (
    history_id BIGSERIAL PRIMARY KEY,

    risk_id BIGINT NOT NULL,

    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,

    reviewed_by BIGINT,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_risk_status_history_risk
        FOREIGN KEY (risk_id)
        REFERENCES risk_events(risk_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_risk_status_history_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_status_history_risk
    ON risk_status_history (risk_id, changed_at DESC);
