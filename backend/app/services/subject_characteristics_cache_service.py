import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from sqlalchemy.exc import SQLAlchemyError
from app.models import (
    WBSubjectCharacteristicsCache,
    WBSubjectCharacteristicsCacheCreate,
    WBSubjectCharacteristicsCacheUpdate,
    WBToken,
)
from app.clients.wb_client import WBAPIClient
from app.core.security import decrypt_token


class SubjectCharacteristicsCacheService:
    """Service for managing subject characteristics data cache with intelligent caching strategy"""

    # Cache expiration time ( 7 days - subject characteristics change infrequently)
    CACHE_EXPIRY_DAYS = 7

    @staticmethod
    async def get_subject_characteristics(
        session: Session,
        token_id: str,  # Used for WB API calls when cache is empty, not for cache differentiation
        subject_id: int,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        """
        Get subject characteristics with intelligent caching strategy:
        1. Check if global cache exists and is valid for this subject_id
        2. Return cached data if valid
        3. Fetch from WB Content API using token_id and update global cache if invalid or force_refresh=True

        Args:
            session: Database session
            token_id: WB token for API calls (from currently selected shop)
            subject_id: Subject ID to get characteristics for
            force_refresh: Force refresh from WB API even if cache is valid
        """
        try:
            # Check cache validity (global cache, no token_id involved)
            if (
                not force_refresh
                and await SubjectCharacteristicsCacheService._is_cache_valid(
                    session, subject_id
                )
            ):
                # Return cached data
                return await SubjectCharacteristicsCacheService._get_cached_data(
                    session, subject_id
                )

            # Cache is invalid or force refresh - fetch from WB API using provided token
            return await SubjectCharacteristicsCacheService._fetch_and_cache(
                session, token_id, subject_id
            )
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get subject characteristics:{str(e)}",
                "data": None,
            }

    @staticmethod
    async def _is_cache_valid(session: Session, subject_id: int) -> bool:
        """Check if global cache exists and is not expired for this subject"""
        try:
            # Get cache entry for this subject (global cache)
            statement = (
                select(WBSubjectCharacteristicsCache.last_updated)
                .where(WBSubjectCharacteristicsCache.subject_id == subject_id)
                .where(WBSubjectCharacteristicsCache.is_active == True)
            )
            result = session.exec(statement).first()
            if not result:
                # No cache found
                return False

            # Check if cache is expired
            expiry_time = datetime.utcnow() - timedelta(
                days=SubjectCharacteristicsCacheService.CACHE_EXPIRY_DAYS
            )
            return result > expiry_time
        except Exception:
            # If there's any error, consider cache invalid
            return False

    @staticmethod
    async def _get_cached_data(session: Session, subject_id: int) -> Dict[str, Any]:
        """Get characteristics from global cache"""
        try:
            statement = (
                select(WBSubjectCharacteristicsCache)
                .where(WBSubjectCharacteristicsCache.subject_id == subject_id)
                .where(WBSubjectCharacteristicsCache.is_active == True)
            )
            cache_entry = session.exec(statement).first()
            if cache_entry:
                return {
                    "success": True,
                    "data": cache_entry.characteristics_data,
                    "error": None,
                    "from_cache": True,
                    "cached_at": cache_entry.last_updated.isoformat(),
                }
            else:
                return {
                    "success": False,
                    "error": "No cached data found",
                    "data": None,
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get cached data: {str(e)}",
                "data": None,
            }

    @staticmethod
    async def _fetch_and_cache(
        session: Session, token_id: str, subject_id: int
    ) -> Dict[str, Any]:
        """Fetch characteristics from WB API using provided token and update global cache"""
        try:
            # Get WB token from database
            statement = select(WBToken).where(WBToken.id == token_id)
            wb_token = session.exec(statement).first()
            if not wb_token:
                return {
                    "success": False,
                    "error": f"WB Token not found: {token_id}",
                    "data": None,
                }

            # Decrypt the token and create API client
            decrypted_token = decrypt_token(wb_token.token_encrypted)
            wb_client = WBAPIClient(decrypted_token)

            # Fetch characteristics from WB Content API
            api_result = await wb_client.get_subject_characteristics(subject_id)
            if not api_result["success"]:
                return api_result

            # Update or create global cache entry
            await SubjectCharacteristicsCacheService._update_cache(
                session, subject_id, api_result["data"]
            )

            return {
                "success": True,
                "data": api_result["data"],
                "error": None,
                "from_cache": False,
                "fetched_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to fetch and cache data: {str(e)}",
                "data": None,
            }

    @staticmethod
    async def _update_cache(
        session: Session, subject_id: int, characteristics_data: dict
    ) -> None:
        """Update or create global cache entry for subject characteristics"""
        try:
            # Check if cache entry exists
            statement = select(WBSubjectCharacteristicsCache).where(
                WBSubjectCharacteristicsCache.subject_id == subject_id
            )
            existing_cache = session.exec(statement).first()
            if existing_cache:
                # Update existing cache entry
                existing_cache.characteristics_data = characteristics_data
                existing_cache.last_updated = datetime.utcnow()
                existing_cache.cache_version += 1
                existing_cache.is_active = True
            else:
                # Create new cache entry
                cache_create = WBSubjectCharacteristicsCacheCreate(
                    subject_id=subject_id,
                    characteristics_data=characteristics_data,
                )
                new_cache = WBSubjectCharacteristicsCache.model_validate(
                    cache_create.model_dump()
                )

                session.add(new_cache)
            # Let FastAPI handle the commit - don't commit manually
            session.flush()  # Ensure changes are sent to DB but don't commit

        except SQLAlchemyError as e:
            session.rollback()
            raise Exception(f"Database error: {str(e)}")

    @staticmethod
    async def invalidate_cache(session: Session, subject_id: int) -> Dict[str, Any]:
        """Manually invalidate global cache for a specific subject"""
        try:
            statement = select(WBSubjectCharacteristicsCache).where(
                WBSubjectCharacteristicsCache.subject_id == subject_id
            )
            cache_entry = session.exec(statement).first()
            if cache_entry:
                cache_entry.is_active = False
                session.flush()  # Let FastAPI handle the commit
                return {
                    "success": True,
                    "message": f"Global cache invalidated for subject {subject_id}",
                }
            else:
                return {
                    "success": False,
                    "message": f"No cache found for subject {subject_id}",
                }

        except Exception as e:
            session.rollback()
            return {
                "success": False,
                "error": f"Failed to invalidate cache: {str(e)}",
            }

    @staticmethod
    async def get_cache_stats(session: Session) -> Dict[str, Any]:
        """Get statistics about the subject characteristics cache"""
        try:
            # Count cached subjects
            total_statement = select(WBSubjectCharacteristicsCache).where(
                WBSubjectCharacteristicsCache.is_active == True
            )
            total_cached = len(session.exec(total_statement).all())

            # Count expired entries
            expiry_time = datetime.utcnow() - timedelta(
                days=SubjectCharacteristicsCacheService.CACHE_EXPIRY_DAYS
            )
            expired_statement = select(WBSubjectCharacteristicsCache).where(
                WBSubjectCharacteristicsCache.is_active == True,
                WBSubjectCharacteristicsCache.last_updated < expiry_time,
            )
            expired_count = len(session.exec(expired_statement).all())
            return {
                "success": True,
                "data": {
                    "total_cached_subjects": total_cached,
                    "expired_entries": expired_count,
                    "valid_entries": total_cached - expired_count,
                    "cache_expiry_days": SubjectCharacteristicsCacheService.CACHE_EXPIRY_DAYS,
                },
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to get cache stats: {str(e)}"}
