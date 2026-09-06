-- ============================================
-- RiskLens - Risk Feature Layer
-- ============================================

CREATE SCHEMA IF NOT EXISTS analytics;

DROP VIEW IF EXISTS analytics.risk_features;

CREATE VIEW analytics.risk_features AS
SELECT
    t.transaction_id,
    t.transaction_code,

    u.user_id,
    u.user_code,
    u.full_name,
    u.department,

    a.account_id,
    a.account_code,
    a.account_type,

    -- Transaction information
    t.transaction_timestamp,
    t.amount,
    t.currency,
    t.merchant,
    t.category,
    t.location,
    t.payment_method,
    t.channel,
    t.status AS transaction_status,

    -- ========================================
    -- Risk Feature 1: Transaction amount
    -- ========================================

    CASE
        WHEN t.amount >= 100000 THEN 1
        WHEN t.amount >= 50000 THEN 0.7
        WHEN t.amount >= 10000 THEN 0.3
        ELSE 0
    END AS amount_risk,

    -- ========================================
    -- Risk Feature 2: Failed transaction
    -- ========================================

    CASE
        WHEN LOWER(t.status) = 'failed' THEN 1
        ELSE 0
    END AS failed_transaction_risk,

    -- ========================================
    -- Risk Feature 3: Access failures
    -- ========================================

    COALESCE(access_stats.failed_access_count, 0)
        AS failed_access_count,

    -- ========================================
    -- Risk Feature 4: Number of access logs
    -- ========================================

    COALESCE(access_stats.total_access_count, 0)
        AS total_access_count

FROM risklens.transactions t

JOIN risklens.accounts a
    ON t.account_id = a.account_id

JOIN risklens.users u
    ON a.user_id = u.user_id

LEFT JOIN (
    SELECT
        user_id,

        COUNT(*) AS total_access_count,

        COUNT(*) FILTER (
            WHERE LOWER(status) = 'failed'
        ) AS failed_access_count

    FROM risklens.access_logs

    GROUP BY user_id
) access_stats
    ON u.user_id = access_stats.user_id;