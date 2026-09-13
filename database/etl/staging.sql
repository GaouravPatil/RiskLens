-- ============================================
-- RiskLens - Staging Layer
-- Raw CSV ingestion tables
-- ============================================

SET search_path TO risklens;

CREATE SCHEMA IF NOT EXISTS staging;

-- Remove old staging tables
DROP TABLE IF EXISTS staging.access_logs_raw;
DROP TABLE IF EXISTS staging.transactions_raw;
DROP TABLE IF EXISTS staging.accounts_raw;
DROP TABLE IF EXISTS staging.users_raw;

-- ============================================
-- USERS
-- ============================================

CREATE TABLE staging.users_raw (
    user_code       TEXT,
    full_name       TEXT,
    email           TEXT,
    phone           TEXT,
    department      TEXT,
    home_location   TEXT,
    status          TEXT
);

-- ============================================
-- ACCOUNTS
-- ============================================

CREATE TABLE staging.accounts_raw (
    account_code    TEXT,
    user_code       TEXT,
    account_type    TEXT,
    currency        TEXT,
    status          TEXT
);

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE staging.transactions_raw (
    transaction_code    TEXT,
    account_code        TEXT,
    transaction_timestamp TEXT,
    amount              TEXT,
    currency            TEXT,
    merchant            TEXT,
    category            TEXT,
    location            TEXT,
    payment_method      TEXT,
    channel             TEXT,
    status              TEXT
);

-- ============================================
-- ACCESS LOGS
-- ============================================

CREATE TABLE staging.access_logs_raw (
    log_code        TEXT,
    user_code       TEXT,
    event_timestamp TEXT,
    ip_address      TEXT,
    resource        TEXT,
    action          TEXT,
    status          TEXT,
    location        TEXT,
    device_type     TEXT,
    session_id      TEXT,
    failure_reason  TEXT
);