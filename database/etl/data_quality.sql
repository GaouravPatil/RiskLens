-- ============================================
-- RiskLens - Data Quality Layer
-- ============================================

CREATE SCHEMA IF NOT EXISTS dq;

-- ============================================
-- QUARANTINE TABLE
-- ============================================

DROP TABLE IF EXISTS dq.quarantine;

CREATE TABLE dq.quarantine (
    quarantine_id BIGSERIAL PRIMARY KEY,
    record_type TEXT NOT NULL,
    record_key TEXT,
    issue_type TEXT NOT NULL,
    issue_description TEXT,
    raw_data JSONB,
    detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 1. INVALID EMAILS
-- ============================================

INSERT INTO dq.quarantine (
    record_type,
    record_key,
    issue_type,
    issue_description,
    raw_data
)
SELECT
    'USER',
    user_code,
    'INVALID_EMAIL',
    'Email does not match expected email format',
    to_jsonb(u)
FROM staging.users_raw u
WHERE email IS NULL
   OR email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- ============================================
-- 2. INVALID TRANSACTION AMOUNTS
-- ============================================

INSERT INTO dq.quarantine (
    record_type,
    record_key,
    issue_type,
    issue_description,
    raw_data
)
SELECT
    'TRANSACTION',
    transaction_code,
    'INVALID_AMOUNT',
    'Transaction amount is not numeric or is not positive',
    to_jsonb(t)
FROM staging.transactions_raw t
WHERE amount IS NULL
   OR amount !~ '^[0-9]+(\.[0-9]+)?$'
   OR amount::NUMERIC <= 0;

-- ============================================
-- 3. INVALID IP ADDRESSES
-- ============================================

INSERT INTO dq.quarantine (
    record_type,
    record_key,
    issue_type,
    issue_description,
    raw_data
)
SELECT
    'ACCESS_LOG',
    log_code,
    'INVALID_IP',
    'IP address is not a valid IPv4 address',
    to_jsonb(a)
FROM staging.access_logs_raw a
WHERE ip_address IS NULL
   OR ip_address !~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
   OR split_part(ip_address, '.', 1)::INTEGER > 255
   OR split_part(ip_address, '.', 2)::INTEGER > 255
   OR split_part(ip_address, '.', 3)::INTEGER > 255
   OR split_part(ip_address, '.', 4)::INTEGER > 255;

-- ============================================
-- 4. DUPLICATE TRANSACTIONS
-- Keep first occurrence.
-- Quarantine additional occurrences only.
-- ============================================

INSERT INTO dq.quarantine (
    record_type,
    record_key,
    issue_type,
    issue_description,
    raw_data
)
SELECT
    'TRANSACTION',
    transaction_code,
    'DUPLICATE_TRANSACTION',
    'Duplicate transaction code; additional occurrence',
    to_jsonb(t)
FROM (
    SELECT
        t.*,
        ROW_NUMBER() OVER (
            PARTITION BY transaction_code
            ORDER BY transaction_code
        ) AS rn
    FROM staging.transactions_raw t
) t
WHERE t.rn > 1;

-- ============================================
-- 5. DUPLICATE ACCESS LOGS
-- Keep first occurrence.
-- Quarantine additional occurrences only.
-- ============================================

INSERT INTO dq.quarantine (
    record_type,
    record_key,
    issue_type,
    issue_description,
    raw_data
)
SELECT
    'ACCESS_LOG',
    log_code,
    'DUPLICATE_ACCESS_LOG',
    'Duplicate access log code; additional occurrence',
    to_jsonb(a)
FROM (
    SELECT
        a.*,
        ROW_NUMBER() OVER (
            PARTITION BY log_code
            ORDER BY log_code
        ) AS rn
    FROM staging.access_logs_raw a
) a
WHERE a.rn > 1;

-- ============================================
-- DATA QUALITY SUMMARY
-- ============================================

DROP TABLE IF EXISTS dq.quality_summary;

CREATE TABLE dq.quality_summary (
    summary_id BIGSERIAL PRIMARY KEY,
    record_type TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    failed_count INTEGER NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- POPULATE QUALITY SUMMARY
-- ============================================

INSERT INTO dq.quality_summary (
    record_type,
    rule_name,
    failed_count
)
SELECT
    record_type,
    issue_type,
    COUNT(*)::INTEGER
FROM dq.quarantine
GROUP BY record_type, issue_type;