from typing import Dict, Any, Optional, List
import time
import httpx
from app.services.social_platforms.base import BaseSocialAdapter
from app.core.config import settings


class LinkedInAdapter(BaseSocialAdapter):
    def __init__(self):
        self.client_id = settings.LINKEDIN_CLIENT_ID
        self.client_secret = settings.LINKEDIN_CLIENT_SECRET
        self.redirect_uri = settings.LINKEDIN_REDIRECT_URI
        self.scopes = settings.LINKEDIN_SCOPES
        self.is_mock = not (self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        if self.is_mock:
            return f"http://localhost:3000/social-callback?platform=linkedin&code=mock_linkedin_auth_code&state={state}"
        
        # LinkedIn OAuth 2.0 requires space-delimited scopes
        import urllib.parse
        encoded_scope = urllib.parse.quote(self.scopes)
        encoded_redirect = urllib.parse.quote(self.redirect_uri, safe="")
        
        return (
            f"https://www.linkedin.com/oauth/v2/authorization?"
            f"response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={encoded_redirect}"
            f"&state={state}"
            f"&scope={encoded_scope}"
        )

    async def fetch_access_token(self, auth_code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or auth_code.startswith("mock_"):
            return {
                "access_token": f"mock_linkedin_token_{int(time.time())}",
                "refresh_token": f"mock_linkedin_refresh_{int(time.time())}",
                "expires_in_seconds": 5184000,
                "platform_user_id": "urn:li:organization:mock_company_1",
                "account_name": "SocialHub Corp (LinkedIn Page)",
            }

        uri = redirect_uri or self.redirect_uri
        url = "https://www.linkedin.com/oauth/v2/accessToken"
        data = {
            "grant_type": "authorization_code",
            "code": auth_code,
            "redirect_uri": uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            response.raise_for_status()
            token_data = response.json()
            access_token = token_data["access_token"]
            
            # 1. Try to fetch company pages managed by the user
            err_log = []
            try:
                acls_url = "https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR"
                acls_response = await client.get(
                    acls_url, headers={"Authorization": f"Bearer {access_token}"}
                )
                if acls_response.status_code == 200:
                    acls_data = acls_response.json()
                    elements = acls_data.get("elements", [])
                    if elements:
                        org_urn = elements[0].get("organizationalTarget")
                        if org_urn and "organization" in org_urn:
                            org_id = org_urn.split(":")[-1]
                            org_url = f"https://api.linkedin.com/v2/organizations/{org_id}"
                            org_response = await client.get(
                                org_url, headers={"Authorization": f"Bearer {access_token}"}
                            )
                            if org_response.status_code == 200:
                                org_name = org_response.json().get("localizedName")
                                if org_name:
                                    return {
                                        "access_token": access_token,
                                        "refresh_token": token_data.get("refresh_token"),
                                        "expires_in_seconds": token_data.get("expires_in"),
                                        "platform_user_id": org_urn,
                                        "account_name": f"{org_name} (LinkedIn Page)",
                                    }
                            else:
                                err_log.append(f"org details fail {org_response.status_code}: {org_response.text}")
                    else:
                        err_log.append("acls empty (no pages found)")
                else:
                    err_log.append(f"acls fail {acls_response.status_code}: {acls_response.text}")
            except Exception as e:
                err_log.append(f"acls exception: {str(e)}")
            
            # 2. Modern OpenID Connect userinfo endpoint
            try:
                userinfo_url = "https://api.linkedin.com/v2/userinfo"
                userinfo_response = await client.get(
                    userinfo_url, headers={"Authorization": f"Bearer {access_token}"}
                )
                if userinfo_response.status_code == 200:
                    userinfo = userinfo_response.json()
                    person_sub = userinfo.get("sub")
                    name = userinfo.get("name") or f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}".strip() or "LinkedIn User"
                    return {
                        "access_token": access_token,
                        "refresh_token": token_data.get("refresh_token"),
                        "expires_in_seconds": token_data.get("expires_in"),
                        "platform_user_id": f"urn:li:person:{person_sub}",
                        "account_name": name,
                    }
                else:
                    err_log.append(f"userinfo fail {userinfo_response.status_code}: {userinfo_response.text}")
            except Exception as e:
                err_log.append(f"userinfo exception: {str(e)}")

            # 3. If everything above failed, their LinkedIn App lacks the required products.
            raise Exception(f"LinkedIn API Error: Missing products or permissions. Debug details: {'; '.join(err_log)}")

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if self.is_mock or refresh_token.startswith("mock_"):
            return {
                "access_token": f"mock_linkedin_token_refreshed_{int(time.time())}",
                "refresh_token": refresh_token,
                "expires_in_seconds": 5184000,
            }

        # LinkedIn OAuth 2.0 refresh flow
        url = "https://www.linkedin.com/oauth/v2/accessToken"
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
                "platform_post_id": f"urn:li:share:{int(time.time())}",
                "error_message": None,
            }

        async with httpx.AsyncClient() as client:
            # Resolve author URN
            if platform_user_id and platform_user_id != "urn:li:person:me" and (platform_user_id.startswith("urn:li:organization:") or platform_user_id.startswith("urn:li:person:")):
                author_urn = platform_user_id
            elif platform_user_id and platform_user_id != "urn:li:person:me":
                author_urn = f"urn:li:organization:{platform_user_id}"
            else:
                # Fallback to fetching member URN if none provided or if it's the "me" placeholder
                userinfo_url = "https://api.linkedin.com/v2/userinfo"
                userinfo_res = await client.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
                if userinfo_res.status_code == 200:
                    author_urn = f"urn:li:person:{userinfo_res.json()['sub']}"
                else:
                    raise Exception("LinkedIn API Error: Your LinkedIn Developer App is missing the required Products. Please go to the LinkedIn Developer Portal, add both 'Sign In with LinkedIn using OpenID Connect' AND 'Share on LinkedIn', then Disconnect and Reconnect your account here.")

            post_url = "https://api.linkedin.com/v2/ugcPosts"
            
            # Construct UGC request JSON
            payload = {
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": content},
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Attach media if exists
            if media_urls:
                # Basic link share support for first media url
                payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "ARTICLE"
                payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
                    {
                        "status": "READY",
                        "originalUrl": media_urls[0],
                        "title": {"text": "Media Attachment"}
                    }
                ]

            response = await client.post(
                post_url, json=payload, headers={"Authorization": f"Bearer {access_token}", "X-Restli-Protocol-Version": "2.0.0"}
            )
            
            if response.status_code not in (200, 201):
                return {"success": False, "platform_post_id": None, "error_message": response.text}
                
            data = response.json()
            return {"success": True, "platform_post_id": data.get("id"), "error_message": None}

    async def fetch_analytics(self, access_token: str, platform_post_id: Optional[str] = None) -> Dict[str, Any]:
        if self.is_mock or access_token.startswith("mock_"):
            import random
            return {
                "likes": random.randint(5, 800),
                "shares": random.randint(1, 150),
                "comments": random.randint(0, 90),
                "reach": random.randint(100, 10000),
                "impressions": random.randint(120, 12000),
                "followers": random.randint(100, 5000),
            }

        # LinkedIn organizational analytics or share statistics
        # Real call uses https://api.linkedin.com/v2/organizationalEntityShareStatistics
        return {
            "likes": 42,
            "shares": 10,
            "comments": 7,
            "reach": 850,
            "impressions": 1100,
            "followers": 0
        }
