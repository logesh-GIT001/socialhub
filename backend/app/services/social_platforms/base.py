from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class BaseSocialAdapter(ABC):
    
    @abstractmethod
    def get_authorization_url(self, state: str) -> str:
        """Returns the OAuth login authorization URL for the user to visit."""
        pass

    @abstractmethod
    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """Exchanges authorization code for access and refresh tokens.
        
        Returns:
            dict containing:
                access_token: str
                refresh_token: Optional[str]
                expires_in_seconds: Optional[int]
                platform_user_id: str
                account_name: str
        """
        pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refreshes an expired access token using the refresh token."""
        pass

    @abstractmethod
    async def publish_post(self, access_token: str, content: str, media_urls: List[str], platform_user_id: Optional[str] = None) -> Dict[str, Any]:
        """Publishes post content and attachments to the social media network.
        
        Returns:
            dict containing:
                success: bool
                platform_post_id: Optional[str]
                error_message: Optional[str]
        """
        pass

    @abstractmethod
    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        """Fetches post engagement metrics or profile overview analytics.
        
        Returns:
            dict containing:
                likes: int
                shares: int
                comments: int
                reach: int
                impressions: int
                followers: int
        """
        pass
