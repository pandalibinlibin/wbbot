"""Wildberries Token service for business logic"""

from typing import Any
from uuid import UUID
from sqlmodel import Session, select
from datetime import datetime

from app.models import WBToken, WBTokenCreate, WBTokenUpdate
from app.clients.wb_client import WBAPIClient
from app.core.security import get_password_hash, verify_password


class WBTokenService:
    """Service for managing Wildberries tokens."""

    @staticmethod
    def encrypt_token(token: str) -> str:
        """
        Store token (currently as plain text for development)
        TODO: Implement proper encryption for production

        Args:
            token: Plain text token

        Returns:
            Token (currently plain text)
        """
        # For development: store as plain text
        # TODO: Implement encryption for production deployment
        return token

    @staticmethod
    async def create_token(session: Session, token_in: WBTokenCreate) -> dict[str, Any]:
        """
        Create a new WB token with validation.

        Args:
            session: Database session
            token_in: Token creation data

        Returns:
            dict with result:
            {
                "success": bool,
                "error": str | None,
                "token": WBToken | None
            }
        """
        # Validate token with WB API
        client = WBAPIClient(token_in.token)
        validation_result = await client.validate_token()

        if not validation_result["is_valid"]:
            return {
                "success": False,
                "error": validation_result["error"],
                "token": None,
            }

        seller_info = validation_result["seller_info"]

        encrypted_token = WBTokenService.encrypt_token(token_in.token)

        db_token = WBToken(
            name=token_in.name,
            environment=token_in.environment,
            is_active=token_in.is_active,
            token_encrypted=encrypted_token,
            seller_id=seller_info["sid"],
            seller_name=seller_info["name"],
            trade_mark=seller_info["tradeMark"],
            is_valid=True,
            last_validated_at=datetime.utcnow(),
            validation_error=None,
        )

        session.add(db_token)
        session.commit()
        session.refresh(db_token)

        return {
            "success": True,
            "error": None,
            "token": db_token,
        }

    @staticmethod
    def get_tokens(session: Session, skip: int = 0, limit: int = 100) -> list[WBToken]:
        """
        Get list of all WB tokens.

        Args:
            session: Database session
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of WBToken objects
        """
        statement = select(WBToken).offset(skip).limit(limit)
        tokens = session.exec(statement).all()
        return list(tokens)

    @staticmethod
    def get_token_by_id(session: Session, token_id: UUID) -> WBToken | None:
        """
        Get a specific WB token by ID.

        Args:
            session: Database session
            token_id: Token UUID

        Returns:
            WBToken object or None if not found
        """
        statement = select(WBToken).where(WBToken.id == token_id)
        token = session.exec(statement).first()
        return token

    @staticmethod
    def update_token(
        session: Session, token_id: UUID, token_update: WBTokenUpdate
    ) -> WBToken | None:
        """
        Update a WB token.

        Args:
            session: Database session
            token_id: Token UUID
            token_update: Update data

        Returns:
            Updated WBToken object or None if not found
        """
        db_token = WBTokenService.get_token_by_id(session, token_id)
        if not db_token:
            return None

        # Update fields
        update_data = token_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_token, key, value)

        db_token.updated_at = datetime.utcnow()

        session.add(db_token)
        session.commit()
        session.refresh(db_token)

        return db_token

    @staticmethod
    def delete_token(session: Session, token_id: UUID) -> bool:
        """
        Delete a WB token.

        Args:
            session: Database session
            token_id: Token UUID

        Returns:
            True if deleted, False if not found
        """
        db_token = WBTokenService.get_token_by_id(session, token_id)
        if not db_token:
            return False

        session.delete(db_token)
        session.commit()
        return True
