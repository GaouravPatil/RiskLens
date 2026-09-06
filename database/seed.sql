-- ============================================================
-- RiskLens Seed Data
-- ============================================================

SET search_path TO risklens;


-- ============================================================
-- 1. ROLES
-- ============================================================

INSERT INTO roles (role_name)
VALUES
    ('ADMIN'),
    ('RISK_ANALYST'),
    ('RISK_MANAGER'),
    ('VIEWER')
ON CONFLICT (role_name) DO NOTHING;


-- ============================================================
-- 2. USERS
-- ============================================================

INSERT INTO users (
    user_code,
    full_name,
    email,
    phone,
    department,
    home_location,
    status
)
VALUES
(
    'U10001',
    'Rahul Sharma',
    'rahul@example.com',
    '9876543210',
    'Finance',
    'Hyderabad',
    'active'
),
(
    'U10002',
    'Priya Mehta',
    'priya@example.com',
    '9823456789',
    'Finance',
    'Pune',
    'active'
),
(
    'U10003',
    'Amit Patel',
    'amit@example.com',
    '9988776655',
    'IT',
    'Mumbai',
    'active'
),
(
    'U10004',
    'Sneha Rao',
    'sneha@example.com',
    '9123456789',
    'Operations',
    'Bangalore',
    'active'
)
ON CONFLICT (user_code) DO NOTHING;


-- ============================================================
-- 3. ACCOUNTS
-- ============================================================

INSERT INTO accounts (
    account_code,
    user_id,
    account_type,
    currency,
    status
)
SELECT
    'A50001',
    user_id,
    'standard',
    'INR',
    'active'
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (account_code) DO NOTHING;


INSERT INTO accounts (
    account_code,
    user_id,
    account_type,
    currency,
    status
)
SELECT
    'A50002',
    user_id,
    'premium',
    'INR',
    'active'
FROM users
WHERE user_code = 'U10002'
ON CONFLICT (account_code) DO NOTHING;


INSERT INTO accounts (
    account_code,
    user_id,
    account_type,
    currency,
    status
)
SELECT
    'A50003',
    user_id,
    'standard',
    'INR',
    'active'
FROM users
WHERE user_code = 'U10003'
ON CONFLICT (account_code) DO NOTHING;


INSERT INTO accounts (
    account_code,
    user_id,
    account_type,
    currency,
    status
)
SELECT
    'A50004',
    user_id,
    'standard',
    'INR',
    'active'
FROM users
WHERE user_code = 'U10004'
ON CONFLICT (account_code) DO NOTHING;


-- ============================================================
-- 4. USER ROLES
-- ============================================================

INSERT INTO user_roles (user_id, role_id)
SELECT
    u.user_id,
    r.role_id
FROM users u
JOIN roles r
    ON r.role_name = 'RISK_ANALYST'
WHERE u.user_code = 'U10001'
ON CONFLICT DO NOTHING;


INSERT INTO user_roles (user_id, role_id)
SELECT
    u.user_id,
    r.role_id
FROM users u
JOIN roles r
    ON r.role_name = 'RISK_MANAGER'
WHERE u.user_code = 'U10002'
ON CONFLICT DO NOTHING;


INSERT INTO user_roles (user_id, role_id)
SELECT
    u.user_id,
    r.role_id
FROM users u
JOIN roles r
    ON r.role_name = 'ADMIN'
WHERE u.user_code = 'U10003'
ON CONFLICT DO NOTHING;


INSERT INTO user_roles (user_id, role_id)
SELECT
    u.user_id,
    r.role_id
FROM users u
JOIN roles r
    ON r.role_name = 'VIEWER'
WHERE u.user_code = 'U10004'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 5. NORMAL TRANSACTIONS
-- ============================================================

INSERT INTO transactions (
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
    'T900001',
    account_id,
    '2026-09-05 10:15:00+05:30',
    4500.00,
    'INR',
    'Amazon',
    'Shopping',
    'Hyderabad',
    'card',
    'online',
    'success'
FROM accounts
WHERE account_code = 'A50001'
ON CONFLICT (transaction_code) DO NOTHING;


INSERT INTO transactions (
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
    'T900002',
    account_id,
    '2026-09-05 11:20:00+05:30',
    6200.00,
    'INR',
    'Flipkart',
    'Shopping',
    'Hyderabad',
    'card',
    'online',
    'success'
FROM accounts
WHERE account_code = 'A50001'
ON CONFLICT (transaction_code) DO NOTHING;


INSERT INTO transactions (
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
    'T900003',
    account_id,
    '2026-09-05 12:10:00+05:30',
    3800.00,
    'INR',
    'Swiggy',
    'Food',
    'Hyderabad',
    'card',
    'online',
    'success'
FROM accounts
WHERE account_code = 'A50001'
ON CONFLICT (transaction_code) DO NOTHING;


-- ============================================================
-- 6. INTENTIONAL HIGH-VALUE ANOMALY
-- ============================================================

INSERT INTO transactions (
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
    'T900004',
    account_id,
    '2026-09-05 12:30:00+05:30',
    120000.00,
    'INR',
    'XYZ Electronics',
    'Electronics',
    'London',
    'card',
    'online',
    'success'
FROM accounts
WHERE account_code = 'A50001'
ON CONFLICT (transaction_code) DO NOTHING;


-- ============================================================
-- 7. ACCESS LOGS
-- ============================================================

INSERT INTO access_logs (
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
    'L800001',
    user_id,
    '2026-09-05 09:00:00+05:30',
    '10.10.1.5',
    'Dashboard',
    'READ',
    'success',
    'Hyderabad',
    'laptop',
    'S001',
    NULL
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (log_code) DO NOTHING;


INSERT INTO access_logs (
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
    'L800002',
    user_id,
    '2026-09-05 09:01:00+05:30',
    '10.10.1.5',
    'Reports',
    'READ',
    'success',
    'Hyderabad',
    'laptop',
    'S001',
    NULL
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (log_code) DO NOTHING;


-- ============================================================
-- 8. INTENTIONAL FAILED ACCESS PATTERN
-- ============================================================

INSERT INTO access_logs (
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
    'L800003',
    user_id,
    '2026-09-05 09:02:00+05:30',
    '185.10.20.30',
    'AdminConfiguration',
    'DELETE',
    'failed',
    'London',
    'unknown',
    'S002',
    'permission_denied'
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (log_code) DO NOTHING;


INSERT INTO access_logs (
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
    'L800004',
    user_id,
    '2026-09-05 09:03:00+05:30',
    '185.10.20.30',
    'AdminConfiguration',
    'DELETE',
    'failed',
    'London',
    'unknown',
    'S002',
    'permission_denied'
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (log_code) DO NOTHING;


INSERT INTO access_logs (
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
    'L800005',
    user_id,
    '2026-09-05 09:04:00+05:30',
    '185.10.20.30',
    'AdminConfiguration',
    'DELETE',
    'failed',
    'London',
    'unknown',
    'S002',
    'permission_denied'
FROM users
WHERE user_code = 'U10001'
ON CONFLICT (log_code) DO NOTHING;


-- ============================================================
-- END
-- ============================================================
