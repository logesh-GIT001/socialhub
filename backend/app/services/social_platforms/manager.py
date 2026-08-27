from typing import Dict, Any, Optional, List
from app.services.social_platforms.base import BaseSocialAdapter
from app.services.social_platforms.meta import MetaAdapter
from app.services.social_platforms.linkedin import LinkedInAdapter
from app.services.social_platforms.x import XAdapter
from app.services.social_platforms.naukri import NaukriAdapter


class PlatformManager:
    @staticmethod
    def get_adapter(platform: str) -> BaseSocialAdapter:
        """Returns the appropriate adapter instance for a given platform name."""
        platform_lower = platform.lower()
        if platform_lower == "instagram":
            return MetaAdapter(platform="instagram")
        elif platform_lower == "linkedin":
            return LinkedInAdapter()
        elif platform_lower == "x":
            return XAdapter()
        elif platform_lower == "naukri":
            return NaukriAdapter()
        else:
            raise ValueError(f"Unsupported social media platform: '{platform}'")


# Singleton instance
platform_manager = PlatformManager()
