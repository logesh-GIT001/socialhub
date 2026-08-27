import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.seed import seed_database
from app.api import auth, users, roles, permissions, social, posts, media, analytics, notifications, settings as sys_settings, audit
from app.tasks.publish_task import publish_scheduled_posts

# Background task for standalone scheduling monitor
scheduler_task = None


async def run_standalone_scheduler():
    """Background polling loop that checks and publishes scheduled posts every 10 seconds.

    Acts as a lightweight Celery replacement for single-process local setups.
    """
    while True:
        try:
            await publish_scheduled_posts()
        except Exception as e:
            # Prevent background loop crash on connection drops
            pass
        await asyncio.sleep(10)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global scheduler_task
    # Startup actions:
    # 1. Create tables automatically (useful for SQLite / fresh Postgres)
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed default roles, permissions, and admin user
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # 3. Start standalone scheduling check loop in background
    scheduler_task = asyncio.create_task(run_standalone_scheduler())
    
    yield
    
    # Shutdown actions:
    if scheduler_task:
        scheduler_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS] if settings.BACKEND_CORS_ORIGINS else [],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(roles.router, prefix=f"{settings.API_V1_STR}/roles", tags=["Roles"])
app.include_router(permissions.router, prefix=f"{settings.API_V1_STR}/permissions", tags=["Permissions"])
app.include_router(social.router, prefix=f"{settings.API_V1_STR}/social", tags=["Social Accounts"])
app.include_router(posts.router, prefix=f"{settings.API_V1_STR}/posts", tags=["Posts"])
app.include_router(media.router, prefix=f"{settings.API_V1_STR}/media", tags=["Media Library"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["Notifications"])
app.include_router(sys_settings.router, prefix=f"{settings.API_V1_STR}/settings", tags=["Settings"])
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["Audit Logs"])


@app.get("/", include_in_schema=False)
def root():
    """Redirects base path to Swagger API documentation."""
    return RedirectResponse(url="/docs")
