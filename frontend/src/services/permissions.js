/* ================================
   Role-aware UI helpers

   These only decide what to render. Authorization is enforced by
   FastAPI; an unauthorized call returns 403 regardless of the UI.
   ================================ */

export const STATUS_WRITE_ROLES = [
    "ADMIN",
    "RISK_ANALYST",
    "RISK_MANAGER",
];

export const canUpdateStatus = (user) =>
    (user?.roles ?? []).some((role) =>
        STATUS_WRITE_ROLES.includes(role)
    );
