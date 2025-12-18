"""Wildberries API client for token validation and seller info retrieval"""

import httpx
from typing import Any


class WBAPIClient:
    """Client for interacting with Wildberries API"""

    # Base URL for WB Common API (Seller Information, News, etc.)
    BASE_URL = "https://common-api.wildberries.ru"

    def __init__(self, token: str, timeout: float = 60.0):
        """
        Initialize WB API client.

        Args:
            token: Wildberries API token
            timeout: Request timeout in seconds
        """
        self.token = token
        self.timeout = timeout
        self.headers = {"Authorization": token}

    async def ping(self) -> dict[str, Any]:
        """
        Check WB API connection and token validity.

        Returns:
            dict with ping result:
            {
                "is_valid": bool,
                "error": str | None,
                "timestamp": str | None
            }
        """

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.BASE_URL}/ping",
                    headers=self.headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "is_valid": True,
                        "error": None,
                        "timestamp": data.get("TS"),
                    }
                elif response.status_code == 401:
                    return {
                        "is_valid": False,
                        "error": "Invalid token or unauthorized",
                        "timestamp": None,
                    }
                else:
                    return {
                        "is_valid": False,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "timestamp": None,
                    }

        except httpx.TimeoutException:
            return {
                "is_valid": False,
                "error": "Request timeout",
                "timestamp": None,
            }
        except Exception as e:
            return {
                "is_valid": False,
                "error": str(e),
                "timestamp": None,
            }

    async def get_seller_info(self) -> dict[str, Any]:
        """
        Get seller information (name, sid, tradeMark).

        Returns:
            dict with seller info:
            {
                "success": bool,
                "error": str | None,
                "data": {
                    "name": str,
                    "sid": str,
                    "tradeMark": str,
                } | None
            }
        """

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.BASE_URL}/api/v1/seller-info",
                    headers=self.headers,
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "error": None,
                        "data": {
                            "name": data.get("name"),
                            "sid": data.get("sid"),
                            "tradeMark": data.get("tradeMark"),
                        },
                    }
                elif response.status_code == 401:
                    return {
                        "success": False,
                        "error": "Invalid token or unauthorized",
                        "data": None,
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "data": None,
                    }

        except httpx.TimeoutException:
            return {
                "success": False,
                "error": "Request timeout",
                "data": None,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "data": None,
            }

    async def validate_token(self) -> dict[str, Any]:
        """
        Validate token by calling both ping and get_seller_info.

        Returns:
            dict with validation result:
            {
                "is_valid": bool,
                "error": str | None,
                "seller_info": {
                    "name": str,
                    "sid": str,
                    "tradeMark": str,
                } | None
            }
        """
        # First check if token is valid with ping
        ping_result = await self.ping()
        if not ping_result["is_valid"]:
            return {
                "is_valid": False,
                "error": ping_result["error"],
                "seller_info": None,
            }

        # Then get seller info
        seller_result = await self.get_seller_info()
        if not seller_result["success"]:
            return {
                "is_valid": False,
                "error": seller_result["error"],
                "seller_info": None,
            }

        return {
            "is_valid": True,
            "error": None,
            "seller_info": seller_result["data"],
        }

    async def get_product_list(
        self, limit: int = 100, offset: int = 0
    ) -> dict[str, Any]:
        """
        Get product cards list from Wildberries API

        Args:
            limit: Number of products to fetch(max 1000)
            offset: Number of products to skip

        Returns:
            dict: API response with product list
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    "https://content-api.wildberries.ru/content/v2/get/cards/list",
                    headers=self.headers,
                    json={
                        "settings": {
                            "cursor": {"limit": limit, "offset": offset},
                            "filter": {
                                "withPhoto": -1  # -1: all, 0: without photo, 1: with photo
                            },
                        }
                    },
                )

                if response.status_code == 200:
                    return {"success": True, "data": response.json(), "error": None}
                else:
                    return {
                        "success": False,
                        "data": None,
                        "error": f"HTTP {response.status_code}: {response.text}",
                    }

        except httpx.TimeoutException:
            return {"success": False, "data": None, "error": "Request timeout"}

        except Exception as e:
            return {"success": False, "data": None, "error": str(e)}
