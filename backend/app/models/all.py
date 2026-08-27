from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Table,
    JSON,
    BigInteger,
)
from sqlalchemy.orm import relationship

from app.core.database import Base

# Many-to-Many Association: Roles & Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

# Many-to-Many Association: Users & Roles
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Optional MFA
    mfa_secret = Column(String(255), nullable=True)
    mfa_enabled = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    custom_permissions = Column(JSON, nullable=True)

    @property
    def permissions(self) -> set:
        perms = {p.name for r in self.roles for p in r.permissions}
        if self.custom_permissions:
            perms.update(self.custom_permissions)
        return perms

    # Relationships
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    posts = relationship("Post", foreign_keys="Post.creator_id", back_populates="creator")
    reviewed_posts = relationship("Post", foreign_keys="Post.reviewer_id", back_populates="reviewer")
    media = relationship("Media", back_populates="uploaded_by")
    campaigns = relationship("Campaign", back_populates="creator")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "posts:create", "users:manage"
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(50), nullable=False)  # instagram, facebook, linkedin, x, reddit, discord, youtube
    name = Column(String(255), nullable=False)      # Profile/Page display name
    platform_user_id = Column(String(255), nullable=False)  # User ID on target platform
    is_active = Column(Boolean, default=True)
    connected_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tokens = relationship("OAuthToken", back_populates="social_account", cascade="all, delete-orphan")
    snapshots = relationship("AnalyticsSnapshot", back_populates="social_account", cascade="all, delete-orphan")


class OAuthToken(Base):
    __tablename__ = "oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="CASCADE"), unique=True, nullable=False)
    access_token = Column(Text, nullable=False)      # Encrypted AES-256
    refresh_token = Column(Text, nullable=True)      # Encrypted AES-256
    expires_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    social_account = relationship("SocialAccount", back_populates="tokens")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("User", back_populates="campaigns")
    posts = relationship("Post", back_populates="campaign")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="draft")  # draft, in_review, approved, scheduled, published, failed, archived
    
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_comment = Column(Text, nullable=True)
    
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="posts")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviewed_posts")
    campaign = relationship("Campaign", back_populates="posts")
    platforms = relationship("PostPlatform", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="post", cascade="all, delete-orphan")
    media = relationship("Media", secondary="post_media_association", back_populates="posts")


# Post Media Association Table (Many-to-Many to allow media library reuse)
post_media_association = Table(
    "post_media_association",
    Base.metadata,
    Column("post_id", Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("media_id", Integer, ForeignKey("media.id", ondelete="CASCADE"), primary_key=True),
)


class PostPlatform(Base):
    __tablename__ = "post_platforms"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(50), nullable=False)  # facebook, instagram, linkedin, x, reddit, discord, youtube
    status = Column(String(50), default="pending")  # pending, success, failed
    platform_post_id = Column(String(255), nullable=True)  # Native platform ID
    error_message = Column(Text, nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="platforms")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)  # S3 URL / local path
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=False)  # image/png, video/mp4, etc.
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), default="general")
    tags = Column(String(255), nullable=True)  # Comma-separated or serialized
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    uploaded_by = relationship("User", back_populates="media")
    posts = relationship("Post", secondary=post_media_association, back_populates="media")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("Post", back_populates="comments")
    user = relationship("User")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    executed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending")  # pending, done, failed
    
    # Relationships
    post = relationship("Post", back_populates="schedules")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    social_account_id = Column(Integer, ForeignKey("social_accounts.id", ondelete="CASCADE"), nullable=False)
    platform_post_id = Column(String(255), nullable=True)  # If post-specific, otherwise general profile metrics
    
    likes = Column(BigInteger, default=0)
    shares = Column(BigInteger, default=0)
    comments = Column(BigInteger, default=0)
    reach = Column(BigInteger, default=0)
    impressions = Column(BigInteger, default=0)
    followers = Column(BigInteger, default=0)
    
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    social_account = relationship("SocialAccount", back_populates="snapshots")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String(100), default="info")  # info, warning, success, error
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    target_object = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
