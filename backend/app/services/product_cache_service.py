import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import asyncio

from sqlmodel import Session, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

from app.models import (
    WBProductCache,
    WBProductCacheCreate,
    WBProductCacheUpdate,
    CacheSyncLog,
    CacheSyncLogCreate,
    CacheSyncLogUpdate,
)
from app.services.product_service import ProductService
from app.core.db import engine


class ProductCacheService:
    """Service for managing product data cache with intelligent caching strategy"""

    # Cache expiration time (24 hours)
    CACHE_EXPIRY_HOURS = 24

    @staticmethod
    async def get_cached_products(
        session: Session,
        token_id: str,
        limit: int = 100,
        offset: int = 0,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Get products with intelligent caching strategy:
        1. Check if cache exists and is valid
        2. Return cached data if valid
        3. Fetch from WB API and update cache if invalid or force_refresh=True
        """
        try:
            # Check cache validity
            if not force_refresh and await ProductCacheService._is_cache_valid(
                session, token_id
            ):
                # Return cached data
                return await ProductCacheService._get_cached_data(
                    session, token_id, limit, offset
                )
            else:
                # Cache is invalid or force refresh, sync from WB API
                sync_result = await ProductCacheService._sync_products_from_api(
                    session, token_id, limit
                )
                if sync_result["success"]:
                    # Return newly cached data
                    return await ProductCacheService._get_cached_data(
                        session, token_id, limit, offset
                    )
                else:
                    # Sync failed, try to return stale cache if available
                    cached_data = await ProductCacheService._get_cached_data(
                        session, token_id, limit, offset
                    )
                    if cached_data["success"]:
                        # Return stale cache with warning
                        cached_data["warning"] = (
                            "Using stale cache data due to sync failure"
                        )
                        return cached_data
                    else:
                        # No cache available, return sync error
                        return sync_result

        except Exception as e:
            return {
                "success": False,
                "error": f"Cache service error: {str(e)}",
                "data": {"products": [], "total": 0},
            }

    @staticmethod
    async def _is_cache_valid(session: Session, token_id: str) -> bool:
        """Check if cache exists and is not expired"""
        try:
            # Get the most recent cache entry for this token
            statement = (
                select(WBProductCache.last_updated)
                .where(WBProductCache.token_id == uuid.UUID(token_id))
                .where(WBProductCache.is_active == True)
                .order_by(WBProductCache.last_updated.desc())
                .limit(1)
            )

            result = session.exec(statement).first()

            if not result:
                # No cache found
                return False

            # Check if cache is expired
            expiry_time = datetime.utcnow() - timedelta(
                hours=ProductCacheService.CACHE_EXPIRY_HOURS
            )
            return result > expiry_time

        except Exception as e:
            # If there's any error, consider cache invalid
            return False

    @staticmethod
    async def _get_cached_data(
        session: Session, token_id: str, limit: int = 100, offset: int = 0
    ) -> Dict[str, Any]:
        """Get products from cache with pagination"""
        try:
            # Get total count
            count_statement = (
                select(WBProductCache)
                .where(WBProductCache.token_id == uuid.UUID(token_id))
                .where(WBProductCache.is_active == True)
            )
            total_count = len(session.exec(count_statement).all())

            # Get paginated products ordered by product update date (newest first)
            # Use JSON field ordering to sort by product's updatedAt field
            statement = (
                select(WBProductCache)
                .where(WBProductCache.token_id == uuid.UUID(token_id))
                .where(WBProductCache.is_active == True)
                .order_by(
                    text("product_data->>'updatedAt' DESC")
                )  # Order by product's updatedAt field
                .offset(offset)
                .limit(limit)
            )

            cached_products = session.exec(statement).all()

            if not cached_products:
                return {
                    "success": False,
                    "error": "No cached products found",
                    "data": {"products": [], "total": 0},
                }

            # Extract product data from cache
            products = [cache_entry.product_data for cache_entry in cached_products]

            return {
                "success": True,
                "data": {
                    "products": products,
                    "total": total_count,
                    "cached": True,
                    "last_updated": (
                        cached_products[0].last_updated.isoformat()
                        if cached_products
                        else None
                    ),
                },
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get cached data: {str(e)}",
                "data": {"products": [], "total": 0},
            }

    @staticmethod
    async def _sync_products_from_api(
        session: Session, token_id: str, limit: int = 100
    ) -> Dict[str, Any]:
        """Sync products from WB API and update cache"""
        sync_log_id = None

        try:
            # Create sync log entry
            sync_log = CacheSyncLogCreate(
                token_id=uuid.UUID(token_id), sync_type="full", status="in_progress"
            )
            sync_log_entry = CacheSyncLog.model_validate(sync_log)
            session.add(sync_log_entry)
            session.commit()
            session.refresh(sync_log_entry)
            sync_log_id = sync_log_entry.id

            # WB API LIMITATION: offset parameter doesn't work, max limit=100
            # We can only fetch the first 100 products for any shop
            print(
                f"⚠️  WB API Limitation: Can only fetch max 100 products due to broken pagination"
            )

            # Make single API call with maximum possible limit (100)
            api_result = None
            retry_count = 0
            max_retries = 3

            while retry_count <= max_retries:
                try:
                    # Force limit=100 and offset=0 since pagination doesn't work
                    api_result = await ProductService.get_products_by_token_id(
                        session=session,
                        token_id=token_id,
                        limit=100,  # WB API max limit
                        offset=0,  # offset doesn't work anyway
                    )

                    if api_result["success"]:
                        break  # Success, exit retry loop
                    else:
                        # API returned error, check if we should retry
                        error_msg = api_result.get("error", "")
                        if (
                            retry_count < max_retries
                            and ProductCacheService._should_retry_error(error_msg)
                        ):
                            retry_count += 1
                            retry_delay = (
                                2**retry_count
                            )  # Exponential backoff: 2s, 4s, 8s
                            print(
                                f"API retry {retry_count}/{max_retries}, waiting {retry_delay}s... Error: {error_msg}"
                            )
                            await asyncio.sleep(retry_delay)
                            continue
                        else:
                            break  # Don't retry or max retries reached

                except Exception as e:
                    # Network or other exception
                    if retry_count < max_retries:
                        retry_count += 1
                        retry_delay = 2**retry_count
                        print(
                            f"Network error retry {retry_count}/{max_retries}: {str(e)}"
                        )
                        await asyncio.sleep(retry_delay)
                        continue
                    else:
                        # Create error result for final failure
                        api_result = {
                            "success": False,
                            "error": f"Network error after {max_retries} retries: {str(e)}",
                        }
                        break

            # Check final result after all retries
            if not api_result["success"]:
                # Update sync log with failure
                await ProductCacheService._update_sync_log(
                    session,
                    sync_log_id,
                    "failed",
                    0,
                    f"Failed to fetch products: {api_result.get('error', 'Unknown error')}",
                )
                return api_result

            # Get all products from the single API call
            products = api_result["data"].get("products", [])

            if not products:
                # Update sync log - no products found
                await ProductCacheService._update_sync_log(
                    session, sync_log_id, "completed", 0, None
                )

                return {
                    "success": True,
                    "data": {"products": [], "total": 0},
                    "message": "No products found for this token",
                }

            # Clear existing cache for this token (soft delete)
            await ProductCacheService._clear_token_cache(session, token_id)

            # Cache new products
            cached_count = 0
            current_time = datetime.utcnow()

            for product in products:
                try:
                    # Extract WB product vendorCode (required for valid products)
                    wb_product_id = product.get("vendorCode")

                    if not wb_product_id:
                        continue  # Skip invalid products without vendorCode

                    # Create cache entry
                    cache_entry = WBProductCacheCreate(
                        token_id=uuid.UUID(token_id),
                        wb_product_id=wb_product_id,
                        product_data=product,
                        last_updated=current_time,
                        cache_version=1,
                        is_active=True,
                    )

                    cache_record = WBProductCache.model_validate(cache_entry)
                    session.add(cache_record)
                    cached_count += 1

                except Exception as product_error:
                    # Log individual product errors but continue
                    print(
                        f"Error caching product {wb_product_id}: {str(product_error)}"
                    )
                    continue

            # Commit all cache entries
            session.commit()

            # Update sync log with success
            await ProductCacheService._update_sync_log(
                session, sync_log_id, "completed", cached_count, None
            )

            return {
                "success": True,
                "data": {
                    "products": products,
                    "total": len(products),
                    "cached_count": cached_count,
                },
                "message": f"Successfully synced {cached_count} products",
                "warning": (
                    "⚠️ WB API限制：由于WB API分页功能故障，最多只能获取100个产品"
                    if len(products) == 100
                    else None
                ),
            }

        except Exception as e:
            # Update sync log with failure if we have sync_log_id
            if sync_log_id:
                try:
                    await ProductCacheService._update_sync_log(
                        session, sync_log_id, "failed", 0, str(e)
                    )
                except:
                    pass  # Don't fail if we can't update log

            return {
                "success": False,
                "error": f"Sync failed: {str(e)}",
                "data": {"products": [], "total": 0},
            }

    @staticmethod
    async def _update_sync_log(
        session: Session,
        sync_log_id: uuid.UUID,
        status: str,
        products_synced: int,
        error_message: str | None,
    ) -> None:
        """Update sync log with completion status"""
        try:
            # Get the sync log entry
            statement = select(CacheSyncLog).where(CacheSyncLog.id == sync_log_id)
            sync_log = session.exec(statement).first()

            if sync_log:
                # Update the sync log
                sync_log.status = status
                sync_log.products_synced = products_synced
                sync_log.error_message = error_message
                sync_log.completed_at = datetime.utcnow()

                session.add(sync_log)
                session.commit()

        except Exception as e:
            # Don't fail the main operation if logging fails
            print(f"Failed to update sync log: {str(e)}")

    @staticmethod
    async def _clear_token_cache(session: Session, token_id: str) -> None:
        """Soft delete existing cache entries for a token"""
        try:
            # Mark all existing cache entries as inactive (soft delete)
            statement = (
                select(WBProductCache)
                .where(WBProductCache.token_id == uuid.UUID(token_id))
                .where(WBProductCache.is_active == True)
            )

            existing_cache_entries = session.exec(statement).all()

            for cache_entry in existing_cache_entries:
                cache_entry.is_active = False
                session.add(cache_entry)

            session.commit()

        except Exception as e:
            # Don't fail the main operation if cache clearing fails
            print(f"Failed to clear token cache: {str(e)}")

    @staticmethod
    async def clear_expired_cache(session: Session) -> Dict[str, Any]:
        """Clear expired cache entries (utility method for maintenance)"""
        try:
            expiry_time = datetime.utcnow() - timedelta(
                hours=ProductCacheService.CACHE_EXPIRY_HOURS * 2
            )  # Double expiry for cleanup

            # Find expired cache entries
            statement = (
                select(WBProductCache)
                .where(WBProductCache.last_updated < expiry_time)
                .where(WBProductCache.is_active == True)
            )

            expired_entries = session.exec(statement).all()
            cleared_count = 0

            for entry in expired_entries:
                entry.is_active = False
                session.add(entry)
                cleared_count += 1

            session.commit()

            return {
                "success": True,
                "cleared_count": cleared_count,
                "message": f"Cleared {cleared_count} expired cache entries",
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to clear expired cache: {str(e)}",
                "cleared_count": 0,
            }

    @staticmethod
    async def get_cache_stats(
        session: Session, token_id: str | None = None
    ) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        try:
            base_query = select(WBProductCache).where(WBProductCache.is_active == True)

            if token_id:
                base_query = base_query.where(
                    WBProductCache.token_id == uuid.UUID(token_id)
                )

            # Get all active cache entries
            cache_entries = session.exec(base_query).all()

            if not cache_entries:
                return {
                    "success": True,
                    "stats": {
                        "total_cached_products": 0,
                        "tokens_with_cache": 0,
                        "oldest_cache": None,
                        "newest_cache": None,
                    },
                }

            # Calculate statistics
            total_products = len(cache_entries)
            unique_tokens = len(set(entry.token_id for entry in cache_entries))
            oldest_cache = min(entry.last_updated for entry in cache_entries)
            newest_cache = max(entry.last_updated for entry in cache_entries)

            return {
                "success": True,
                "stats": {
                    "total_cached_products": total_products,
                    "tokens_with_cache": unique_tokens,
                    "oldest_cache": oldest_cache.isoformat(),
                    "newest_cache": newest_cache.isoformat(),
                },
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get cache stats: {str(e)}",
                "stats": {},
            }

    @staticmethod
    def _should_retry_error(error_msg: str) -> bool:
        """Determine if an error should trigger a retry"""
        if not error_msg:
            return False

        retry_keywords = [
            "timeout",
            "network",
            "connection",
            "502",
            "503",
            "504",
            "rate limit",
            "too many requests",
            "temporary",
            "unavailable",
            "bad gateway",
            "service unavailable",
            "gateway timeout",
        ]

        error_lower = error_msg.lower()
        return any(keyword in error_lower for keyword in retry_keywords)
