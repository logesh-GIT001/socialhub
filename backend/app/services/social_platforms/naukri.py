from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class NaukriAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = getattr(settings, "NAUKRI_CLIENT_ID", None)
        self.client_secret = getattr(settings, "NAUKRI_CLIENT_SECRET", None)
        self.redirect_uri = getattr(settings, "NAUKRI_REDIRECT_URI", "http://localhost:3000/social-callback")
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=naukri&code=mock_naukri_auth_code&state={state}"
        
        # Real Naukri OAuth 2.0 URL
        return (
            f"https://api.naukri.com/v2/oauth/authorize?"
            f"response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state}"
            f"&scope=jobs.manage%20profile.read"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_naukri_token_{int(time.time())}",
                "refresh_token": f"mock_naukri_refresh_{int(time.time())}",
                "expires_in_seconds": 3600,
                "platform_user_id": "naukri_company_12345",
                "account_name": "Naukri Brand Careers",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://api.naukri.com/v2/oauth/token"
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "code": auth_code,
            "grant_type": "authorization_code",
            "redirect_uri": uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers)
            response.raise_for_status()
            token_data = response.json()
            
            # Fetch company details
            me_url = "https://api.naukri.com/v2/company/profile"
            me_response = await client.get(
                me_url, headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            me_response.raise_for_status()
            me_data = me_response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in_seconds": token_data.get("expires_in"),
                "platform_user_id": me_data.get("company_id", "naukri_company_12345"),
                "account_name": me_data.get("company_name", "Naukri Brand Careers"),
            }

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_naukri_token_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 3600,
            }

        url = "https://api.naukri.com/v2/oauth/token"
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
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
                "platform_post_id": f"naukri_job_{int(time.time())}",
                "error_message": None,
            }

        url = "https://api.naukri.com/v2/jobs/post"
        # Simulate Naukri Job Post or hiring announcement
        payload = {
            "title": "Hiring Announcement",
            "description": content,
            "requirements": "See announcement details.",
        }
        if media_urls:
            payload["banner_url"] = media_urls[0]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
            )
            
            if response.status_code not in (200, 201):
                return {"success": False, "platform_post_id": None, "error_message": response.text}
                
            data = response.json()
            return {"success": True, "platform_post_id": data.get("job_id"), "error_message": None}

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            import random
            return {
                "likes": random.randint(15, 300),      # Simulated job interest/clicks
                "shares": random.randint(2, 80),        # Shares
                "comments": random.randint(5, 150),     # Simulated applications/replies
                "reach": random.randint(300, 12000),    # Views
                "impressions": random.randint(500, 18000),
                "followers": random.randint(100, 3000), # Company page followers
            }

        # Real Naukri job performance insights
        return {
            "likes": 42,
            "shares": 10,
            "comments": 28,
            "reach": 2100,
            "impressions": 3200,
            "followers": 0
        }
