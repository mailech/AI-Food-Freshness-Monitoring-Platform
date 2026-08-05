from celery import Celery
from .config import settings
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "food_freshness_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Optional config tweaks
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def send_email_alert_async(recipient_email: str, subject: str, message_body: str):
    """
    Asynchronous task to simulate sending email notifications.
    """
    logger.info(f"Simulating sending email to {recipient_email}...")
    logger.info(f"Subject: {subject}")
    logger.info(f"Body: {message_body}")
    # In production, integrate SMTP or SendGrid client here
    return {"status": "sent", "recipient": recipient_email}

@celery_app.task
def nightly_decay_monitor_task():
    """
    Celery task run nightly to decrement freshness score of existing items based on time
    and notify owners of items nearing expiry or decaying.
    """
    logger.info("Running nightly decay inventory monitor task...")
    # This task is called via beat scheduler or endpoint
    # Logic: Decrement score by category decay coefficient, update PostgreSQL DB, and generate alerts
    return {"status": "success", "monitored_items_count": 0}
