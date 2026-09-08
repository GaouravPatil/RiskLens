-- ============================================================
-- Migration 001: Authentication support + risk status history
-- ============================================================
-- Records schema changes that were originally applied by hand so
-- the risklens schema can be rebuilt reproducibly.
-- Safe to re-run: every statement is idempotent.
-- ============================================================

SET search_path TO risklens;


-- 1. Password storage for authentication
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);


-- 2. Audit trail of risk status transitions
CREATE TABLE IF NOT EXISTS risk_status_history (
    history_id BIGSERIAL PRIMARY KEY,

    risk_id BIGINT NOT NULL,

    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,

    reviewed_by VARCHAR(50),

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_risk_status_history_risk
        FOREIGN KEY (risk_id)
        REFERENCES risk_events(risk_id)
        ON DELETE CASCADE
);


-- 3. History is always read per risk, newest first
CREATE INDEX IF NOT EXISTS idx_risk_status_history_risk
    ON risk_status_history (risk_id, changed_at DESC);
