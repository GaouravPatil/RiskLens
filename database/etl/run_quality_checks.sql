SET search_path TO risklens, dq, staging;

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
    'Transaction code appears more than once',
    to_jsonb(t)
FROM staging.transactions_raw t
WHERE transaction_code IN (
    SELECT transaction_code
    FROM staging.transactions_raw
    GROUP BY transaction_code
    HAVING COUNT(*) > 1
);

-- ============================================
-- 5. DUPLICATE ACCESS LOGS
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
    'Access log code appears more than once',
    to_jsonb(a)
FROM staging.access_logs_raw a
WHERE log_code IN (
    SELECT log_code
    FROM staging.access_logs_raw
    GROUP BY log_code
    HAVING COUNT(*) > 1
);