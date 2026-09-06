-- ============================================
-- RiskLens - Clean ETL Load
-- Staging -> Core Tables
-- ============================================

BEGIN;

SET search_path TO risklens, dq, staging;

-- ============================================
-- 1. CLEAR EXISTING CORE DATA
-- ============================================

TRUNCATE TABLE
    risklens.access_logs,
    risklens.transactions,
    risklens.accounts,
    risklens.users
RESTART IDENTITY CASCADE;


-- ============================================
-- 2. LOAD USERS
-- Exclude invalid emails
-- ============================================

INSERT INTO risklens.users (
    user_code,
    full_name,
    email,
    phone,
    department,
    home_location,
    status
)
SELECT
    u.user_code,
    u.full_name,
    u.email,
    u.phone,
    u.department,
    u.home_location,
    u.status
FROM staging.users_raw u
WHERE u.email IS NOT NULL
  AND u.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';


-- ============================================
-- 3. LOAD ACCOUNTS
-- Resolve user_code -> user_id
-- ============================================

INSERT INTO risklens.accounts (
    account_code,
    user_id,
    account_type,
    currency,
    status
)
SELECT
    a.account_code,
    u.user_id,
    a.account_type,
    a.currency,
    a.status
FROM staging.accounts_raw a
JOIN risklens.users u
    ON u.user_code = a.user_code;


-- ============================================
-- 4. LOAD TRANSACTIONS
-- Keep first occurrence of each transaction_code
-- Exclude invalid amounts
-- Resolve account_code -> account_id
-- ============================================

INSERT INTO risklens.transactions (
    transaction_code,
    account_id,
    transaction_timestamp,
    amount,
    currency,
    merchant,
    category,
    location,
    payment_method,
    channel,
    status
)
SELECT
    t.transaction_code,
    a.account_id,
    t.transaction_timestamp::TIMESTAMPTZ,
    t.amount::NUMERIC(18,2),
    t.currency,
    t.merchant,
    t.category,
    t.location,
    t.payment_method,
    t.channel,
    t.status
FROM (
    SELECT
        t.*,
        ROW_NUMBER() OVER (
            PARTITION BY transaction_code
            ORDER BY transaction_code
        ) AS rn
    FROM staging.transactions_raw t
) t
JOIN risklens.accounts a
    ON a.account_code = t.account_code
WHERE t.rn = 1
  AND t.amount IS NOT NULL
  AND t.amount ~ '^[0-9]+(\.[0-9]+)?$'
  AND t.amount::NUMERIC > 0;


-- ============================================
-- 5. LOAD ACCESS LOGS
-- Keep first occurrence of each log_code
-- Exclude invalid IP addresses
-- Resolve user_code -> user_id
-- ============================================

INSERT INTO risklens.access_logs (
    log_code,
    user_id,
    event_timestamp,
    ip_address,
    resource,
    action,
    status,
    location,
    device_type,
    session_id,
    failure_reason
)
SELECT
    a.log_code,
    u.user_id,
    a.event_timestamp::TIMESTAMPTZ,
    a.ip_address::INET,
    a.resource,
    a.action,
    a.status,
    a.location,
    a.device_type,
    a.session_id,
    a.failure_reason
FROM (
    SELECT
        a.*,
        ROW_NUMBER() OVER (
            PARTITION BY log_code
            ORDER BY log_code
        ) AS rn
    FROM staging.access_logs_raw a
) a
JOIN risklens.users u
    ON u.user_code = a.user_code
WHERE a.rn = 1
  AND a.ip_address IS NOT NULL
  AND a.ip_address ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
  AND split_part(a.ip_address, '.', 1)::INTEGER <= 255
  AND split_part(a.ip_address, '.', 2)::INTEGER <= 255
  AND split_part(a.ip_address, '.', 3)::INTEGER <= 255
  AND split_part(a.ip_address, '.', 4)::INTEGER <= 255;


COMMIT;