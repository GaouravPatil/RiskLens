SET search_path TO risklens, dq, staging;

-- ============================================
-- 1. LOAD CLEAN USERS
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
  AND u.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND NOT EXISTS (
      SELECT 1
      FROM dq.quarantine q
      WHERE q.record_type = 'USER'
        AND q.record_key = u.user_code
  );


-- ============================================
-- 2. LOAD CLEAN ACCOUNTS
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
-- 3. LOAD CLEAN TRANSACTIONS
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
    t.amount::NUMERIC,
    t.currency,
    t.merchant,
    t.category,
    t.location,
    t.payment_method,
    t.channel,
    t.status
FROM staging.transactions_raw t
JOIN risklens.accounts a
    ON a.account_code = t.account_code
WHERE t.amount IS NOT NULL
  AND t.amount ~ '^[0-9]+(\.[0-9]+)?$'
  AND t.amount::NUMERIC > 0
  AND NOT EXISTS (
      SELECT 1
      FROM dq.quarantine q
      WHERE q.record_type = 'TRANSACTION'
        AND q.record_key = t.transaction_code
  );


-- ============================================
-- 4. LOAD CLEAN ACCESS LOGS
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
    l.log_code,
    u.user_id,
    l.event_timestamp::TIMESTAMPTZ,
    l.ip_address::INET,
    l.resource,
    l.action,
    l.status,
    l.location,
    l.device_type,
    l.session_id,
    l.failure_reason
FROM staging.access_logs_raw l
JOIN risklens.users u
    ON u.user_code = l.user_code
WHERE l.ip_address IS NOT NULL
  AND l.ip_address ~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
  AND split_part(l.ip_address, '.', 1)::INTEGER <= 255
  AND split_part(l.ip_address, '.', 2)::INTEGER <= 255
  AND split_part(l.ip_address, '.', 3)::INTEGER <= 255
  AND split_part(l.ip_address, '.', 4)::INTEGER <= 255
  AND NOT EXISTS (
      SELECT 1
      FROM dq.quarantine q
      WHERE q.record_type = 'ACCESS_LOG'
        AND q.record_key = l.log_code
  );