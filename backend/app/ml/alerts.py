"""Alert generation (SRS Module 10) and optional email delivery."""

import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Auto-generated alert types are refreshed on every sync.
AUTO_TYPES = {
    "freshness_alert",
    "shelf_life_warning",
    "spoilage_notification",
    "storage_condition_alert",
}


def generate_alerts(states: list[dict]) -> list[dict]:
    """Derive in-app alerts from current per-item states."""
    alerts: list[dict] = []
    for state in states:
        item = state["item"]
        composite = state["composite"]
        remaining = state["prediction"].remaining_days

        if composite.health_category == "Spoiled":
            alerts.append(
                {
                    "item_id": item.id,
                    "type": "spoilage_notification",
                    "severity": "critical",
                    "title": f"{item.name} has spoiled",
                    "message": f"{item.name} scored {composite.overall_score}/100 (Spoiled). Discard it.",
                }
            )
        elif composite.health_category == "Near Spoilage":
            alerts.append(
                {
                    "item_id": item.id,
                    "type": "freshness_alert",
                    "severity": "warning",
                    "title": f"{item.name} freshness is deteriorating",
                    "message": f"{item.name} scored {composite.overall_score}/100. Consume soon or freeze it.",
                }
            )

        if remaining <= 1:
            alerts.append(
                {
                    "item_id": item.id,
                    "type": "shelf_life_warning",
                    "severity": "critical" if remaining <= 0 else "warning",
                    "title": f"{item.name}: shelf life exhausted",
                    "message": f"{item.name} has ~{max(remaining, 0)} day(s) of predicted shelf life left.",
                }
            )
        elif remaining <= 3:
            alerts.append(
                {
                    "item_id": item.id,
                    "type": "shelf_life_warning",
                    "severity": "info",
                    "title": f"{item.name} expiring soon",
                    "message": f"{item.name} is predicted to expire within {remaining} day(s).",
                }
            )

        compliance = state.get("compliance")
        if compliance and not compliance["compliant"]:
            alerts.append(
                {
                    "item_id": item.id,
                    "type": "storage_condition_alert",
                    "severity": "warning",
                    "title": f"{item.name}: storage out of range",
                    "message": "; ".join(compliance["violations"]),
                }
            )

    return alerts


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email via SMTP if configured; returns True when sent."""
    settings = get_settings()
    if not settings.EMAILS_ENABLED or not settings.SMTP_HOST:
        return False
    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USER:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [to], msg.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to)
        return False
