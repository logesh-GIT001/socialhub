import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import decrypt_token
from app.models.all import Post, PostPlatform, OAuthToken
from app.services.social_platforms.manager import platform_manager
from app.services.notification_service import create_notification
from app.services.audit_logger import log_action


async def publish_scheduled_posts() -> None:
    """Finds all approved posts that are scheduled to be published now or in the past,

    and publishes them to their respective platforms.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        # Find approved posts that should have been published by now (or immediately if no schedule)
        from sqlalchemy import or_
        scheduled_posts = (
            db.query(Post)
            .filter(Post.status == "approved")
            .filter(or_(Post.scheduled_at <= now, Post.scheduled_at == None))
            .all()
        )


        for post in scheduled_posts:
            # Change post status to scheduled/processing
            post.status = "scheduled"
            db.commit()

            # We will process each platform for this post
            all_platforms_success = True
            errors = []

            for platform_assoc in post.platforms:
                # Find connected social account and credentials
                platform = platform_assoc.platform
                
                # Query active connected social account for this platform
                # Note: For simplicity, we query the most recent connected account of this platform type
                # In full multi-account workspace, it would be linked explicitly or queried.
                from app.models.all import SocialAccount
                social_account = (
                    db.query(SocialAccount)
                    .filter(SocialAccount.platform == platform)
                    .filter(SocialAccount.is_active == True)
                    .first()
                )

                if not social_account:
                    err_msg = f"No active social account connected for platform '{platform}'."
                    platform_assoc.status = "failed"
                    platform_assoc.error_message = err_msg
                    all_platforms_success = False
                    errors.append(err_msg)
                    continue

                # Fetch and decrypt token
                token_record = db.query(OAuthToken).filter(OAuthToken.social_account_id == social_account.id).first()
                if not token_record:
                    err_msg = f"OAuth credentials missing for platform account '{social_account.name}'."
                    platform_assoc.status = "failed"
                    platform_assoc.error_message = err_msg
                    all_platforms_success = False
                    errors.append(err_msg)
                    continue

                try:
                    decrypted_token = decrypt_token(token_record.access_token)
                except Exception as e:
                    err_msg = f"Failed to decrypt credentials: {str(e)}"
                    platform_assoc.status = "failed"
                    platform_assoc.error_message = err_msg
                    all_platforms_success = False
                    errors.append(err_msg)
                    continue

                # Publish to platform
                try:
                    adapter = platform_manager.get_adapter(platform)
                    media_urls = [m.file_path for m in post.media]
                    
                    publish_result = await adapter.publish_post(
                        access_token=decrypted_token,
                        content=post.content,
                        media_urls=media_urls,
                        platform_user_id=social_account.platform_user_id
                    )

                    if publish_result.get("success"):
                        platform_assoc.status = "success"
                        platform_assoc.platform_post_id = publish_result.get("platform_post_id")
                        platform_assoc.error_message = None
                    else:
                        platform_assoc.status = "failed"
                        platform_assoc.error_message = publish_result.get("error_message")
                        all_platforms_success = False
                        errors.append(f"[{platform}] {publish_result.get('error_message')}")

                except Exception as e:
                    err_msg = f"Integration error: {str(e)}"
                    platform_assoc.status = "failed"
                    platform_assoc.error_message = err_msg
                    all_platforms_success = False
                    errors.append(f"[{platform}] {err_msg}")

            # Update final post status
            if all_platforms_success:
                post.status = "published"
                post.published_at = datetime.now(timezone.utc)
                db.commit()

                # Notify creator
                if post.creator_id:
                    create_notification(
                        db,
                        user_id=post.creator_id,
                        title="Post Published Successfully",
                        message=f"Your post (ID: {post.id}) has been published to all platforms.",
                        notification_type="success",
                    )
                
                # Log audit
                log_action(
                    db,
                    user_id=None,  # System background worker action
                    action="post_publish_success",
                    target_object=f"post:{post.id}",
                    details={"platforms": [p.platform for p in post.platforms]}
                )
            else:
                post.status = "failed"
                db.commit()

                # Notify creator
                if post.creator_id:
                    create_notification(
                        db,
                        user_id=post.creator_id,
                        title="Post Publication Failed",
                        message=f"Your post (ID: {post.id}) failed to publish on some platforms: {', '.join(errors[:2])}",
                        notification_type="error",
                    )
                
                # Log audit
                log_action(
                    db,
                    user_id=None,
                    action="post_publish_failed",
                    target_object=f"post:{post.id}",
                    details={"errors": errors}
                )

    finally:
        db.close()
