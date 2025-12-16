"""API routes for Wildberries Token management."""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.deps import get_current_active_superuser, get_db
from app.models import (
    Message,
    WBToken,
    WBTokenCreate,
    WBTokenPublic,
    WBTokensPublic,
    WBTokenUpdate,
)
from app.services.wb_token import WBTokenService

router = APIRouter()


@router.post("/", response_model=WBTokenPublic)
async def create_wb_token(
    *,
    session: Session = Depends(get_db),
    token_in: WBTokenCreate,
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Create a new WB token.

    Validate the token with Wildberries API and store it.
    """
    logging.info(f"Creating WB token with data: {token_in}")
    
    try:
        result = await WBTokenService.create_token(session, token_in)
        logging.info(f"WB token creation result: {result}")
        
        if not result["success"]:
            logging.error(f"WB token creation failed: {result['error']}")
            raise HTTPException(
                status_code=400,
                detail=result["error"],
            )
    except Exception as e:
        logging.error(f"Exception during WB token creation: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to create token: {str(e)}",
        )

    return result["token"]


@router.get("/", response_model=WBTokensPublic)
def read_wb_tokens(
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve WB tokens.
    """
    tokens = WBTokenService.get_tokens(session, skip, limit)
    return WBTokensPublic(data=tokens, count=len(tokens))


@router.get("/{token_id}", response_model=WBTokenPublic)
def read_wb_token(
    token_id: UUID,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Get WB token by ID.
    """
    token = WBTokenService.get_token_by_id(session, token_id)
    if not token:
        raise HTTPException(
            status_code=404,
            detail="WB token not found",
        )

    return token


@router.patch("/{token_id}", response_model=WBTokenPublic)
def update_wb_token(
    token_id: UUID,
    token_in: WBTokenUpdate,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Update a WB token.
    """

    token = WBTokenService.update_token(session, token_id, token_in)
    if not token:
        raise HTTPException(
            status_code=404,
            detail="WB token not found",
        )

    return token


@router.delete("/{token_id}")
def delete_wb_token(
    token_id: UUID,
    session: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_superuser),
) -> Any:
    """
    Delete a WB token.
    """

    success = WBTokenService.delete_token(session, token_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="WB token not found",
        )

    return Message(message="WB token deleted successfully")
