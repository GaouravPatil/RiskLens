from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_connection

router = APIRouter(prefix="/api/risks", tags=["Risks"])

########## Risk all ##################
@router.get("/")
def get_risks(
    severity: str | None = None,
    status: str | None = None,
    min_score: float | None = None
):
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            query = """
                SELECT
                    re.risk_id,
                    re.risk_code,
                    re.entity_type,
                    re.entity_id,
                    re.risk_type,
                    re.risk_score,
                    re.severity,
                    re.detected_at,
                    re.status,
                    re.ai_summary
                FROM risklens.risk_events re
                WHERE 1=1
            """

            params = []

            if severity:
                query += " AND re.severity = %s"
                params.append(severity)

            if status:
                query += " AND re.status = %s"
                params.append(status)

            if min_score is not None:
                query += " AND re.risk_score >= %s"
                params.append(min_score)

            query += " ORDER BY re.risk_score DESC"

            cur.execute(query, tuple(params))

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [
                dict(zip(columns, row))
                for row in rows
            ]

    finally:
        conn.close()

########## Summary ###########

@router.get("/summary")
def get_risk_summary():
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*) AS total_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'critical'
                    ) AS critical_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'high'
                    ) AS high_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'medium'
                    ) AS medium_risks,

                    COUNT(*) FILTER (
                        WHERE severity = 'low'
                    ) AS low_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'open'
                    ) AS open_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'investigating'
                    ) AS investigating_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'resolved'
                    ) AS resolved_risks,

                    COUNT(*) FILTER (
                        WHERE status = 'false_positive'
                    ) AS false_positive_risks,

                    COALESCE(
                        ROUND(AVG(risk_score), 2),
                        0
                    ) AS average_risk_score

                FROM risklens.risk_events
            """)

            row = cur.fetchone()

            columns = [desc[0] for desc in cur.description]

            return dict(zip(columns, row))

    finally:
        conn.close()

class RiskStatusUpdate(BaseModel):
    status: str
    reviewed_by: int

########## RISK ID STATUS ###########

@router.patch("/{risk_id}/status")
def update_risk_status(
    risk_id: int,
    update: RiskStatusUpdate
):
    allowed_statuses = {
        "open",
        "investigating",
        "resolved",
        "false_positive"
    }

    if update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid risk status"
        )

    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                UPDATE risklens.risk_events
                SET
                    status = %s,
                    reviewed_by = %s,
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE risk_id = %s
                RETURNING
                    risk_id,
                    risk_code,
                    status,
                    reviewed_by,
                    reviewed_at
            """, (
                update.status,
                update.reviewed_by,
                risk_id
            ))

            row = cur.fetchone()

            if not row:
                conn.rollback()

                raise HTTPException(
                    status_code=404,
                    detail="Risk event not found"
                )

            conn.commit()

            columns = [
                desc[0]
                for desc in cur.description
            ]

            return dict(zip(columns, row))

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()

####RISK ID #######

@router.get("/{risk_id}")
def get_risk(risk_id: int):
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    re.risk_id,
                    re.risk_code,
                    re.entity_type,
                    re.entity_id,
                    re.risk_type,
                    re.risk_score,
                    re.severity,
                    re.detected_at,
                    re.status,
                    re.ai_summary
                FROM risklens.risk_events re
                WHERE re.risk_id = %s
            """, (risk_id,))

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Risk event not found"
                )

            columns = [desc[0] for desc in cur.description]
            risk = dict(zip(columns, row))

            cur.execute("""
                SELECT
                    evidence_id,
                    evidence_type,
                    metric_name,
                    metric_value,
                    description,
                    created_at
                FROM risklens.risk_evidence
                WHERE risk_id = %s
                ORDER BY evidence_id
            """, (risk_id,))

            evidence_columns = [desc[0] for desc in cur.description]
            evidence_rows = cur.fetchall()

            risk["evidence"] = [
                dict(zip(evidence_columns, evidence))
                for evidence in evidence_rows
            ]

            return risk

    finally:
        conn.close()