import asyncio
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery("socialhub", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# Define a periodic task schedule (beat) to check for scheduled posts every 1 minute
celery_app.conf.beat_schedule = {
    "check-scheduled-posts-every-minute": {
        "task": "app.core.celery_app.celery_publish_scheduled_posts",
        "schedule": 60.0,
    },
}


@celery_app.task(name="app.core.celery_app.celery_publish_scheduled_posts")
def celery_publish_scheduled_posts():
    """Wrapper task for Celery to call the asynchronous publish script."""
    from app.tasks.publish_task import publish_scheduled_posts
    
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # If event loop is already running, run it in a future
        future = asyncio.run_coroutine_threadsafe(publish_scheduled_posts(), loop)
        future.result()
    else:
        loop.run_until_complete(publish_scheduled_posts())
