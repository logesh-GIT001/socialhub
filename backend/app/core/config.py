import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "SocialHub Enterprise"

    # Security
    SECRET_KEY: str = "supersecretjwtkeychangeinproduction1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AES-256 Encryption key for social account tokens (32 bytes base64 encoded or simple 32 character string)
    ENCRYPTION_KEY: str = "32_character_long_secret_key_123"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/socialhub"

    # Redis (Caching & Celery)
    REDIS_URL: str = "redis://localhost:6379/0"

    # File Storage (S3 / MinIO / Local fallback)
    STORAGE_TYPE: str = "local"  # 'local', 's3', 'minio'
    STORAGE_LOCAL_PATH: str = "/home/loki/Downloads/socialhub/backend/storage"
    S3_ENDPOINT: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "socialhub-media"
    S3_REGION: str = "us-east-1"

    # Meta Graph API (Instagram & Facebook)
    META_CLIENT_ID: Optional[str] = None
    META_CLIENT_SECRET: Optional[str] = None
    META_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # LinkedIn OAuth
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_REDIRECT_URI: str = "http://localhost:3000/social-callback"
    LINKEDIN_SCOPES: str = "openid profile email w_member_social"

    # X (Twitter) OAuth 2.0
    X_CLIENT_ID: Optional[str] = None
    X_CLIENT_SECRET: Optional[str] = None
    X_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # Reddit OAuth
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # Discord OAuth/Bot
    DISCORD_CLIENT_ID: Optional[str] = None
    DISCORD_CLIENT_SECRET: Optional[str] = None
    DISCORD_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # YouTube OAuth (Google)
    YOUTUBE_CLIENT_ID: Optional[str] = None
    YOUTUBE_CLIENT_SECRET: Optional[str] = None
    YOUTUBE_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # Naukri OAuth
    NAUKRI_CLIENT_ID: Optional[str] = None
    NAUKRI_CLIENT_SECRET: Optional[str] = None
    NAUKRI_REDIRECT_URI: str = "http://localhost:3000/social-callback"

    # Allowed CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
