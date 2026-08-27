from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class PlatformMetric(BaseModel):
    platform: str
    likes: int
    shares: int
    comments: int
    reach: int
    impressions: int
    followers: int
    engagement_rate: float


class CampaignMetric(BaseModel):
    campaign_id: int
    campaign_name: str
    posts_count: int
    total_likes: int
    total_shares: int
    total_comments: int


class EngagementOverTime(BaseModel):
    date: str
    likes: int
    shares: int
    comments: int
    reach: int


class BestPerformingPost(BaseModel):
    post_id: int
    content: str
    platforms: List[str]
    total_likes: int
    total_shares: int
    total_comments: int
    score: float


class AnalyticsSummary(BaseModel):
    total_likes: int
    total_shares: int
    total_comments: int
    total_reach: int
    total_impressions: int
    average_engagement_rate: float
    platform_metrics: List[PlatformMetric]
    campaign_metrics: List[CampaignMetric]
    engagement_trend: List[EngagementOverTime]
    best_performing_posts: List[BestPerformingPost]
