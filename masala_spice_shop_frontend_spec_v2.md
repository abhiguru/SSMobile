# Masala Spice Shop - Frontend Specification v2.0 (MVP)

> **Purpose:** Simplified MVP specification for a React Native mobile ordering app.
> 
> **Version:** 2.0 - MVP: Simple ordering with admin-controlled availability
>
> **Related Document:** `masala_spice_shop_backend_spec_v2.md`
>
> ⚠️ **MVP SCOPE:** No inventory tracking. Admin toggles item availability. Users order from available items.

---

## Project Overview

| Attribute | Value |
|-----------|-------|
| App Name | Masala Spice Shop |
| Platform | React Native (Android + iOS) |
| Languages | English, Gujarati |
| Currency | Indian Rupees (Rs.) |
| Auth | OTP via SMS |
| Products | ~50-100 fixed spice items |

---

## MVP Concept

**Simple Flow:**
1. Admin marks products as "available" or "unavailable"
2. Customer sees only available products
3. Customer adds items to cart and checks out
4. Order placed → Admin confirms → Delivery → Complete

**No Inventory Tracking:**
- No stock counts
- No reservations
- No "X items left" display
- Admin manually controls what's available to order

---

## Feature Summary

### Customer App

| Feature | Description |
|---------|-------------|
| OTP Login | Phone-based registration/login |
| Browse Products | View products by category |
| Search | Search in English or Gujarati |
| Product Details | Images, description, weight options, price |
| Cart | Add items, adjust quantity, order notes |
| Checkout | Select address, place order (COD only) |
| Order Tracking | View order status timeline |
| Delivery OTP | Show OTP to delivery person |
| Order History | View past orders |
| Reorder | Quick reorder from previous orders |
| Favorites | Save favorite products |
| Profile | Name, phone, address, language |

### Admin App

| Feature | Description |
|---------|-------------|
| Dashboard | Today's orders, pending count |
| Product Management | Toggle availability on/off |
| Category Management | Add/edit categories |
| Order Management | View orders, update status |
| Assign Delivery | Assign delivery staff to orders |
| Delivery Staff | Add/remove delivery staff accounts |
| Settings | Shop info, delivery areas, shipping fee |

### Delivery Staff App

| Feature | Description |
|---------|-------------|
| My Deliveries | List of assigned deliveries |
| Delivery Detail | Customer info, address, items |
| Verify OTP | Enter customer OTP to complete |
| Mark Failed | Mark delivery as failed with reason |
| History | Past deliveries |

---

## User Roles

| Role | Access |
|------|--------|
| Customer | Browse, cart, order, profile |
| Admin | All admin features |
| Super Admin | Admin + manage admin accounts |
| Delivery Staff | Assigned deliveries only |

---

## Screens

### Customer Screens

#### 1. Login
```
┌─────────────────────────────┐
│                             │
│      [App Logo]             │
│                             │
│   Enter Mobile Number       │
│   ┌───────────────────────┐ │
│   │ +91 │ 98765 43210     │ │
│   └───────────────────────┘ │
│                             │
│   [  Send OTP  ]            │
│                             │
└─────────────────────────────┘
```

#### 2. Home
```
┌─────────────────────────────┐
│ ≡  Masala Spice Shop   🛒 3 │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔍 Search spices...     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Categories                  │
│ [Regular] [Special] [Mixes] │
├─────────────────────────────┤
│ ┌───────────┐ ┌───────────┐│
│ │ [Image]   │ │ [Image]   ││
│ │ Turmeric  │ │ Cumin     ││
│ │ ₹45/100g  │ │ ₹65/100g  ││
│ └───────────┘ └───────────┘│
├─────────────────────────────┤
│ 🏠    📋    ❤️    👤        │
│ Home Orders Favs Profile    │
└─────────────────────────────┘
```

#### 3. Product Detail
```
┌─────────────────────────────┐
│ ←                      ❤️   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │      [Product Image]    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Turmeric Powder             │
│ હળદર પાવડર                  │
├─────────────────────────────┤
│ Select Weight:              │
│ [50g ₹25] [100g ₹45] [250g] │
├─────────────────────────────┤
│ Quantity:  [-]  1  [+]      │
├─────────────────────────────┤
│ Fresh ground turmeric from  │
│ Salem, Tamil Nadu...        │
├─────────────────────────────┤
│ [  Add to Cart - ₹45  ]     │
└─────────────────────────────┘
```

