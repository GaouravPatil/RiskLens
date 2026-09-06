from fastapi import APIRouter, HTTPException
from app.database import get_connection

router = APIRouter(prefix="/api/risks", tags=["Risks"])


@router.get("/")
def get_risks():
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
                ORDER BY re.risk_score DESC
            """)

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

            return [
                dict(zip(columns, row))
                for row in rows
            ]

    finally:
        conn.close()


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