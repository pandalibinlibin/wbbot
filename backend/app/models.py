import uuid
from datetime import datetime

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel, Column, JSON


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# Wildberries Token models
class WBTokenBase(SQLModel):
    """Base model for Wildberries API tokens"""

    name: str = Field(
        max_length=100, description="Token name, e.g., Production Main Token"
    )
    environment: str = Field(
        default="production", description="Environment: production or sandbox"
    )
    is_active: bool = Field(default=True, description="Whether this token is active")


class WBTokenCreate(WBTokenBase):
    """Model for creating a new WB token"""

    token: str = Field(description="Wildberries API token value")


class WBTokenUpdate(SQLModel):
    """Model for updating a WB token"""

    name: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class WBToken(WBTokenBase, table=True):
    """Database model for WB tokens"""

    __tablename__ = "wb_token"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Encrypted token value (never expose in API responses)
    token_encrypted: str = Field(description="Encrypted token value")

    # Seller information (fetched from WB API)
    seller_id: str | None = Field(default=None, description="Seller ID (sid)")
    seller_name: str | None = Field(default=None, max_length=255)
    trade_mark: str | None = Field(default=None, max_length=255)

    # Token validation status
    is_valid: bool | None = Field(default=None)
    last_validated_at: datetime | None = Field(default=None)
    validation_error: str | None = Field(default=None)

    # Usage statistics
    total_requests: int = Field(default=0)
    failed_requests: int = Field(default=0)
    last_used_at: datetime | None = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WBTokenPublic(WBTokenBase):
    """Public model for WB tokens (excludes sensitive token value)"""

    id: uuid.UUID
    seller_id: str | None
    seller_name: str | None
    trade_mark: str | None

    is_valid: bool | None
    last_validated_at: datetime | None

    total_requests: int
    failed_requests: int
    last_used_at: datetime | None
    created_at: datetime
    updated_at: datetime


class WBTokensPublic(SQLModel):
    """Model for returning a list of WB tokens"""

    data: list[WBTokenPublic]
    count: int


# Product Cache Models - for storing WB product data locally
class WBProductCacheBase(SQLModel):
    """Base model for WB product cache with shared fields"""

    token_id: uuid.UUID = Field(foreign_key="wb_token.id", index=True)
    wb_product_id: str = Field(index=True)  # WB product ID for fast lookup
    product_data: dict = Field(
        default_factory=dict, sa_column=Column(JSON)
    )  # Complete product JSON
    last_updated: datetime = Field(default_factory=datetime.utcnow, index=True)
    cache_version: int = Field(default=1)  # For cache invalidation strategy
    is_active: bool = Field(default=True, index=True)


class WBProductCache(WBProductCacheBase, table=True):
    """Product cache table for storing WB product data locally"""

    __tablename__ = "wb_product_cache"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WBProductCacheCreate(WBProductCacheBase):
    """Model for creating product cache entries"""

    pass


class WBProductCacheUpdate(SQLModel):
    """Model for updating product cache entries"""

    product_data: dict | None = None
    last_updated: datetime | None = None
    cache_version: int | None = None
    is_active: bool | None = None


class WBProductCachePublic(WBProductCacheBase):
    """Public model for product cache (includes ID and timestamp)"""

    id: uuid.UUID
    created_at: datetime


# Cache Sync Log Models - for tracking synchronization status
class CacheSyncLogBase(SQLModel):
    """Base model for cache synchronization logs"""

    token_id: uuid.UUID = Field(foreign_key="wb_token.id", index=True)
    sync_type: str = Field(max_length=50)  # "full", "incremental"
    status: str = Field(max_length=20)  # "in_progress", "completed", "failed"
    products_synced: int = Field(default=0)
    error_message: str | None = Field(default=None, max_length=1000)


class CacheSyncLog(CacheSyncLogBase, table=True):
    """Cache synchronization log table"""

    __tablename__ = "cache_sync_log"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    started_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    completed_at: datetime | None = Field(default=None)


class CacheSyncLogCreate(CacheSyncLogBase):
    """Model for creating sync log entries"""

    pass


class CacheSyncLogUpdate(SQLModel):
    """Model for updating sync log entries"""

    status: str | None = None
    products_synced: int | None = None
    error_message: str | None = None
    completed_at: datetime | None = None


class CacheSyncLogPublic(CacheSyncLogBase):
    """Public model for sync logs"""

    id: uuid.UUID
    started_at: datetime
    completed_at: datetime | None