#### 4. Cart
```
┌─────────────────────────────┐
│ ← Cart                      │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ [img] Turmeric 100g     │ │
│ │       ₹45 × 2 = ₹90     │ │
│ │       [-] 2 [+]    🗑️   │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Order Notes (optional)      │
│ ┌─────────────────────────┐ │
│ │ Pack separately please  │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Subtotal            ₹210    │
│ Delivery            ₹40     │
│ Total               ₹250    │
├─────────────────────────────┤
│ [  Checkout  ]              │
└─────────────────────────────┘
```

#### 5. Checkout
```
┌─────────────────────────────┐
│ ← Checkout                  │
├─────────────────────────────┤
│ Delivery Address        ✏️  │
│ 123 Gandhi Road             │
│ Ahmedabad - 380009          │
├─────────────────────────────┤
│ Payment: Cash on Delivery   │
├─────────────────────────────┤
│ Total                  ₹250 │
├─────────────────────────────┤
│ [  Place Order  ]           │
└─────────────────────────────┘
```

#### 6. Order Detail
```
┌─────────────────────────────┐
│ ← Order #MSS-001            │
├─────────────────────────────┤
│ Status: Out for Delivery    │
│ ┌─────────────────────────┐ │
│ │ ✓ Placed      10:30 AM  │ │
│ │ ✓ Confirmed   10:45 AM  │ │
│ │ ✓ Out for Del 11:30 AM  │ │
│ │ ○ Delivered             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ 🔐 Delivery OTP: 4523       │
├─────────────────────────────┤
│ Items                       │
│ • Turmeric 100g × 2    ₹90  │
│ • Cumin 100g × 1       ₹65  │
├─────────────────────────────┤
│ Total                 ₹195  │
├─────────────────────────────┤
│ [  Reorder  ]               │
└─────────────────────────────┘
```

### Admin Screens

#### 1. Dashboard
```
┌─────────────────────────────┐
│ ≡  Admin                🔔  │
├─────────────────────────────┤
│ Today                       │
│ ┌───────┐ ┌───────┐        │
│ │ Orders│ │Pending│        │
│ │  12   │ │   3   │        │
│ └───────┘ └───────┘        │
├─────────────────────────────┤
│ Recent Orders               │
│ #003 ₹180 Placed    [View]  │
│ #002 ₹320 Confirmed [View]  │
│ #001 ₹450 Delivered [View]  │
├─────────────────────────────┤
│ 📦    📋    👥    ⚙️        │
│ Prod Orders Staff  Settings │
└─────────────────────────────┘
```

#### 2. Products (Toggle Availability)
```
┌─────────────────────────────┐
│ ← Products                  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Turmeric Powder    [ON] │ │
│ │ ₹45/100g                │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Cumin Seeds       [ON]  │ │
│ │ ₹65/100g                │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Garam Masala     [OFF]  │ │
│ │ ₹80/100g  (Hidden)      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### 3. Order Management
```
┌─────────────────────────────┐
│ ← Order #MSS-003            │
├─────────────────────────────┤
│ Status: Placed              │
│                             │
│ [Confirm] [Cancel]          │
├─────────────────────────────┤
│ Customer: Raj Patel         │
│ Phone: 98765 43210      📞  │
├─────────────────────────────┤
│ Items                       │
│ • Turmeric 100g × 2    ₹90  │
│ • Cumin 100g × 1       ₹65  │
│ Total                 ₹195  │
├─────────────────────────────┤
│ Assign Delivery:            │
│ [Select Staff ▼]            │
├─────────────────────────────┤
│ [  Mark Out for Delivery  ] │
└─────────────────────────────┘
```

### Delivery Staff Screens

#### 1. Deliveries List
```
┌─────────────────────────────┐
│ ≡  My Deliveries            │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ #MSS-003                │ │
│ │ Raj Patel               │ │
│ │ Navrangpura         📍  │ │
│ │ ₹195 COD                │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### 2. Complete Delivery
```
┌─────────────────────────────┐
│ ← Delivery #MSS-003         │
├─────────────────────────────┤
│ Raj Patel                   │
│ [📞 Call] [📍 Maps]         │
├─────────────────────────────┤
│ 123 Gandhi Road             │
│ Navrangpura, Ahmedabad      │
├─────────────────────────────┤
│ Collect: ₹195 (COD)         │
├─────────────────────────────┤
│ Enter Customer OTP:         │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐            │
│ │ │ │ │ │ │ │ │            │
│ └─┘ └─┘ └─┘ └─┘            │
│                             │
│ [  Complete Delivery  ]     │
│ [  Mark Failed  ]           │
└─────────────────────────────┘
```

---

## Order Status Flow

