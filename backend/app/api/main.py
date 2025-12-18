from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils, wb_tokens, products
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(wb_tokens.router, prefix="/wb-tokens", tags=["wb-tokens"])
api_router.include_router(products.router, prefix="/products", tags=["products"])


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
