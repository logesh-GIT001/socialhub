from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker, get_current_user
from app.models.all import (
    User, Post, PostPlatform, Media, Comment, Campaign, SocialAccount
)
from app.schemas.post import (
    PostCreate, PostUpdate, PostResponse, CommentCreate, CommentResponse,
    CampaignCreate, CampaignResponse, DashboardSummary
)
from app.services.audit_logger import log_action
from app.services.notification_service import create_notification, notify_role_members
from app.tasks.publish_task import publish_scheduled_posts

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Calculates statistics for the dashboard widgets."""
    connected_count = db.query(SocialAccount).filter(SocialAccount.is_active == True).count()
    pending_count = db.query(Post).filter(Post.status == "in_review").count()
    draft_count = db.query(Post).filter(Post.status == "draft").count()
    scheduled_count = db.query(Post).filter(Post.status == "approved").count()  # Approved = scheduled in our model
    failed_count = db.query(Post).filter(Post.status == "failed").count()
    published_count = db.query(Post).filter(Post.status == "published").count()

    # Sum up metrics for general estimate
    from app.models.all import AnalyticsSnapshot
    # Get latest snapshots
    latest_snapshots = db.query(AnalyticsSnapshot).order_by(AnalyticsSnapshot.recorded_at.desc()).limit(20).all()
    total_followers = sum(s.followers for s in latest_snapshots if s.followers) if latest_snapshots else 0
    total_impressions = sum(s.impressions for s in latest_snapshots if s.impressions) if latest_snapshots else 0
    total_engagements = sum((s.likes or 0) + (s.shares or 0) + (s.comments or 0) for s in latest_snapshots) if latest_snapshots else 0
    avg_eng = round((total_engagements / max(total_impressions, 1)) * 100, 2) if total_impressions > 0 else 0.0
    
    return {
        "connected_accounts_count": connected_count,
        "pending_approvals_count": pending_count,
        "draft_posts_count": draft_count,
        "scheduled_posts_count": scheduled_count,
        "failed_posts_count": failed_count,
        "published_posts_count": published_count,
        "total_followers_estimate": total_followers,
        "engagement_rate_estimate": avg_eng,
    }


@router.get("/", response_model=List[PostResponse])
def get_posts(
    status: Optional[str] = None,
    campaign_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieve posts filtered by status, campaign, or textual search query."""
    query = db.query(Post)
    
    if status:
        query = query.filter(Post.status == status)
    if campaign_id:
        query = query.filter(Post.campaign_id == campaign_id)
    if search:
        query = query.filter(Post.content.ilike(f"%{search}%"))

    # Order by updated date
    posts = query.order_by(Post.updated_at.desc()).all()
    
    # Decorate creator and reviewer names manually to avoid lazy loading issues
    for post in posts:
        post.creator_name = post.creator.full_name if post.creator else "System"
        post.reviewer_name = post.reviewer.full_name if post.reviewer else None
        
        # Format comments
        for c in post.comments:
            c.user_name = c.user.full_name if c.user else "Anonymous"
            
    return posts


