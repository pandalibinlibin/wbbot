from typing import Any, Dict, List, Optional
import logging

from app.clients.wb_client import WBAPIClient
from app.models import WBToken
from app.core.security import decrypt_token
from app.api.deps import get_db
from sqlmodel import select, Session

logger = logging.getLogger(__name__)


class ProductService:
    """Service for managing Wildberries products"""

    @staticmethod
    async def get_products_by_token_id(
        session: Session, token_id: str, limit: int = 100, offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get product list for a specific WB token

        Args:
            token_id: WB Token ID
            limit: Number of products to return
            offset: Number of products to skip

        Returns:
            dict: Product list response
        """
        try:
            # Get token from database
            statement = select(WBToken).where(WBToken.id == token_id)
            token = session.exec(statement).first()

            if not token:
                return {"success": False, "error": "Token not found", "data": None}

            if not token.is_active:
                return {
                    "success": False,
                    "error": "Token is inactive",
                    "data": None,
                }

            # Decrypt token value
            decrypted_token = decrypt_token(token.token_encrypted)

            # Create WB API client and get products
            wb_client = WBAPIClient(decrypted_token)
            result = await wb_client.get_product_list(limit=limit, offset=offset)

            if result["success"]:
                logger.info(
                    f"Successfully fetched {len(result['data'].get('cards', []))} products for token {token_id}"
                )

                # Add token info to response
                return {
                    "success": True,
                    "error": None,
                    "data": {
                        "products": result["data"].get("cards", []),
                        "cursor": result["data"].get("cursor", {}),
                        "token_info": {
                            "id": str(token.id),
                            "name": token.name,
                            "seller_name": token.seller_name,
                            "trade_mark": token.trade_mark,
                        },
                    },
                }

            else:
                logger.error(
                    f"Failed to fetch products for token {token_id}: {result['error']}"
                )
                return result

        except Exception as e:
            logger.error(f"Error in get_products_by_token_id: {str(e)}")
            return {
                "success": False,
                "error": f"Internal server error: {str(e)}",
                "data": None,
            }

    @staticmethod
    async def get_products_for_current_shop(
        session: Session, current_shop_id: str, limit: int = 100, offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get products for the currently selected shop

        Args:
            current_shop_id: Currently selected shop token ID
            limit: Number of products to fetch
            offset: Number of products to skip

        Returns:
            dict: Product list response
        """
        return await ProductService.get_products_by_token_id(
            session=session, token_id=current_shop_id, limit=limit, offset=offset
        )
