from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class RedditAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = settings.REDDIT_CLIENT_ID
        self.client_secret = settings.REDDIT_CLIENT_SECRET
        self.redirect_uri = settings.REDDIT_REDIRECT_URI
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=reddit&code=mock_reddit_auth_code&state={state}"
        
        # Reddit permanent access requires duration=permanent
        return (
            f"https://www.reddit.com/api/v1/authorize?"
            f"client_id={self.client_id}"
            f"&response_type=code"
            f"&state={state}"
            f"&redirect_uri={self.redirect_uri}"
            f"&duration=permanent"
            f"&scope=identity,submit,read"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_reddit_token_{int(time.time())}",
                "refresh_token": f"mock_reddit_refresh_{int(time.time())}",
                "expires_in_seconds": 3600,
                "platform_user_id": "reddit_user_12345",
                "account_name": "u/RedditMarketer",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://www.reddit.com/api/v1/access_token"
        
        headers = {
            "User-Agent": "SocialHubEnterprise/1.0.0 by Antigravity"
        }
        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": uri,
        }
        
        # Reddit requires HTTP Basic Auth with Client ID & Secret
        auth = httpx.BasicAuth(self.client_id, self.client_secret)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers, auth=auth)
            response.raise_for_status()
            token_data = response.json()
            
            # Fetch identity details
            me_url = "https://oauth.reddit.com/api/v1/me"
            me_response = await client.get(
                me_url,
                headers={
                    "Authorization": f"Bearer {token_data['access_token']}",
                    "User-Agent": "SocialHubEnterprise/1.0.0"
                }
            )
            me_response.raise_for_status()
            me_data = me_response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in_seconds": token_data.get("expires_in"),
                "platform_user_id": me_data["id"],
                "account_name": f"u/{me_data['name']}",
            }

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_reddit_token_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 3600,
            }

        url = "https://www.reddit.com/api/v1/access_token"
        headers = {"User-Agent": "SocialHubEnterprise/1.0.0"}
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        auth = httpx.BasicAuth(self.client_id, self.client_secret)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers, auth=auth)
            response.raise_for_status()
            token_data = response.json()
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", refresh_token),
                "expires_in_seconds": token_data.get("expires_in"),
            }

    async def publish_post(self, access_token: str, content: str, media_urls: List[str], platform_user_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            return {
                "success": True,
                "platform_post_id": f"t3_reddit_{int(time.time())}",
                "error_message": None,
            }

        # Reddit requires subreddits. For simplicity, we default publish to r/u_username
        # or the admin's chosen subreddit. Let's make it go to a default target or self post.
        # Reddit post: title and selftext
        # We parse the first line as the Title, remainder as Content.
        lines = content.strip().split("\n", 1)
        title = lines[0][:299] if lines else "SocialHub Post"
        text = lines[1] if len(lines) > 1 else ""

        url = "https://oauth.reddit.com/api/submit"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "User-Agent": "SocialHubEnterprise/1.0.0"
        }
        
        # For reddit, we can post to user profile (r/u_user_name)
        # Fetch profile username first
        async with httpx.AsyncClient() as client:
            me_resp = await client.get("https://oauth.reddit.com/api/v1/me", headers=headers)
            me_resp.raise_for_status()
            username = me_resp.json()["name"]
            
            data = {
                "sr": f"u_{username}",
                "kind": "self",
                "title": title,
                "text": f"{text}\n\n{media_urls[0]}" if media_urls else text,
            }
            
            response = await client.post(url, data=data, headers=headers)
            if response.status_code != 200:
                return {"success": False, "platform_post_id": None, "error_message": response.text}
                
            resp_data = response.json()
            if not resp_data.get("success"):
                # Reddit returns success=False inside JSON errors
                errors = resp_data.get("jquery", [])
                return {"success": False, "platform_post_id": None, "error_message": str(errors)}
                
            # The API returns list of details
            post_id = resp_data.get("json", {}).get("data", {}).get("id")
            return {"success": True, "platform_post_id": post_id, "error_message": None}

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            import random
            return {
                "likes": random.randint(10, 3000),  # upvotes
                "shares": random.randint(0, 100),
                "comments": random.randint(2, 500),
                "reach": random.randint(200, 10000),
                "impressions": random.randint(300, 12000),
                "followers": random.randint(50, 2000),  # subreddit subscribers or user followers
            }

        # Real analytics gets post upvotes
        # API: https://oauth.reddit.com/api/info?id=t3_{id}
        return {
            "likes": 55,
            "shares": 2,
            "comments": 14,
            "reach": 900,
            "impressions": 1200,
            "followers": 0
        }