@router.post("/", response_model=PostResponse)
def create_post(
    post_in: PostCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Creates a new post in 'draft' mode and links its target platforms and media."""
    user_permissions = current_user.permissions
    if "posts:create" not in user_permissions:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot create posts.")

    new_post = Post(
        content=post_in.content,
        status="draft",
        creator_id=current_user.id,
        scheduled_at=post_in.scheduled_at,
        campaign_id=post_in.campaign_id,
    )
    db.add(new_post)
    db.flush()

    # Link platforms
    for platform in post_in.platforms:
        platform_assoc = PostPlatform(
            post_id=new_post.id,
            platform=platform.lower(),
            status="pending",
        )
        db.add(platform_assoc)

    # Link media
    if post_in.media_ids:
        media_items = db.query(Media).filter(Media.id.in_(post_in.media_ids)).all()
        new_post.media = media_items

    db.commit()
    db.refresh(new_post)
    
    # Decorate creator name for response
    new_post.creator_name = current_user.full_name

    log_action(
        db,
        user_id=current_user.id,
        action="post_create",
        target_object=f"post:{new_post.id}",
        details={"platforms": post_in.platforms},
        request=request
    )

    return new_post


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetch details of a single post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    
    post.creator_name = post.creator.full_name if post.creator else "System"
    post.reviewer_name = post.reviewer.full_name if post.reviewer else None
    
    for c in post.comments:
        c.user_name = c.user.full_name if c.user else "Anonymous"
        
    return post


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_in: PostUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Updates a post's content, schedule, media links, status, and appends reviewer logs."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    # Permissions check
    user_permissions = current_user.permissions
    is_owner = post.creator_id == current_user.id
    
    if not is_owner and "posts:approve" not in user_permissions and "posts:edit" not in user_permissions:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot modify this post.")

    # Prevent editing published posts
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Cannot edit a post that has already been published.")

    # Update properties
    if post_in.content is not None:
        post.content = post_in.content
    if post_in.scheduled_at is not None:
        post.scheduled_at = post_in.scheduled_at
    if post_in.campaign_id is not None:
        post.campaign_id = post_in.campaign_id
    if post_in.rejection_comment is not None:
        post.rejection_comment = post_in.rejection_comment
    
    if post_in.media_ids is not None:
        media_items = db.query(Media).filter(Media.id.in_(post_in.media_ids)).all()
        post.media = media_items

    if post_in.status is not None:
        # Validate status transitions
        # Reviewers can approve/reject. Owners can submit for review.
        old_status = post.status
        new_status = post_in.status
        
        if new_status == "in_review" and old_status in ("draft", "failed"):
            if "posts:bypass_approval" in user_permissions:
                post.status = "approved"
                post.reviewer_id = current_user.id
            else:
                post.status = "in_review"
                # Alert Reviewers
                notify_role_members(
                    db, "Reviewer", "Draft Awaiting Review",
                    f"A new draft post (ID: {post.id}) has been submitted for review by {current_user.full_name}."
                )
                notify_role_members(
                    db, "CEO", "Draft Awaiting Review",
                    f"A new draft post (ID: {post.id}) has been submitted for review by {current_user.full_name}."
                )
        elif new_status == "approved":
            if "posts:approve" not in user_permissions and "posts:bypass_approval" not in user_permissions:
                raise HTTPException(status_code=403, detail="Forbidden: Only Reviewers or users with bypass authorization can approve posts.")
            post.status = "approved"
            post.reviewer_id = current_user.id
            # Notify owner
            if post.creator_id and post.creator_id != current_user.id:
                create_notification(
                    db, post.creator_id, "Post Approved",
                    f"Your post (ID: {post.id}) was approved by {current_user.full_name}."
                )
        elif new_status == "draft" and old_status == "in_review":  # Rejection
            if "posts:approve" not in user_permissions:
                raise HTTPException(status_code=403, detail="Forbidden: Only Reviewers or CEO can reject posts.")
            post.status = "draft"
            post.reviewer_id = current_user.id
            # Notify owner
            if post.creator_id:
                create_notification(
                    db, post.creator_id, "Post Rejected",
                    f"Your post (ID: {post.id}) was rejected by {current_user.full_name}. Reason: {post.rejection_comment or 'No reason provided'}"
                )
        else:
            # CEO or bypass can bypass transitions
            if "CEO" in [r.name for r in current_user.roles] or "posts:bypass_approval" in user_permissions:
                post.status = new_status
            else:
                raise HTTPException(status_code=400, detail=f"Invalid status transition from {old_status} to {new_status}")

    db.commit()
    db.refresh(post)
    
    post.creator_name = post.creator.full_name if post.creator else "System"
    post.reviewer_name = post.reviewer.full_name if post.reviewer else None

    log_action(
        db,
        user_id=current_user.id,
        action="post_update",
        target_object=f"post:{post.id}",
        details={"status": post.status},
        request=request
    )

    return post


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Deletes a post draft."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    user_permissions = current_user.permissions
    if post.creator_id != current_user.id and "posts:delete" not in user_permissions:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot delete this post.")

    log_action(
        db,
        user_id=current_user.id,
        action="post_delete",
        target_object=f"post:{post_id}",
        request=request
    )

    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully."}


# Sub-Router Comments
@router.post("/{post_id}/comments", response_model=CommentResponse)
def add_post_comment(
    post_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Appends an internal comment/feedback to a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        text=comment_in.text,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    # Notify creator if commenter is a reviewer
    if current_user.id != post.creator_id and post.creator_id:
        create_notification(
            db,
            user_id=post.creator_id,
            title="New Comment on Post",
            message=f"{current_user.full_name} commented on post {post_id}: '{comment.text[:30]}...'"
        )

    comment.user_name = current_user.full_name
    return comment


@router.post(
    "/{post_id}/publish-now",
    dependencies=[Depends(PermissionChecker(["posts:publish"]))],
)
async def publish_post_immediately(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Forces immediate publication of a post (bypasses scheduling)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    if post.status == "published":
        raise HTTPException(status_code=400, detail="Post is already published.")

    # Override scheduled_at and set approved so the publisher runner picks it up
    post.scheduled_at = datetime.now(timezone.utc)
    post.status = "approved"
    db.commit()

    # Trigger task execution synchronously/instantly for immediate feedback
    await publish_scheduled_posts()
    
    # Refresh post detail to show success or fail
    db.refresh(post)
    
    if post.status == "published":
        return {"status": "published", "message": "Post successfully published to all channels."}
    else:
        # Check error message of first platform failure
        first_fail = next((p for p in post.platforms if p.status == "failed"), None)
        err = first_fail.error_message if first_fail else "Unknown publication error."
        raise HTTPException(
            status_code=500,
            detail=f"Publication failed on some platforms. Error: {err}",
        )


# Campaigns APIs
@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Create a marketing campaign to group posts."""
    campaign = Campaign(
        name=campaign_in.name,
        description=campaign_in.description,
        creator_id=current_user.id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/campaigns", response_model=List[CampaignResponse])
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """List all marketing campaigns."""
    return db.query(Campaign).all()
