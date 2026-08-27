from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker
from app.models.all import AnalyticsSnapshot, SocialAccount, Post, PostPlatform
from app.schemas.analytics import AnalyticsSummary, PlatformMetric, CampaignMetric, EngagementOverTime, BestPerformingPost

router = APIRouter()


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    dependencies=[Depends(PermissionChecker(["analytics:view"]))],
)
def get_analytics_summary(
    platform: Optional[str] = None,
    campaign_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Any:
    """Aggregates real engagement snapshots and returns metrics, trends, and top posts."""
    query = db.query(AnalyticsSnapshot)
    if platform:
        query = query.join(SocialAccount).filter(SocialAccount.platform == platform.lower())
    
    snapshots = query.order_by(AnalyticsSnapshot.recorded_at.desc()).limit(200).all()

    if not snapshots:
        # Check if we have published posts
        published_posts_query = db.query(Post).filter(Post.status == "published")
        if campaign_id:
            published_posts_query = published_posts_query.filter(Post.campaign_id == campaign_id)
        published_posts = published_posts_query.all()

        best_posts = []
        for post in published_posts[:5]:
            best_posts.append({
                "post_id": post.id,
                "content": post.content,
                "platforms": [p.platform for p in post.platforms],
                "total_likes": 0,
                "total_shares": 0,
                "total_comments": 0,
                "score": 0.0,
            })

        return {
            "total_likes": 0,
            "total_shares": 0,
            "total_comments": 0,
            "total_reach": 0,
            "total_impressions": 0,
            "average_engagement_rate": 0.0,
            "platform_metrics": [],
            "campaign_metrics": [],
            "engagement_trend": [],
            "best_performing_posts": best_posts,
        }

    # Real data aggregation from snapshots
    total_likes = sum(s.likes for s in snapshots)
    total_shares = sum(s.shares for s in snapshots)
    total_comments = sum(s.comments for s in snapshots)
    total_reach = sum(s.reach for s in snapshots)
    total_impressions = sum(s.impressions for s in snapshots)
    
    # Build platform metrics
    platform_map = {}
    for s in snapshots:
        plat = s.social_account.platform if s.social_account else "unknown"
        if plat not in platform_map:
            platform_map[plat] = {"likes": 0, "shares": 0, "comments": 0, "reach": 0, "impressions": 0, "followers": 0, "count": 0}
        
        platform_map[plat]["likes"] += s.likes
        platform_map[plat]["shares"] += s.shares
        platform_map[plat]["comments"] += s.comments
        platform_map[plat]["reach"] += s.reach
        platform_map[plat]["impressions"] += s.impressions
        platform_map[plat]["followers"] = max(platform_map[plat]["followers"], s.followers or 0)
        platform_map[plat]["count"] += 1

    platform_metrics = []
    for plat, data in platform_map.items():
        engagement = ((data["likes"] + data["comments"] + data["shares"]) / max(data["impressions"], 1)) * 100
        platform_metrics.append({
            "platform": plat,
            "likes": data["likes"],
            "shares": data["shares"],
            "comments": data["comments"],
            "reach": data["reach"],
            "impressions": data["impressions"],
            "followers": data["followers"],
            "engagement_rate": round(engagement, 2),
        })

    # Build trend charts (group by day)
    trend_map = {}
    for s in sorted(snapshots, key=lambda x: x.recorded_at):
        day_str = s.recorded_at.strftime("%b %d")
        if day_str not in trend_map:
            trend_map[day_str] = {"likes": 0, "shares": 0, "comments": 0, "reach": 0}
        trend_map[day_str]["likes"] += s.likes
        trend_map[day_str]["shares"] += s.shares
        trend_map[day_str]["comments"] += s.comments
        trend_map[day_str]["reach"] += s.reach

    engagement_trend = [
        {
            "date": k,
            "likes": v["likes"],
            "shares": v["shares"],
            "comments": v["comments"],
            "reach": v["reach"],
        }
        for k, v in trend_map.items()
    ]

    # Best performing published posts
    best_posts = []
    published_posts = db.query(Post).filter(Post.status == "published").limit(5).all()
    for post in published_posts:
        best_posts.append({
            "post_id": post.id,
            "content": post.content,
            "platforms": [p.platform for p in post.platforms],
            "total_likes": 0,
            "total_shares": 0,
            "total_comments": 0,
            "score": 0.0,
        })

    avg_engagement = round(((total_likes + total_shares + total_comments) / max(total_impressions, 1)) * 100, 2) if total_impressions > 0 else 0.0

    return {
        "total_likes": total_likes,
        "total_shares": total_shares,
        "total_comments": total_comments,
        "total_reach": total_reach,
        "total_impressions": total_impressions,
        "average_engagement_rate": avg_engagement,
        "platform_metrics": platform_metrics,
        "campaign_metrics": [],
        "engagement_trend": engagement_trend,
        "best_performing_posts": best_posts,
    }
