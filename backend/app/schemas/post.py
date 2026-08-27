from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class MediaResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_size: int
    content_type: str
    category: str
    tags: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PostPlatformBase(BaseModel):
    platform: str
    status: str = "pending"
    platform_post_id: Optional[str] = None
    error_message: Optional[str] = None


class PostPlatformResponse(PostPlatformBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CommentBase(BaseModel):
    text: str


class CommentCreate(CommentBase):
    pass


class CommentResponse(CommentBase):
    id: int
    post_id: int
    user_id: int
    user_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignResponse(CampaignBase):
    id: int
    creator_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PostBase(BaseModel):
    content: str
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None


class PostCreate(PostBase):
    platforms: List[str]  # e.g., ["facebook", "instagram"]
    media_ids: Optional[List[int]] = []


class PostUpdate(BaseModel):
    content: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[int] = None
    media_ids: Optional[List[int]] = None
    status: Optional[str] = None  # draft, in_review, approved, scheduled, published, etc.
    rejection_comment: Optional[str] = None


class PostResponse(PostBase):
    id: int
    status: str
    creator_id: Optional[int] = None
    creator_name: Optional[str] = None
    reviewer_id: Optional[int] = None
    reviewer_name: Optional[str] = None
    rejection_comment: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    platforms: List[PostPlatformResponse] = []
    media: List[MediaResponse] = []
    comments: List[CommentResponse] = []
    campaign: Optional[CampaignResponse] = None
    model_config = ConfigDict(from_attributes=True)


# Dashboard summary metrics
class DashboardSummary(BaseModel):
    connected_accounts_count: int
    pending_approvals_count: int
    draft_posts_count: int
    scheduled_posts_count: int
    failed_posts_count: int
    published_posts_count: int
    total_followers_estimate: int
    engagement_rate_estimate: float
