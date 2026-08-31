"""Background scheduler: periodically refreshes notifications for all users."""

import asyncio
import contextlib
import logging

from app.core.config import get_settings
from app.db import SessionLocal
from app.models import User
from app.services.notifications import sync_user_notifications

logger = logging.getLogger(__name__)


async def _sync_all_users() -> None:
    with SessionLocal() as db:
        for user in db.query(User).filter(User.is_active.is_(True)).all():
            try:
                result = sync_user_notifications(db, user)
                if result["created"]:
                    logger.info(
                        "Notification sync for %s: %d alert(s)", user.email, result["created"]
                    )
            except Exception:
                logger.exception("Notification sync failed for user %s", user.email)


async def _loop(interval: int) -> None:
    while True:
        await asyncio.sleep(interval)
        try:
            await asyncio.to_thread(_sync_all_users)
        except Exception:
            logger.exception("Scheduled notification sync failed")


def start_notification_scheduler() -> asyncio.Task | None:
    settings = get_settings()
    if settings.NOTIFICATION_SYNC_DISABLED:
        return None
    task = asyncio.create_task(_loop(settings.NOTIFICATION_SYNC_INTERVAL_MINUTES * 60))
    logger.info(
        "Notification scheduler started (every %dm)", settings.NOTIFICATION_SYNC_INTERVAL_MINUTES
    )
    return task


async def stop_notification_scheduler(task: asyncio.Task | None) -> None:
    if task is not None:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