```
placed → confirmed → out_for_delivery → delivered
           ↓              ↓
       cancelled    delivery_failed
```

| Status | Changed By | Next Actions |
|--------|------------|--------------|
| placed | System | Admin: confirm or cancel |
| confirmed | Admin | Admin: assign delivery, mark out for delivery |
| out_for_delivery | Admin | Delivery: complete or fail |
| delivered | Delivery Staff | Terminal |
| cancelled | Admin | Terminal |
| delivery_failed | Delivery Staff | Admin: reassign or cancel |

---

## React Native Structure

```
src/
├── components/
│   ├── common/          # Button, Input, Card, Modal
│   ├── ProductCard.tsx
│   ├── CartItem.tsx
│   ├── OrderCard.tsx
│   └── StatusTimeline.tsx
│
├── screens/
│   ├── auth/            # Login, OTP
│   ├── customer/        # Home, Product, Cart, Checkout, Orders
│   ├── admin/           # Dashboard, Products, Orders, Settings
│   └── delivery/        # Deliveries, DeliveryDetail
│
├── navigation/
│   ├── AppNavigator.tsx
│   ├── CustomerTabs.tsx
│   ├── AdminTabs.tsx
│   └── DeliveryTabs.tsx
│
├── store/
│   ├── slices/
│   │   ├── authSlice.ts
│   │   ├── cartSlice.ts
│   │   ├── productsSlice.ts
│   │   └── ordersSlice.ts
│   └── index.ts
│
├── services/
│   ├── api.ts           # Supabase client
│   └── notifications.ts # FCM setup
│
├── i18n/
│   ├── en.json
│   └── gu.json
│
└── types/
    └── index.ts
```

### Key Dependencies

```json
{
  "dependencies": {
    "react-native": "^0.73.0",
    "@supabase/supabase-js": "^2.39.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "i18next": "^23.7.0",
    "react-i18next": "^14.0.0",
    "@react-native-firebase/messaging": "^18.7.0",
    "@react-native-async-storage/async-storage": "^1.21.0"
  }
}
```

---

## i18n (Key Translations)

**English:**
```json
{
  "home": { "title": "Masala Spice Shop", "search": "Search spices..." },
  "product": { "addToCart": "Add to Cart", "selectWeight": "Select Weight" },
  "cart": { "title": "Cart", "checkout": "Checkout", "empty": "Cart is empty" },
  "orders": { "placed": "Placed", "confirmed": "Confirmed", "outForDelivery": "Out for Delivery", "delivered": "Delivered" },
  "delivery": { "enterOtp": "Enter Customer OTP", "complete": "Complete Delivery" }
}
```

**Gujarati:**
```json
{
  "home": { "title": "મસાલા સ્પાઇસ શોપ", "search": "મસાલા શોધો..." },
  "product": { "addToCart": "કાર્ટમાં ઉમેરો", "selectWeight": "વજન પસંદ કરો" },
  "cart": { "title": "કાર્ટ", "checkout": "ચેકઆઉટ", "empty": "કાર્ટ ખાલી છે" },
  "orders": { "placed": "મૂકાયો", "confirmed": "પુષ્ટિ", "outForDelivery": "ડિલિવરી માટે", "delivered": "ડિલિવર" },
  "delivery": { "enterOtp": "ગ્રાહક OTP દાખલ કરો", "complete": "ડિલિવરી પૂર્ણ" }
}
```

---

## API Endpoints (Frontend Needs)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/functions/v1/send-otp` | POST | Send OTP |
| `/functions/v1/verify-otp` | POST | Verify, get token |
| `/rest/v1/products?is_available=eq.true` | GET | Available products |
| `/rest/v1/categories` | GET | All categories |
| `/functions/v1/checkout` | POST | Place order |
| `/rest/v1/orders` | GET | My orders |
| `/functions/v1/reorder` | POST | Copy to cart |
| `/rest/v1/favorites` | GET/POST/DELETE | Manage favorites |
| `/functions/v1/verify-delivery-otp` | POST | Complete delivery |
| `/functions/v1/update-order-status` | POST | Admin status change |

---

## Error Display

| Code | User Message |
|------|--------------|
| AUTH_001 | Invalid phone number |
| AUTH_002 | OTP expired. Please resend. |
| AUTH_003 | Wrong OTP. Try again. |
| CHECKOUT_001 | Please add a delivery address |
| CHECKOUT_002 | We don't deliver to this area |
| DELIVERY_001 | Wrong OTP |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jan 2026 | MVP simplification: Removed inventory tracking. Simple availability toggle. Basic order flow. |
