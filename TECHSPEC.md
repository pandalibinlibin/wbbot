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

#### Frontend Implementation ✅ (2025-12-15/16)
- **Route Page** (`frontend/src/routes/_layout/wb-tokens.tsx`)
  - Complete page structure with state management
  - Token list display with API integration
  - Add/Edit/Delete dialog management
  - Success handling and list refresh

- **Token List Component** (`frontend/src/components/WBTokens/TokenList.tsx`)
  - Responsive card-based layout
  - Token information display (seller name, trade mark, statistics)
  - Edit and delete action buttons
  - Simplified UI (removed environment and active status display)

- **Add Token Dialog** (`frontend/src/components/WBTokens/AddTokenDialog.tsx`)
  - Form validation (name required, token format validation)
  - API integration with error handling
  - Success feedback and form reset
  - Internationalization support

- **Edit Token Dialog** (`frontend/src/components/WBTokens/EditTokenDialog.tsx`)
  - Simplified editing (token name only)
  - Pre-filled form data
  - Form validation and API integration
  - User-friendly interface

- **Internationalization** (`frontend/src/lib/i18n.ts`)
  - Complete Chinese/English support
  - All UI text using i18n keys
  - Consistent translation management

- **API Client Integration** (`frontend/src/client/`)
  - Auto-generated TypeScript client
  - Type-safe API calls
  - Error handling and response typing

#### Testing & Validation ✅
- All API endpoints tested successfully
- Real WB token validation working
- Seller information auto-retrieval functional
- Complete CRUD operations verified
- Frontend UI tested with real data
- Multi-language switching verified

### 2. Multi-Shop Management System ✅ (2025-12-16/18)

#### Shop Selector Component (`frontend/src/components/Common/ShopSelector.tsx`)
- **Dropdown shop selector** in top navigation bar
- **Auto-fetch active tokens** from WB Token API
- **Display format**: `Seller Name - Trade Mark`
- **Auto-selection** of first available shop with URL synchronization
- **Multi-language support** (loading states, empty states)
- **Global state management** for selected shop
- **Fixed state synchronization** between UI display and URL parameters

#### Layout Integration (`frontend/src/routes/_layout.tsx`)
- **Top navigation bar enhancement** with shop selector
- **Flexbox layout** with left sidebar trigger and right shop selector
- **Global shop state** management with useState
- **Responsive design** maintaining clean UI

#### Features
- ✅ Real-time shop switching
- ✅ Persistent shop selection during session
- ✅ Integration with existing token management
- ✅ Clean, professional UI design
- ✅ Internationalization support
- ✅ Fixed shop selector state synchronization issues

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

## Planned Features & Roadmap

### Phase 1: Product Management System ✅ (2025-12-17/18)

#### 1.1 Product Card Management ✅ (Completed)
- **Product List Page**: Paginated display, filtering, search, sorting
- **Product Detail View**: Complete product information display with image carousel
- **Shop State Management**: Fixed shop selector synchronization issues
- **Image Display System**: Advanced image carousel with batch download functionality

**Implemented API Endpoints:**
- `/content/v2/get/cards/list` - Product list ✅
- Shop selector state synchronization ✅
- Product details modal with image management ✅

#### 1.2 Price & Discount Management (Priority: High)
- **Batch Price Setting**: Bulk price updates
- **Discount Strategy Management**: Discount rules and automation
- **Price History Tracking**: Historical price data
- **Competitor Price Comparison**: Market analysis

**API Endpoints to Implement:**
- `/public/api/v1/info` - Set prices and discounts
- `/public/api/v1/prices/sizes` - Size-specific pricing

### Phase 2: Advanced Automation Features

#### 2.1 Competitor Analysis System
- **Competitor URL Input**: Batch competitor link processing
- **Product Info Extraction**: Automated data collection
- **AI Content Processing**: Differentiated content generation
- **Auto Product Creation**: API-driven product card generation

#### 2.2 Dynamic Pricing Engine
- **Real-time Price Monitoring**: Competitor price tracking
- **Pricing Strategy Engine**: Automated pricing algorithms
- **Price Optimization**: Profit margin optimization
- **Market Response Analysis**: Sales impact tracking

### Phase 3: Business Intelligence
- **Sales Analytics Dashboard**: Performance metrics
- **Market Trend Analysis**: Competitive intelligence
- **Profit Optimization Reports**: Business insights
- **Automated Recommendations**: AI-driven suggestions

## Technical Implementation Notes

### Backend API Client Enhancement Required
- **WB Product API Client**: Extend `wb_client.py` for product management
- **Product Service Layer**: Create `product_service.py` for business logic
- **Product Models**: Add product-related SQLModel classes
- **Product Routes**: Implement `/api/v1/products/` endpoints

### Frontend Architecture
- **Product Management Routes**: `/products/*` route structure
- **Product Components**: Reusable product card, list, form components
- **State Management**: Global product state with React Context/Zustand
- **API Integration**: Type-safe product API client generation

### Database Schema Extensions
- **Product Tables**: Local product data storage and caching
- **Competitor Tables**: Competitor tracking and price history
- **Pricing Tables**: Dynamic pricing rules and history

## Development Standards
- Incremental development with small changes
- Thorough code review and testing
- Complete technical documentation maintenance
- API-first development approach
- Type-safe implementation (TypeScript + SQLModel)

### 3. Product Management System ✅ (2025-12-17/18)

#### Product List Page (`frontend/src/routes/_layout/products.tsx`)
- **Paginated product display** with responsive card layout
- **Shop-based filtering** integrated with shop selector
- **Real-time product loading** from Wildberries API
- **Error handling** for API failures and empty states
- **Loading states** with proper user feedback

#### Product Details Modal (`frontend/src/components/Products/ProductDetailsModal.tsx`)
- **Comprehensive product information display**
- **Advanced image carousel system** with navigation arrows
- **Image display optimization** using `object-contain` for complete image visibility
- **Batch image download functionality** with progress indicators
- **Responsive modal design** with left/right column layout
- **Product characteristics display** with organized sections
- **Dimensions and specifications** in structured format

#### Image Management Features
- **Image carousel navigation** with left/right arrows and image counter
- **Multiple image size fallbacks** (big → c516x688 → c246x328)
- **Batch download system** for all product images
- **Download progress indicators** with loading states
- **Error handling** for failed image loads
- **Optimized image display** without cropping

#### API Integration
- **Products Service** (`frontend/src/client/`) with type-safe API calls
- **Real Wildberries API integration** for product data
- **Pagination support** with offset/limit parameters
- **Shop-specific product filtering** via tokenId

#### State Management Fixes
- **Shop selector synchronization** between UI state and URL parameters
- **Automatic shop selection** with URL parameter updates
- **Consistent state management** across components

## Current Status Summary (2025-12-18)
✅ **Completed**: WB Token Management (Full CRUD + Multi-shop selector)
✅ **Completed**: Product Management System (List + Details + Image Management)
✅ **Completed**: Advanced Image Carousel with Batch Download
🔄 **Discussed**: ZIP compression download (technical feasibility analyzed)
📋 **Next**: Price & Discount Management System

---
*Last Updated: 2025-12-18 01:35 UTC-08:00*