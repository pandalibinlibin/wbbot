from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.api.deps import (
    get_current_active_superuser,
    get_db,
)
from app.services.product_service import ProductService

from app.services.product_cache_service import ProductCacheService
from app.services.subject_characteristics_cache_service import (
    SubjectCharacteristicsCacheService,
)

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


# Cache-related endpoints
@router.get("/cached/{token_id}", response_model=dict[str, Any])
async def get_cached_products(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    token_id: UUID,
    limit: int = Query(
        default=100, ge=1, le=1000, description="Number of products to return"
    ),
    offset: int = Query(default=0, ge=0, description="Number of products to skip"),
    force_refresh: bool = Query(default=False, description="Force refresh from WB API"),
) -> Any:
    """
    Get products from cache with intelligent caching strategy.
    Returns cached data if valid, otherwise syncs from WB API automatically.
    """
    try:
        result = await ProductCacheService.get_cached_products(
            session=session,
            token_id=str(token_id),
            limit=limit,
            offset=offset,
            force_refresh=force_refresh,
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result["data"],
            "message": "Products retrieved successfully from cache",
            "warning": result.get(
                "warning"
            ),  # Include any warnings (e.g., stale cache)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cache service error: {str(e)}")


@router.post("/sync/{token_id}", response_model=dict[str, Any])
async def manual_sync_products(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    token_id: UUID,
) -> Any:
    """
    Manually sync products for a specific token from WB API.
    This will force refresh the cache with retry mechanism.
    """
    try:
        result = await ProductCacheService.get_cached_products(
            session=session,
            token_id=str(token_id),
            force_refresh=True,  # Force sync from API
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        cached_count = result["data"].get(
            "cached_count", len(result["data"].get("products", []))
        )

        return {
            "success": True,
            "data": result["data"],
            "message": f"Successfully synced {cached_count} products from WB API",
            "warning": result.get("warning"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/cache/stats", response_model=dict[str, Any])
async def get_cache_statistics(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    token_id: UUID | None = Query(
        default=None, description="Optional: Get stats for specific token"
    ),
) -> Any:
    """
    Get cache statistics for monitoring and debugging
    """
    try:
        result = await ProductCacheService.get_cache_stats(
            session=session, token_id=str(token_id) if token_id else None
        )

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": result["stats"],
            "message": "Cache statistics retrieved successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get cache stats: {str(e)}"
        )


@router.delete("/cache/expired", response_model=dict[str, Any])
async def clear_expired_cache(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Clear expired cache entries (maintenance endpoint).
    """

    try:
        result = await ProductCacheService.clear_expired_cache(session=session)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return {
            "success": True,
            "data": {"cleared_count": result["cleared_count"]},
            "message": result["message"],
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to clear expired cache: {str(e)}"
        )


@router.get("/subject/{subject_id}/characteristics", response_model=dict[str, Any])
async def get_subject_characteristics(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    subject_id: int,
    token_id: str = Query(..., description="WB Token ID for API authentication"),
    force_refresh: bool = Query(False, description="Force refresh from WB API"),
) -> Any:
    """
    Get all characteristics for a specific subject from WB Content API with intelligent caching.

    This endpoint returns complete characteristics list for a subject including:
    - All possible characteristics (not just filled ones)
    - Popular field indicators
    - Required field markers
    - Cached data when available (7-day TTL)

    Args:
        subject_id: WB subject ID to get characteristics for
        token_id: WB Token ID for API authentication (from currently selected shop)
        force_refresh: Force refresh from WB API even if cache is valid
    """
    try:
        result = await SubjectCharacteristicsCacheService.get_subject_characteristics(
            session=session,
            token_id=token_id,
            subject_id=subject_id,
            force_refresh=force_refresh,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to get subject characteristics: {result['error']}",
            )

        return {
            "success": True,
            "data": result["data"],
            "message": "Subject characteristics retrieved successfully",
            "from_cache": result.get("from_cache", False),
            "cached_at": result.get("cached_at"),
            "fetched_at": result.get("fetched_at"),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get subject characteristics: {str(e)}"
        )


@router.delete(
    "/subject/{subject_id}/characteristics/cache", response_model=dict[str, Any]
)
async def invalidate_subject_characteristics_cache(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    subject_id: int,
) -> Any:
    """
    Manually invalidate cache for a specific subject's characteristics.

    This is useful when you know the subject characteristics have been updated
    and you want to force a refresh from WB API.
    """
    try:
        result = await SubjectCharacteristicsCacheService.invalidate_cache(
            session=session, subject_id=subject_id
        )

        return {
            "success": result["success"],
            "message": result.get("message", result.get("error")),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to invalidate cache: {str(e)}"
        )


@router.get("/characteristics/cache/stats", response_model=dict[str, Any])
async def get_characteristics_cache_stats(
    *,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Get statistics about the subject characteristics cache.

    Returns information about:
    - Total cached subjects
    - Expired entries
    - Valid entries
    - Cache configuration
    """
    try:
        result = await SubjectCharacteristicsCacheService.get_cache_stats(
            session=session
        )

        if not result["success"]:
            raise HTTPException(
                status_code=500, detail=f"Failed to get cache stats: {result['error']}"
            )

        return {
            "success": True,
            "data": result["data"],
            "message": "Cache statistics retrieved successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get cache statistics: {str(e)}"
        )
