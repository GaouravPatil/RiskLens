-- ============================================
-- RiskLens - Risk Events Layer
-- ============================================

SET search_path TO risklens, analytics;

-- ============================================
-- 1. CREATE RISK EVENTS
-- ============================================

INSERT INTO risklens.risk_events (
    risk_code,
    entity_type,
    entity_id,
    risk_type,
    risk_score,
    severity,
    detected_at,
    status,
    ai_summary
)

SELECT
    'TXN-' || rd.transaction_code AS risk_code,

    'TRANSACTION' AS entity_type,

    rd.transaction_id AS entity_id,

    'TRANSACTION_RISK' AS risk_type,

    rd.risk_score::NUMERIC(5,2) AS risk_score,

    CASE
        WHEN rd.risk_score >= 90 THEN 'critical'
        WHEN rd.risk_score >= 70 THEN 'high'
        ELSE 'medium'
    END AS severity,

    rd.transaction_timestamp AS detected_at,

    'open' AS status,

    CONCAT(
        'Risk score: ', rd.risk_score,
        '. Amount score: ', rd.amount_score,
        '. Transaction failure score: ', rd.transaction_failure_score,
        '. Access failure score: ', rd.access_failure_score,
        '. Access activity score: ', rd.access_activity_score,
        '. Transaction amount: ', rd.amount,
        ' ', rd.currency,
        '. Transaction status: ', rd.transaction_status,
        '.'
    ) AS ai_summary

FROM analytics.risk_decisions rd

WHERE rd.risk_score >= 40

ON CONFLICT (risk_code) DO NOTHING;


-- ============================================
-- 2. CREATE RISK EVIDENCE
-- ============================================

INSERT INTO risklens.risk_evidence (
    risk_id,
    evidence_type,
    metric_name,
    metric_value,
    description
)

SELECT
    re.risk_id,

    'RISK_SCORE_COMPONENT',

    'amount_score',

    rd.amount_score,

    'Risk points contributed by transaction amount.'

FROM risklens.risk_events re

JOIN analytics.risk_decisions rd
    ON re.entity_id = rd.transaction_id

WHERE re.entity_type = 'TRANSACTION'

  AND NOT EXISTS (
      SELECT 1
      FROM risklens.risk_evidence existing
      WHERE existing.risk_id = re.risk_id
        AND existing.metric_name = 'amount_score'
  );


INSERT INTO risklens.risk_evidence (
    risk_id,
    evidence_type,
    metric_name,
    metric_value,
    description
)

SELECT
    re.risk_id,

    'RISK_SCORE_COMPONENT',

    'transaction_failure_score',

    rd.transaction_failure_score,

    'Risk points contributed by transaction failure status.'

FROM risklens.risk_events re

JOIN analytics.risk_decisions rd
    ON re.entity_id = rd.transaction_id

WHERE re.entity_type = 'TRANSACTION'

  AND NOT EXISTS (
      SELECT 1
      FROM risklens.risk_evidence existing
      WHERE existing.risk_id = re.risk_id
        AND existing.metric_name = 'transaction_failure_score'
  );


INSERT INTO risklens.risk_evidence (
    risk_id,
    evidence_type,
    metric_name,
    metric_value,
    description
)

SELECT
    re.risk_id,

    'RISK_SCORE_COMPONENT',

    'access_failure_score',

    rd.access_failure_score,

    'Risk points contributed by failed access activity.'

FROM risklens.risk_events re

JOIN analytics.risk_decisions rd
    ON re.entity_id = rd.transaction_id

WHERE re.entity_type = 'TRANSACTION'

  AND NOT EXISTS (
      SELECT 1
      FROM risklens.risk_evidence existing
      WHERE existing.risk_id = re.risk_id
        AND existing.metric_name = 'access_failure_score'
  );


INSERT INTO risklens.risk_evidence (
    risk_id,
    evidence_type,
    metric_name,
    metric_value,
    description
)

SELECT
    re.risk_id,

    'RISK_SCORE_COMPONENT',

    'access_activity_score',

    rd.access_activity_score,

    'Risk points contributed by overall access activity.'

FROM risklens.risk_events re

JOIN analytics.risk_decisions rd
    ON re.entity_id = rd.transaction_id

WHERE re.entity_type = 'TRANSACTION'

  AND NOT EXISTS (
      SELECT 1
      FROM risklens.risk_evidence existing
      WHERE existing.risk_id = re.risk_id
        AND existing.metric_name = 'access_activity_score'
  );
  