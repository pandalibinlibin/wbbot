# Wildberries ERP System Technical Specification

## Project Overview
Wildberries e-commerce ERP management system based on FastAPI + React + PostgreSQL

## Technology Stack
- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic
- **Frontend**: React, TypeScript, TanStack Router, Tailwind CSS
- **Containerization**: Docker, Docker Compose
- **API Documentation**: OpenAPI/Swagger

## Completed Modules

### 1. Wildberries Token Management Module ✅

#### Backend Implementation (2025-12-14)
- **Data Models** (`backend/app/models.py`)
  - `WBTokenBase`: Base token model
  - `WBTokenCreate`: Token creation request model
  - `WBTokenUpdate`: Token update request model
  - `WBToken`: Database model (encrypted token, seller info, statistics)
  - `WBTokenPublic`: Public response model (no sensitive data)
  - `WBTokensPublic`: Token list response model

- **Database Migration** (`backend/app/alembic/versions/`)
  - Created `wb_token` table with complete field definitions

- **WB API Client** (`backend/app/clients/wb_client.py`)
  - `WBAPIClient`: Wildberries API wrapper
  - `ping()`: Check API connection and token validity
  - `get_seller_info()`: Retrieve seller info (name, sid, tradeMark)
  - `validate_token()`: Combined token validation and seller info retrieval

- **Business Service Layer** (`backend/app/services/wb_token.py`)
  - `WBTokenService`: Token management business logic
  - `encrypt_token()`: Secure token storage encryption
  - `create_token()`: Create token with WB API validation
  - `get_tokens()`: Get token list with pagination
  - `get_token_by_id()`: Get single token
  - `update_token()`: Update token information
  - `delete_token()`: Delete token

- **REST API Routes** (`backend/app/api/routes/wb_tokens.py`)
  - `POST /api/v1/wb-tokens/`: Create token
  - `GET /api/v1/wb-tokens/`: Get token list
  - `GET /api/v1/wb-tokens/{id}`: Get single token
  - `PATCH /api/v1/wb-tokens/{id}`: Update token
  - `DELETE /api/v1/wb-tokens/{id}`: Delete token
  - All endpoints require admin privileges

#### Frontend Implementation (In Progress)
- **Route Page** (`frontend/src/routes/_layout/wb-tokens.tsx`)
  - Basic page structure created
  - TODO: Token list, add, edit, delete functionality

#### Testing & Validation ✅
- All API endpoints tested successfully
- Real WB token validation working
- Seller information auto-retrieval functional
- Complete CRUD operations verified

## System Architecture

### Backend Architecture
```
API Layer (FastAPI Routes)
    ↓
Service Layer (Business Logic)
    ↓
Client Layer (External API Calls)
    ↓
Data Layer (SQLModel + PostgreSQL)
```

### Security Design
- Encrypted token storage (one-way hash)
- JWT authentication + admin permission control
- WB API token validation
- Sensitive information excluded from API responses

### Development Environment
- Docker Compose hot reload support
- Volume mounting for code synchronization
- FastAPI `--reload` auto-reload

## Next Steps
1. Complete WB Token management frontend interface
2. Implement multi-language support (react-i18next)
3. Integrate more Wildberries API features
4. Add system monitoring and logging

## Development Standards
- Incremental development with small changes
- Thorough code review and testing
- Complete technical documentation maintenance