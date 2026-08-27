from datetime import datetime, timedelta, timezone
from app.models.all import Post, PostPlatform, SocialAccount, OAuthToken, User, Role
from app.tasks.publish_task import publish_scheduled_posts
from app.core.security import encrypt_token, get_password_hash


def test_post_creation_and_approval(client, db):
    # Setup: Create a Marketing Executive user (who does not have posts:bypass_approval)
    exec_role = db.query(Role).filter(Role.name == "Marketing Executive").first()
    exec_user = User(
        email="executive@socialhub.corp",
        hashed_password=get_password_hash("ExecPass123!"),
        full_name="Marketing Executive",
        is_active=True,
        roles=[exec_role]
    )
    db.add(exec_user)
    db.commit()

    # 1. Login as Marketing Executive
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "executive@socialhub.corp",
        "password": "ExecPass123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a Post
    payload = {
        "content": "Join our Summer Hackathon! #code #tech",
        "platforms": ["linkedin", "x"],
        "media_ids": [],
        "scheduled_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    }
    
    create_resp = client.post("/api/v1/posts/", json=payload, headers=headers)
    assert create_resp.status_code == 200
    post_data = create_resp.json()
    assert post_data["status"] == "draft"
    assert len(post_data["platforms"]) == 2
    post_id = post_data["id"]

    # 3. Submit post for Review (status becomes in_review)
    submit_resp = client.put(f"/api/v1/posts/{post_id}", json={"status": "in_review"}, headers=headers)
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "in_review"

    # 4. Login as CEO to approve
    ceo_login_resp = client.post("/api/v1/auth/login", json={
        "email": "ceo@socialhub.corp",
        "password": "AdminPassword123!"
    })
    ceo_token = ceo_login_resp.json()["access_token"]
    ceo_headers = {"Authorization": f"Bearer {ceo_token}"}

    # 5. Approve post (status becomes approved)
    approve_resp = client.put(f"/api/v1/posts/{post_id}", json={"status": "approved"}, headers=ceo_headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "approved"
    assert approve_resp.json()["reviewer_name"] == "Chief Executive Officer"


def test_post_rejection_workflow(client):
    # Login as CEO
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "ceo@socialhub.corp",
        "password": "AdminPassword123!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_data = client.post("/api/v1/posts/", json={
        "content": "Rejected idea",
        "platforms": ["linkedin"]
    }, headers=headers).json()
    post_id = post_data["id"]

    # Submit for review
    client.put(f"/api/v1/posts/{post_id}", json={"status": "in_review"}, headers=headers)

    # Reject post with comment
    reject_payload = {
        "status": "draft",
        "rejection_comment": "Content violates typography branding guidelines."
    }
    reject_resp = client.put(f"/api/v1/posts/{post_id}", json=reject_payload, headers=headers)
    assert reject_resp.status_code == 200
    
    updated_data = reject_resp.json()
    assert updated_data["status"] == "draft"
    assert updated_data["rejection_comment"] == "Content violates typography branding guidelines."


def test_scheduled_publisher_task(client, db):
    # Setup: connect a mock LinkedIn account so the system can decrypt credentials
    user = db.query(User).filter(User.email == "ceo@socialhub.corp").first()
    
    social_account = SocialAccount(
        platform="linkedin",
        name="LinkedIn Corp Page",
        platform_user_id="li_page_987",
        is_active=True,
        connected_by_id=user.id
    )
    db.add(social_account)
    db.flush()
    
    oauth_token = OAuthToken(
        social_account_id=social_account.id,
        access_token=encrypt_token("mock_access_token"),
        refresh_token=encrypt_token("mock_refresh_token")
    )
    db.add(oauth_token)
    db.commit()

    # Create a scheduled post that should have run 5 minutes ago
    past_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5)
    post = Post(
        content="This is a retroactively scheduled post.",
        status="approved",
        creator_id=user.id,
        scheduled_at=past_time
    )
    db.add(post)
    db.flush()
    
    platform = PostPlatform(post_id=post.id, platform="linkedin", status="pending")
    db.add(platform)
    db.commit()

    # Trigger background scheduler execution synchronously
    import asyncio
    asyncio.run(publish_scheduled_posts())

    # Verify post and platform records are updated to published/success states
    db.refresh(post)
    db.refresh(platform)
    
    assert post.status == "published"
    assert platform.status == "success"
    assert platform.platform_post_id is not None
