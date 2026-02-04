# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

- **Do not create markdown files** (or any `.md` files) unless explicitly instructed to do so.
- **Do not operate outside the `mobile/` directory.** The backend is maintained by a separate team. If a backend change is needed, mention it in the chat conversation — do not read, edit, or create files in the backend directory.
- **Backend specs should be high-level.** When noting requirements for the backend team, describe what's needed (inputs, outputs, behavior) without implementation details like SQL or code.

## Project Overview

Masala Spice Shop - React Native Expo mobile app for a spice ordering MVP. Supports three user types: Customer, Admin, and Delivery Staff. No inventory tracking; admin controls product availability via simple on/off toggles.

## Tech Stack

- **Framework**: Expo SDK 54 + React Native 0.81
- **State**: Redux Toolkit + React Redux
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (self-hosted) at port 8100
- **i18n**: i18next (English + Gujarati)
- **Push**: Expo Notifications
- **Storage**: AsyncStorage + Expo SecureStore (for tokens)

## Development Commands

```bash
# Install dependencies
npm install

# Start Expo development server
npm start
# or
npx expo start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Type check
npx tsc --noEmit
```

## Architecture

### Project Structure (Expo Router)

```
app/                      # Expo Router file-based routes
├── _layout.tsx           # Root layout with providers
├── index.tsx             # Entry redirect based on auth
├── (auth)/               # Auth route group
│   ├── _layout.tsx
│   ├── login.tsx
│   └── otp.tsx
├── (customer)/           # Customer route group
│   ├── _layout.tsx       # Bottom tabs
│   ├── index.tsx         # Home
│   ├── product/[id].tsx
│   ├── cart.tsx
│   ├── checkout.tsx
│   ├── orders/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── favorites.tsx
│   └── profile.tsx
├── (admin)/              # Admin route group
│   ├── _layout.tsx       # Admin tabs
│   ├── index.tsx         # Dashboard
│   ├── products.tsx
│   ├── orders/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── staff.tsx
│   └── settings.tsx
└── (delivery)/           # Delivery route group
    ├── _layout.tsx       # Delivery tabs
    ├── index.tsx         # Deliveries list
    ├── [id].tsx          # Delivery detail
    └── history.tsx

src/
├── components/           # Reusable UI components
│   └── common/           # Button, Input, Card, Modal
├── store/
│   ├── index.ts          # Store configuration
│   └── slices/           # Redux slices
│       ├── authSlice.ts
│       ├── cartSlice.ts
│       ├── productsSlice.ts
│       └── ordersSlice.ts
├── services/
│   ├── supabase.ts       # Supabase client
│   └── notifications.ts  # Push notifications
├── i18n/
│   ├── index.ts          # i18next config
│   ├── en.json
│   └── gu.json
├── types/
│   └── index.ts
└── constants/
    └── index.ts
```

### User Roles & Navigation

Each role has a dedicated tab layout in route groups:
- **Customer**: Home, Cart, Orders, Favorites, Profile
- **Admin**: Dashboard, Products, Orders, Staff, Settings
- **Delivery**: Deliveries, History

Role determined by JWT claim from backend after OTP verification. App redirects to appropriate route group based on role.

### State Management

Redux slices:
- `authSlice` - User session, JWT, role
- `cartSlice` - Cart items, totals, order notes
- `productsSlice` - Categories, products, favorites
- `ordersSlice` - Order list, status tracking

Typed hooks available: `useAppDispatch()` and `useAppSelector()`

### Backend Integration

API base URL: `http://{host}:8100`

**Public endpoints** (no auth):
- `POST /functions/v1/send-otp`
- `POST /functions/v1/verify-otp`

**Authenticated endpoints** (Bearer token):
- `GET /rest/v1/products?is_available=eq.true&select=*,weight_options(*)`
- `GET /rest/v1/categories`
- `POST /functions/v1/checkout`
- `POST /functions/v1/reorder`
- `POST /functions/v1/update-order-status` (admin)
- `POST /functions/v1/verify-delivery-otp` (delivery)

All REST endpoints require `apikey` header with anon key.

### Order Status Flow

```
placed → confirmed → out_for_delivery → delivered
            ↓              ↓
        cancelled    delivery_failed
```

## Key Implementation Details

- **Currency**: Prices in paise (₹1 = 100 paise), display as "₹X.XX"
- **Phone format**: `+91XXXXXXXXXX` (validate 10 digits starting with 6-9)
- **Product names**: Bilingual (English `name` + Gujarati `name_gu`)
- **Delivery OTP**: 4-digit code shown to customer when order is out_for_delivery
- **Test mode**: Use phone `+919876543210` with OTP `123456` for testing
- **Secure storage**: JWT tokens stored in Expo SecureStore
- **Language**: Persisted in AsyncStorage, defaults to English

## Error Codes

Handle these error responses from backend:
- `AUTH_001` - Invalid phone number
- `AUTH_002` - OTP expired
- `AUTH_003` - Wrong OTP
- `CHECKOUT_001` - Missing delivery address
- `CHECKOUT_002` - Pincode not serviceable
- `DELIVERY_001` - Wrong delivery OTP

## Configuration

Before running, update these values in `src/constants/index.ts`:
- `API_BASE_URL` - Your Supabase URL (default: localhost:8100)
- `SUPABASE_ANON_KEY` - Your Supabase anon key

And in `src/services/notifications.ts`:
- `projectId` - Your Expo project ID for push notifications
