-- ============================================
-- RiskLens - Risk Decision Layer
-- ============================================

DROP VIEW IF EXISTS analytics.risk_decisions;

CREATE VIEW analytics.risk_decisions AS

SELECT
    rs.*,

    (
        rs.amount_score
        + rs.transaction_failure_score
        + rs.access_failure_score
        + rs.access_activity_score
    ) AS risk_score,

    CASE
        WHEN (
            rs.amount_score
            + rs.transaction_failure_score
            + rs.access_failure_score
            + rs.access_activity_score
        ) >= 70
            THEN 'HIGH'

        WHEN (
            rs.amount_score
            + rs.transaction_failure_score
            + rs.access_failure_score
            + rs.access_activity_score
        ) >= 40
            THEN 'MEDIUM'

        ELSE 'LOW'
    END AS risk_level

FROM analytics.risk_scores rs;