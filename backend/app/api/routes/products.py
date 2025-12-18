from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.api.deps import (
    get_current_active_superuser,
    get_db,
)
from app.services.product_service import ProductService

router = APIRouter()


@router.get("/", response_model=dict[str, Any])
async def get_products(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    token_id: str = Query(..., description="WB Token ID for the shop"),
    limit: int = Query(
        default=100, ge=1, le=1000, description="Number of products to fetch"
    ),
    offset: int = Query(default=0, ge=0, description="Number of products to skip"),
) -> Any:
    """
    Get products list for a specific shop (WB Token)
    """
    try:
        result = await ProductService.get_products_by_token_id(
            session=session, token_id=token_id, limit=limit, offset=offset
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result["data"],
            "message": "Products fetched successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/shop/{shop_id}", response_model=dict[str, Any])
async def get_products_by_shop(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    shop_id: UUID,
    limit: int = Query(
        default=100, ge=1, le=1000, description="Number of products to fetch"
    ),
    offset: int = Query(default=0, ge=0, description="Number of products to skip"),
) -> Any:
    """
    Get product list for a specific shop by shop ID
    """
    try:
        result = await ProductService.get_products_for_current_shop(
            session=session, current_shop_id=str(shop_id), limit=limit, offset=offset
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result["data"],
            "message": f"Products fetched successfully for shop {shop_id}",
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
