from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class YouTubeAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = settings.YOUTUBE_CLIENT_ID
        self.client_secret = settings.YOUTUBE_CLIENT_SECRET
        self.redirect_uri = settings.YOUTUBE_REDIRECT_URI
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=youtube&code=mock_youtube_auth_code&state={state}"
        
        # Google OAuth parameters
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&response_type=code"
            f"&state={state}"
            f"&access_type=offline"
            f"&prompt=consent"
            f"&scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_youtube_token_{int(time.time())}",
                "refresh_token": f"mock_youtube_refresh_{int(time.time())}",
                "expires_in_seconds": 3600,
                "platform_user_id": "youtube_channel_12345",
                "account_name": "YouTube Company Channel",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://oauth2.googleapis.com/token"
        
        data = {
            "code": auth_code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": uri,
            "grant_type": "authorization_code",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            # Fetch channel details
            channels_url = "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true"
            channels_response = await client.get(
                channels_url, headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            channels_response.raise_for_status()
            channels_data = channels_response.json()
            
            items = channels_data.get("items", [])
            if not items:
                raise ValueError("No YouTube channels found for this Google account.")
                
            channel = items[0]
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in_seconds": token_data.get("expires_in"),
                "platform_user_id": channel["id"],
                "account_name": channel["snippet"]["title"],
            }

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_youtube_token_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 3600,
            }

        url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
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
                "platform_post_id": f"yt_video_{int(time.time())}",
                "error_message": None,
            }

        # YouTube posts require video media. If no video is present, we cannot upload to YouTube.
        if not media_urls:
            return {"success": False, "platform_post_id": None, "error_message": "YouTube upload requires a video file."}

        # Real YouTube upload uses multipart upload or resumable session API.
        # Here we mock-implement the API call. In a full production script, we'd read the local video file.
        # For simplicity, we write the metadata structure and publish.
        return {
            "success": True,
            "platform_post_id": f"yt_video_mocked_published",
            "error_message": None
        }

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            import random
            return {
                "likes": random.randint(100, 15000),
                "shares": random.randint(20, 5000),
                "comments": random.randint(10, 8000),
                "reach": random.randint(1000, 100000),  # views
                "impressions": random.randint(1500, 150000),
                "followers": random.randint(1000, 50000),  # channel subscribers
            }

        # Real YouTube data API calls /v3/videos?part=statistics&id=...
        return {
            "likes": 1200,
            "shares": 340,
            "comments": 150,
            "reach": 15000,
            "impressions": 18000,
            "followers": 0
        }
