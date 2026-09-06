-- ============================================
-- RiskLens - Risk Scoring Layer
-- ============================================

DROP VIEW IF EXISTS analytics.risk_scores;

CREATE VIEW analytics.risk_scores AS

SELECT
    rf.transaction_id,
    rf.transaction_code,

    rf.user_id,
    rf.user_code,
    rf.full_name,
    rf.department,

    rf.account_id,
    rf.account_code,

    rf.transaction_timestamp,
    rf.amount,
    rf.currency,
    rf.merchant,
    rf.category,
    rf.location,
    rf.payment_method,
    rf.channel,
    rf.transaction_status,

    -- ========================================
    -- Individual risk components
    -- ========================================

    CASE
        WHEN rf.amount >= 100000 THEN 30
        WHEN rf.amount >= 50000 THEN 20
        WHEN rf.amount >= 10000 THEN 10
        ELSE 0
    END AS amount_score,

    CASE
        WHEN rf.transaction_status = 'failed' THEN 20
        ELSE 0
    END AS transaction_failure_score,

    CASE
        WHEN rf.failed_access_count >= 10 THEN 20
        WHEN rf.failed_access_count >= 5 THEN 10
        WHEN rf.failed_access_count > 0 THEN 5
        ELSE 0
    END AS access_failure_score,

    CASE
        WHEN rf.total_access_count >= 50 THEN 10
        WHEN rf.total_access_count >= 20 THEN 5
        ELSE 0
    END AS access_activity_score

FROM analytics.risk_features rf;