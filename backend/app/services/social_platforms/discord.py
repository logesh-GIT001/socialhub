from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class DiscordAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = settings.DISCORD_CLIENT_ID
        self.client_secret = settings.DISCORD_CLIENT_SECRET
        self.redirect_uri = settings.DISCORD_REDIRECT_URI
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=discord&code=mock_discord_auth_code&state={state}"
        
        # We request identify scope and webhook.incoming configuration
        return (
            f"https://discord.com/api/oauth2/authorize?"
            f"response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&state={state}"
            f"&scope=identify%20webhook.incoming"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_discord_webhook_url_{int(time.time())}",
                "refresh_token": f"mock_discord_refresh_{int(time.time())}",
                "expires_in_seconds": 604800,  # 7 days
                "platform_user_id": "discord_channel_12345",
                "account_name": "Discord #announcements",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://discord.com/api/oauth2/token"
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": uri,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers)
            response.raise_for_status()
            token_data = response.json()
            
            # Extract incoming webhook details if authorized
            webhook_info = token_data.get("webhook", {})
            webhook_url = webhook_info.get("url")
            channel_id = webhook_info.get("channel_id")
            name = webhook_info.get("name") or "Discord Channel"
            
            # If a webhook was created, we store the webhook URL as the "access_token"
            # because we can write directly to it without OAuth bearer headers!
            # Otherwise we fetch user identity.
            if webhook_url:
                return {
                    "access_token": webhook_url,
                    "refresh_token": token_data.get("refresh_token"),
                    "expires_in_seconds": token_data.get("expires_in"),
                    "platform_user_id": channel_id,
                    "account_name": name,
                }
            
            # Fallback to fetching identity
            me_url = "https://discord.com/api/users/@me"
            me_response = await client.get(
                me_url, headers={"Authorization": f"Bearer {token_data['access_token']}"}
            )
            me_response.raise_for_status()
            me_data = me_response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in_seconds": token_data.get("expires_in"),
                "platform_user_id": me_data["id"],
                "account_name": f"{me_data['username']}#{me_data['discriminator']}",
            }

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_discord_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 604800,
            }

        url = "https://discord.com/api/oauth2/token"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, headers=headers)
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
                "platform_post_id": f"discord_msg_{int(time.time())}",
                "error_message": None,
            }

        # If access_token contains a Discord webhook URL (starts with http)
        if access_token.startswith("http"):
            payload = {"content": content}
            
            # Embed image if exists
            if media_urls:
                payload["embeds"] = [
                    {
                        "image": {"url": media_urls[0]}
                    }
                ]
                
            async with httpx.AsyncClient() as client:
                response = await client.post(access_token, json=payload)
                if response.status_code not in (200, 204):
                    return {"success": False, "platform_post_id": None, "error_message": response.text}
                
                # Discord Webhooks don't return standard post ids unless we ask (e.g. ?wait=true)
                return {"success": True, "platform_post_id": "webhook_delivered", "error_message": None}

        # Otherwise publish using standard bot token or oauth bearer (limited channel access)
        return {"success": False, "platform_post_id": None, "error_message": "Bot publication configuration not set."}

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        # Discord channels don't have standard "likes" or "shares".
        # We can simulate views based on channel members or return simple mock statistics.
        import random
        return {
            "likes": random.randint(5, 200),  # message reactions
            "shares": 0,
            "comments": random.randint(1, 50),  # thread comments
            "reach": random.randint(100, 2000),
            "impressions": random.randint(120, 2500),
            "followers": random.randint(50, 1000),  # server members
        }
