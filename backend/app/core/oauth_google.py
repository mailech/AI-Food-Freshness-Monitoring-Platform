import httpx

from app.core.config import get_settings

settings = get_settings()

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

SCOPE = "openid email profile"


class GoogleOAuthError(Exception):
    pass


def is_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def build_authorize_url(state: str) -> str:
    from urllib.parse import urlencode

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URL,
        "response_type": "code",
        "scope": SCOPE,
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    if not is_configured():
        raise GoogleOAuthError("Google OAuth is not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        token_res = await client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URL,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise GoogleOAuthError(f"Token exchange failed: {token_res.text}")
        access_token = token_res.json().get("access_token")
        userinfo_res = await client.get(
            USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if userinfo_res.status_code != 200:
            raise GoogleOAuthError("Failed to fetch user info")
        return userinfo_res.json()
