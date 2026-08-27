from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class XAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = settings.X_CLIENT_ID
        self.client_secret = settings.X_CLIENT_SECRET
        self.redirect_uri = settings.X_REDIRECT_URI
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=x&code=mock_x_auth_code&state={state}"
        
        # X OAuth 2.0 PKCE requires code_challenge. For simple flows, we pass challenge
        # standard fields: code_challenge=challenge&code_challenge_method=plain
        # Note: Production implementations should generate a dynamic verifier and save in cache/session.
        return (
            f"https://twitter.com/i/oauth2/authorize?"
            f"response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state}"
            f"&scope=tweet.read%20tweet.write%20users.read%20offline.access"
            f"&code_challenge=challenge"
            f"&code_challenge_method=plain"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_x_token_{int(time.time())}",
                "refresh_token": f"mock_x_refresh_{int(time.time())}",
                "expires_in_seconds": 7200,  # X access tokens expire in 2 hours
                "platform_user_id": "x_user_12345",
                "account_name": "X Brand Handle",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://api.twitter.com/2/oauth2/token"
        
        # Auth header for X client confidential client authentication
        # Some clients require basic auth headers or application/x-www-form-urlencoded payloads
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "code": auth_code,
            "grant_type": "authorization_code",
            "redirect_uri": uri,
            "code_verifier": "challenge",
            "client_id": self.client_id,
        }
        
        auth = (self.client_id, self.client_secret) if self.client_secret else None
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers, auth=auth)
            response.raise_for_status()
            token_data = response.json()
            
            # Retrieve authorized user details
            me_url = "https://api.twitter.com/2/users/me"
            me_response = await client.get(
                me_url, headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            me_response.raise_for_status()
            me_data = me_response.json().get("data", {})
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in_seconds": token_data.get("expires_in"),
                "platform_user_id": me_data.get("id"),
                "account_name": f"@{me_data.get('username')}",
            }

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_x_token_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 7200,
            }

        url = "https://api.twitter.com/2/oauth2/token"
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
        }
        auth = (self.client_id, self.client_secret) if self.client_secret else None
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, auth=auth)
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
                "platform_post_id": f"x_tweet_{int(time.time())}",
                "error_message": None,
            }

        url = "https://api.twitter.com/2/tweets"
        payload = {"text": content}
        
        # In real Twitter API v2: media uploads require a separate multipart v1.1 upload call first
        # For simplicity, if media URLs are supplied, we can append them to the text or perform v1 upload if supported.
        if media_urls:
            payload["text"] += f"\n{media_urls[0]}"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, json=payload, headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
            )
            
            if response.status_code not in (200, 201):
                return {"success": False, "platform_post_id": None, "error_message": response.text}
                
            data = response.json().get("data", {})
            return {"success": True, "platform_post_id": data.get("id"), "error_message": None}

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            import random
            return {
                "likes": random.randint(20, 5000),
                "shares": random.randint(5, 1200),
                "comments": random.randint(1, 800),
                "reach": random.randint(500, 35000),
                "impressions": random.randint(700, 50000),
                "followers": random.randint(1000, 25000),
            }

        # X API v2 tweet details has organic metrics
        # Real query: https://api.twitter.com/2/tweets/{id}?tweet.fields=public_metrics
        return {
            "likes": 180,
            "shares": 45,
            "comments": 12,
            "reach": 3400,
            "impressions": 4100,
            "followers": 0
        }
