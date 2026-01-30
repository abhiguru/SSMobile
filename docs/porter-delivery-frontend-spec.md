# Porter Delivery - Mobile Frontend Integration Spec

## Overview

This spec covers the complete mobile app integration for Porter third-party delivery alongside existing in-house delivery. Admin can choose delivery method per order when dispatching. Customers see driver tracking for Porter deliveries instead of the OTP flow.

---

## 1. Backend API Reference

### Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/functions/v1/porter-quote` | POST | Admin | Get fare estimate for an order |
| `/functions/v1/porter-book` | POST | Admin | Book Porter delivery |
| `/functions/v1/porter-cancel` | POST | Admin | Cancel Porter delivery |
| `/functions/v1/porter-webhook` | POST | Webhook | Porter status updates (not called by app) |
| `/functions/v1/porter-mock-event` | POST | Admin | Simulate Porter events (mock mode only) |
| `/functions/v1/update-order-status` | POST | Admin | Dispatch in-house (existing, updated) |

### Data Model

**Order** (updated fields):
```
delivery_type: 'in_house' | 'porter'  (default: 'in_house')
delivery_staff_id: UUID | null
```

**PorterDelivery** (via join `porter_deliveries`):
```
id, order_id, porter_order_id, crn, tracking_url,
driver_name, driver_phone, vehicle_number,
quoted_fare_paise, final_fare_paise,
porter_status: 'live' | 'allocated' | 'reached_for_pickup' | 'picked_up' | 'reached_for_drop' | 'ended' | 'cancelled',
estimated_pickup_time, actual_pickup_time,
estimated_delivery_time, actual_delivery_time
```

### Request/Response Formats

**porter-quote**
```typescript
// Request
{ order_id: string }

// Response
{
  success: true,
  order_id: string,
  order_number: string,
  quote: {
    fare_paise: number,        // e.g. 8451
    fare_display: string,      // "₹84.51"
    estimated_minutes: number, // e.g. 34
    estimated_time_display: string, // "34 min"
    distance_km: number,       // e.g. 1.6
    vehicle_type: string       // "bike"
  },
  addresses: {
    pickup: { lat: number, lng: number },
    drop: { lat: number, lng: number, address: string, formatted_address?: string }
  }
}
```

**porter-book**
```typescript
// Request
{ order_id: string }

// Response
{
  success: true,
  order_id: string,
  order_number: string,
  porter: {
    porter_order_id: string,
    crn: string,
    tracking_url: string,
    estimated_pickup_time?: string,   // ISO 8601
    estimated_delivery_time?: string  // ISO 8601
  },
  message: string
}
// Side effects: order.status → 'out_for_delivery', order.delivery_type → 'porter'
// SMS sent to customer with tracking link
```

**porter-cancel**
```typescript
// Request
{
  order_id: string,
  reason?: string,
  fallback_to_inhouse?: boolean  // default false
}

// Response (fallback_to_inhouse: false)
{
  success: true,
  new_status: 'delivery_failed',
  fallback_to_inhouse: false
}
// Side effects: order.status → 'delivery_failed', porter_status → 'cancelled'

// Response (fallback_to_inhouse: true)
{
  success: true,
  new_status: 'confirmed',
  fallback_to_inhouse: true
}
// Side effects: order.status → 'confirmed', delivery_type → 'in_house', porter_status → 'cancelled'
// Order returns to dispatch queue for in-house assignment
```

**update-order-status** (in-house dispatch)
```typescript
// Request
{
  order_id: string,
  status: 'out_for_delivery',
  delivery_staff_id: string,    // Required for in-house
  delivery_type: 'in_house'
}

// Validation:
// - If delivery_type === 'porter' → error "Use porter-book endpoint"
// - If order already has active Porter delivery → error "PORTER_IN_PROGRESS"
```

### PostgREST Query (Order with Porter data)

```
GET /rest/v1/orders?id=eq.{id}&select=*,items:order_items(*),porter_delivery:porter_deliveries(*)
```
Returns `porter_delivery` as an array (flatten to single object on client).

---

## 2. RTK Query Endpoints (Already Defined)

File: `src/store/apiSlice.ts`

```typescript
// Mutations
useGetPorterQuoteMutation()       // → PorterQuoteResponse
useBookPorterDeliveryMutation()   // → PorterBookResponse
useCancelPorterDeliveryMutation() // → PorterCancelResponse
useDispatchOrderMutation()        // → void (in-house dispatch)

// Updated query
useGetOrderByIdQuery(orderId)     // Now includes porter_delivery join
```

All Porter mutations invalidate tags `['Order', 'Orders']` to refresh order lists.

---

## 3. Type Definitions (Already Defined)

File: `src/types/index.ts`

```typescript
export type DeliveryType = 'in_house' | 'porter';

export type PorterStatus =
  | 'pending' | 'live' | 'allocated' | 'reached_for_pickup'
  | 'picked_up' | 'reached_for_drop' | 'ended' | 'cancelled';

export interface PorterDelivery {
  id: string;
  order_id: string;
  porter_order_id?: string;
  crn?: string;
  tracking_url?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  quoted_fare_paise?: number;
  final_fare_paise?: number;
  porter_status?: PorterStatus;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
}

// Order interface updated with:
delivery_type?: DeliveryType;
delivery_staff_id?: string;
porter_delivery?: PorterDelivery;
```

---

## 4. i18n Keys to Add

File: `src/i18n/en.json`

```json
{
  "porter": {
    "title": "Porter Delivery",
    "getQuote": "Get Porter Quote",
    "bookDelivery": "Book Porter Delivery",
    "cancelDelivery": "Cancel Porter",
    "cancelAndReassign": "Cancel & Assign In-House",
    "trackDelivery": "Track Delivery",
    "callDriver": "Call Driver",
    "estimatedFare": "Estimated Fare",
    "deliveryTime": "Delivery Time",
    "distance": "Distance",
    "vehicleType": "Vehicle Type",
    "driverAssigned": "Driver Assigned",
    "driverName": "Driver",
    "vehicleNumber": "Vehicle",
    "statusSearching": "Finding driver...",
    "statusAssigned": "Driver assigned",
    "statusAtStore": "At store",
    "statusPickedUp": "Picked up",
    "statusArriving": "Arriving soon",
    "statusDelivered": "Delivered",
    "statusCancelled": "Cancelled",
    "confirmBook": "Book Porter delivery for this order?",
    "confirmCancel": "Cancel Porter delivery?",
    "confirmCancelFallback": "Cancel Porter and return order to dispatch queue?",
    "bookSuccess": "Porter delivery booked!",
    "cancelSuccess": "Porter delivery cancelled",
    "reassignSuccess": "Order returned to dispatch queue",
    "quoteError": "Failed to get Porter quote",
    "bookError": "Failed to book Porter delivery",
    "cancelError": "Failed to cancel Porter delivery",
    "estimatedDelivery": "Estimated delivery",
    "fareLabel": "Delivery Fee"
  },
  "dispatch": {
    "title": "Dispatch Order",
    "inHouse": "In-House",
    "porter": "Porter",
    "selectStaff": "Select Delivery Staff",
    "assignStaff": "Assign & Dispatch",
    "noStaff": "No delivery staff available",
    "staffRequired": "Please select a delivery staff member"
  }
}
```

File: `src/i18n/gu.json` (Gujarati translations)

```json
{
  "porter": {
    "title": "પોર્ટર ડિલિવરી",
    "getQuote": "પોર્ટર ભાવ મેળવો",
    "bookDelivery": "પોર્ટર ડિલિવરી બુક કરો",
    "cancelDelivery": "પોર્ટર રદ કરો",
    "cancelAndReassign": "રદ કરો અને ઇન-હાઉસ સોંપો",
    "trackDelivery": "ડિલિવરી ટ્રેક કરો",
    "callDriver": "ડ્રાઇવરને ફોન કરો",
    "estimatedFare": "અંદાજિત ભાડું",
    "deliveryTime": "ડિલિવરી સમય",
    "distance": "અંતર",
    "driverAssigned": "ડ્રાઇવર સોંપાયેલ",
    "driverName": "ડ્રાઇવર",
    "vehicleNumber": "વાહન",
    "statusSearching": "ડ્રાઇવર શોધી રહ્યા છીએ...",
    "statusAssigned": "ડ્રાઇવર સોંપાયેલ",
    "statusAtStore": "દુકાન પર",
    "statusPickedUp": "ઉપાડ્યું",
    "statusArriving": "ટૂંક સમયમાં પહોંચશે",
    "statusDelivered": "ડિલિવર થયું",
    "statusCancelled": "રદ કરાયેલ",
    "bookSuccess": "પોર્ટર ડિલિવરી બુક થયી!",
    "cancelSuccess": "પોર્ટર ડિલિવરી રદ થયી",
    "reassignSuccess": "ઓર્ડર ડિસ્પેચ લાઇનમાં પાછો",
    "estimatedDelivery": "અંદાજિત ડિલિવરી",
    "fareLabel": "ડિલિવરી ફી"
  },
  "dispatch": {
    "title": "ઓર્ડર ડિસ્પેચ",
    "inHouse": "ઇન-હાઉસ",
    "porter": "પોર્ટર",
    "selectStaff": "ડિલિવરી સ્ટાફ પસંદ કરો",
    "assignStaff": "સોંપો અને ડિસ્પેચ કરો",
    "noStaff": "કોઈ ડિલિવરી સ્ટાફ ઉપલબ્ધ નથી",
    "staffRequired": "કૃપા કરી ડિલિવરી સ્ટાફ પસંદ કરો"
  }
}
```

---

## 5. Screen Specifications

### 5.1 Admin Order Detail (`app/(admin)/orders/[id].tsx`)

This is the primary integration point. Behavior changes based on order status and delivery type.

#### State Variables

```typescript
const [deliveryType, setDeliveryType] = useState<DeliveryType>('porter');
const [porterQuote, setPorterQuote] = useState<PorterQuoteResponse['quote'] | null>(null);
const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
```

#### Status: `placed`

No changes. Show existing buttons:
- **Confirm** (primary) → `updateOrderStatus({ status: 'confirmed' })`
- **Cancel** (danger) → confirmation alert → `updateOrderStatus({ status: 'cancelled' })`

#### Status: `confirmed` — Dispatch Section

This replaces the old single "Out for Delivery" button.

```
┌─────────────────────────────────────────┐
│  DISPATCH ORDER                         │
│                                         │
│  ┌──────────────┬──────────────┐        │
│  │   Porter     │   In-House   │        │ ← SegmentedButtons
│  └──────────────┴──────────────┘        │
│                                         │
│  [Porter selected]                      │
│  ┌─ Get Porter Quote ─────────────┐     │ ← AppButton secondary
│  └────────────────────────────────┘     │
│                                         │
│  [After quote received]                 │
│  ┌─────────────────────────────────┐    │
│  │ Estimated Fare      ₹84.51     │    │ ← quoteCard (shell bg)
│  │ Delivery Time       34 min     │    │
│  │ Distance            1.6 km     │    │
│  │                                 │    │
│  │ ┌─ Book Porter Delivery ─────┐ │    │ ← AppButton primary + icon
│  │ └────────────────────────────┘ │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [In-House selected]                    │
│  ┌─────────────────────────────────┐    │
│  │ Select Delivery Staff           │    │ ← Dropdown / picker
│  │ ┌──────────────────────────┐    │    │
│  │ │ Raj Kumar         ▼     │    │    │
│  │ └──────────────────────────┘    │    │
│  │                                 │    │
│  │ ┌─ Assign & Dispatch ─────────┐│    │ ← AppButton primary
│  │ └─────────────────────────────┘│    │
│  └─────────────────────────────────┘    │
│                                         │
│          Cancel Order                   │ ← AppButton text variant
└─────────────────────────────────────────┘
```

**Porter flow:**
1. Admin taps **"Get Porter Quote"** → loading spinner → quote card appears
2. Admin reviews fare/ETA → taps **"Book Porter Delivery"**
3. Confirmation `Alert.alert`:
   - Title: "Book Porter Delivery"
   - Message: "Estimated fare: ₹84.51\nETA: 34 min\nDistance: 1.6 km"
   - Buttons: [Cancel, Book Porter]
4. On success:
   - `hapticSuccess()`, toast "Porter delivery booked!"
   - `refetch()` → order refreshes with status `out_for_delivery` + Porter tracking
5. On error:
   - `hapticError()`, toast with error message

**In-House flow:**
1. Admin selects delivery staff from dropdown (fetched from users API)
2. Taps **"Assign & Dispatch"**
3. Calls `dispatchOrder({ orderId, deliveryStaffId })`
4. On success: order moves to `out_for_delivery` with in-house delivery type

#### Status: `out_for_delivery` + `delivery_type === 'porter'`

```
┌─────────────────────────────────────────┐
│  PORTER DELIVERY                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Status        [Driver Assigned] │    │ ← colored badge
│  │                                 │    │
│  │ ┌────────────────────────────┐  │    │
│  │ │ 👤 Mock Driver             │  │    │ ← driverCard (Pressable)
│  │ │    +919876543210           │  │    │
│  │ │    GJ01AB1234        📞   │  │    │ ← tap to call
│  │ └────────────────────────────┘  │    │
│  │                                 │    │
│  │ ┌─ Track on Porter ──────────┐ │    │ ← opens tracking_url
│  │ └────────────────────────────┘ │    │
│  │                                 │    │
│  │ Cancel & Reassign  Cancel Dlvry│    │ ← two action buttons
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Porter status badge colors:**

| Porter Status | Badge Color | Display Text |
|---------------|-------------|--------------|
| `live` / `pending` | `neutralLight` | "Finding driver..." |
| `allocated` | `brandLight` | "Driver Assigned" |
| `reached_for_pickup` | `brandLight` | "At Pickup" |
| `picked_up` | `positiveLight` | "Picked Up" |
| `reached_for_drop` | `positiveLight` | "Arriving" |
| `ended` | `positive` | "Delivered" |
| `cancelled` | `criticalLight` | "Cancelled" |

**Driver card:**
- Shows when `porter_delivery.driver_name` is present (after `allocated` event)
- Entire card is `Pressable` → calls `driver_phone`
- Phone icon on right side with `positiveLight` background circle
- Vehicle number shown below phone

**"Track on Porter" button:**
- `AppButton variant="secondary" icon="map-marker"`
- `Linking.openURL(porter_delivery.tracking_url)`

**"Cancel & Reassign" button:**
- `AppButton variant="text" size="sm"`
- Confirmation alert: "Cancel Porter and return order to dispatch queue?"
- Calls `cancelPorterDelivery({ orderId, reason, fallbackToInhouse: true })`
- On success: order returns to `confirmed` status, page refreshes to show dispatch section again

**"Cancel Delivery" button:**
- `AppButton variant="danger" size="sm"`
- Confirmation alert: "Cancel Porter delivery? Order will be marked as delivery failed."
- Calls `cancelPorterDelivery({ orderId, reason, fallbackToInhouse: false })`
- On success: order goes to `delivery_failed`

#### Status: `out_for_delivery` + `delivery_type === 'in_house'`

No changes. Show existing buttons:
- **Delivered** (primary)
- **Delivery Failed** (danger)

#### Status: `delivery_failed` (after Porter cancellation)

```
┌─────────────────────────────────────────┐
│  DELIVERY FAILED                        │
│                                         │
│  Failure reason: Porter unavailable     │
│                                         │
│  ┌─ Retry with Porter ───────────────┐  │
│  └────────────────────────────────────┘  │
│  ┌─ Assign In-House Staff ───────────┐  │
│  └────────────────────────────────────┘  │
│                                         │
│           Cancel Order                  │
└─────────────────────────────────────────┘
```

- **"Retry with Porter"** → shows dispatch section with Porter selected, starts fresh quote
- **"Assign In-House Staff"** → shows dispatch section with In-House selected
- Both set order status back to `confirmed` first (via `updateOrderStatus`), then show dispatch section

Implementation: When `delivery_failed`, show the same dispatch section as `confirmed`, with both Porter and In-House options. The `porter-book` and `dispatchOrder` endpoints already accept orders with `delivery_failed` status.

---

### 5.2 Delivery Staff Picker (New Component)

File: `src/components/admin/DeliveryStaffPicker.tsx`

Fetch delivery staff users and present a selectable list.

#### API Query

Add to `apiSlice.ts`:
```typescript
getDeliveryStaff: builder.query<User[], void>({
  query: () => ({
    url: '/rest/v1/users?role=eq.delivery_staff&is_active=eq.true&select=id,name,phone',
  }),
  providesTags: ['DeliveryStaff'],
}),
```

#### Component Design

```
┌─────────────────────────────────────────┐
│  Select Delivery Staff                  │
│                                         │
│  ┌────────────────────────────────────┐  │
│  │ ● Raj Kumar       +919876543211   │  │  ← RadioButton + name + phone
│  ├────────────────────────────────────┤  │
│  │ ○ Amit Patel      +919876543212   │  │
│  ├────────────────────────────────────┤  │
│  │ ○ Vijay Singh     +919876543213   │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Assign & Dispatch ──────────────┐   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

Props:
```typescript
interface DeliveryStaffPickerProps {
  selectedStaffId: string | null;
  onSelect: (staffId: string) => void;
  onDispatch: () => void;
  isLoading: boolean;
}
```

- Uses `RadioButton.Group` from React Native Paper
- Shows staff name and phone in each row
- Empty state: "No delivery staff available"
- Dispatch button disabled until staff selected
- Loading state on dispatch button

---

### 5.3 Admin Orders List (`app/(admin)/orders/index.tsx`)

#### Changes

Add delivery type indicator to order cards:

```
┌──────────────────────────────────────┐
│ ▌ #c043f751  [Confirmed]            │
│ ▌ 26 Jan 2026, 9:34 PM              │
│ ▌ 123 Test Street, Ahmedabad        │
│ ▌ 2 items · ₹400.00                 │
│ ▌                      🏍 Porter    │  ← delivery type indicator (bottom-right)
└──────────────────────────────────────┘
```

- Show small icon + text badge at bottom-right of card
- Only show when `delivery_type === 'porter'`
- Icon: `motorbike` for Porter, `account` for in-house (only show for out_for_delivery)
- Color: `colors.text.secondary`

No additional filters needed — Porter orders follow the same status flow.

---

### 5.4 Customer Order Detail (`app/(customer)/orders/[id].tsx`)

#### Status: `out_for_delivery` + `delivery_type === 'porter'`

Replace the OTP section with a Porter tracking card:

```
┌─────────────────────────────────────────┐
│  🏍 Porter Delivery    [Picked Up]     │  ← header with status badge
│                                         │
│  ┌────────────────────────────────────┐  │
│  │        ┌──────┐                    │  │
│  │        │  👤  │  Mock Driver       │  │  ← avatar circle + name
│  │        └──────┘  GJ01AB1234       │  │  ← vehicle number
│  │                              📞   │  │  ← call button (green circle)
│  └────────────────────────────────────┘  │
│                                         │
│  🕐 Estimated delivery: 2:20 PM        │  ← ETA row
│                                         │
│  ┌─ Track Delivery ─────────────────┐   │  ← primary button
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Visibility rules:**
- Show tracking card ONLY when: `status === 'out_for_delivery' && delivery_type === 'porter' && porter_delivery exists`
- Show OTP section ONLY when: `status === 'out_for_delivery' && delivery_type !== 'porter' && delivery_otp exists`
- Both hidden for other statuses

**Driver card behavior:**
- Avatar: `MaterialCommunityIcons name="account"` in a circular `brandLight` background
- Name: `fontFamily.semiBold`, `colors.text.primary`
- Vehicle: `colors.text.secondary`
- Call button: Pressable circle with phone icon, opens `tel:{driver_phone}`
- Entire row is Pressable → same call action

**ETA row:**
- Clock icon + "Estimated delivery: {time}"
- Format: `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`
- Only show if `estimated_delivery_time` exists

**Track button:**
- `AppButton variant="primary" size="md" fullWidth icon="map-marker"`
- `Linking.openURL(tracking_url)`

#### Status: `out_for_delivery` + `delivery_type === 'in_house'`

No changes. Show existing delivery OTP digits.

#### Status: `delivered` + `delivery_type === 'porter'`

Show delivery summary (optional):
```
Delivered via Porter
Driver: Mock Driver
Fare: ₹85.00
```

---

### 5.5 Customer Orders List (`app/(customer)/orders/index.tsx`)

Minor change: show delivery type icon on order cards when `out_for_delivery`:

```
┌──────────────────────────────────────┐
│  Order #MSS-20260126-006             │
│  [Out for Delivery]                  │
│  2 items · ₹400.00                   │
│                        🏍 Porter     │  ← small indicator
└──────────────────────────────────────┘
```

---

### 5.6 Delivery Staff Screens (No Changes)

The delivery staff app (`app/(delivery)/`) only shows in-house deliveries. Porter deliveries are handled entirely by the Porter driver — no interaction with our delivery staff app.

Existing filter `status === 'out_for_delivery'` should also check `delivery_type === 'in_house'` to avoid showing Porter orders to in-house staff:

```typescript
// In delivery list, filter to in-house only
const myDeliveries = orders?.filter(
  o => o.status === 'out_for_delivery'
    && o.delivery_type !== 'porter'
    && o.delivery_staff_id === currentUserId
) ?? [];
```

---

## 6. Polling for Real-Time Updates

Porter status updates arrive via webhooks on the backend. The mobile app needs to poll for updates.

### Strategy

Use RTK Query's `pollingInterval` on the order detail screen when a Porter delivery is active:

```typescript
const { data: order } = useGetOrderByIdQuery(orderId, {
  // Poll every 15 seconds when Porter delivery is active
  pollingInterval:
    order?.delivery_type === 'porter' &&
    order?.status === 'out_for_delivery' &&
    order?.porter_delivery?.porter_status !== 'ended' &&
    order?.porter_delivery?.porter_status !== 'cancelled'
      ? 15000
      : 0, // 0 = no polling
});
```

Apply this polling on:
- Admin order detail screen (15-second interval)
- Customer order detail screen (15-second interval)

Polling stops automatically when:
- Porter delivery is completed (`ended`)
- Porter delivery is cancelled
- Order is no longer `out_for_delivery`
- User navigates away (component unmounts)

---

## 7. Complete Admin Order Detail Flow

### State Machine

```
┌─────────┐    confirm     ┌───────────┐
│ placed  │───────────────→│ confirmed │
│         │    cancel      │           │
│         │───→[cancelled] │           │
└─────────┘                └─────┬─────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              Porter Book              In-House Dispatch
                    │                         │
                    ▼                         ▼
           ┌───────────────┐        ┌───────────────┐
           │out_for_delivery│        │out_for_delivery│
           │ type: porter   │        │ type: in_house │
           └───┬───────┬───┘        └───┬───────┬───┘
               │       │                │       │
          delivered  cancel         delivered  failed
               │       │                │       │
               ▼       ▼                ▼       ▼
          [delivered] [delivery_failed] [delivered] [delivery_failed]
                       │
                       │ fallback_to_inhouse
                       ▼
                 ┌───────────┐
                 │ confirmed │  (back to dispatch)
                 │ in_house  │
                 └───────────┘
```

### Interaction Sequence

```
Admin opens order (confirmed)
  │
  ├─ Selects "Porter" tab
  │   ├─ Taps "Get Porter Quote"
  │   │   └─ Shows fare, ETA, distance
  │   ├─ Taps "Book Porter Delivery"
  │   │   ├─ Alert confirmation with quote details
  │   │   └─ Success → order refreshes to out_for_delivery
  │   │
  │   └─ [Order is out_for_delivery with Porter]
  │       ├─ Shows Porter status badge (live → allocated → picked_up → ...)
  │       ├─ Shows driver info when assigned
  │       ├─ "Track on Porter" → opens tracking URL
  │       ├─ "Cancel & Reassign" → alert → cancel with fallback
  │       │   └─ Order returns to confirmed → dispatch section shown again
  │       └─ "Cancel Delivery" → alert → cancel without fallback
  │           └─ Order goes to delivery_failed
  │
  ├─ Selects "In-House" tab
  │   ├─ Staff picker shows list of active delivery_staff users
  │   ├─ Selects a staff member
  │   └─ Taps "Assign & Dispatch"
  │       ├─ Calls dispatchOrder({ orderId, deliveryStaffId })
  │       └─ Success → order refreshes to out_for_delivery (in_house)
  │
  └─ Taps "Cancel Order" (text button at bottom)
      └─ Alert → updateOrderStatus({ status: 'cancelled' })
```

---

## 8. Error Handling

### Error Codes from Backend

| Code | When | User Message |
|------|------|-------------|
| `INVALID_ORDER_STATUS` | Order not in expected status | "Order is no longer available for dispatch" |
| `PORTER_ALREADY_BOOKED` | Porter already active for order | "This order already has a Porter delivery" |
| `NOT_PORTER_DELIVERY` | Cancel called on non-Porter order | "This order is not using Porter delivery" |
| `ALREADY_CANCELLED` | Porter already cancelled | "Porter delivery already cancelled" |
| `ALREADY_DELIVERED` | Order already delivered | "Order already delivered" |
| `GEOCODING_FAILED` | Address couldn't be geocoded | "Could not determine delivery location" |
| `CONFIG_ERROR` | Store pickup not configured | Contact admin |
| `USE_PORTER_ENDPOINT` | Tried in-house dispatch with `delivery_type: 'porter'` | Internal error, should not happen |
| `PORTER_IN_PROGRESS` | Manual status change on active Porter order | "Use Porter cancel to manage this delivery" |
| `MISSING_DELIVERY_STAFF` | In-house dispatch without staff | "Please select a delivery staff member" |

### Frontend Error Pattern

```typescript
try {
  const result = await mutation(args).unwrap();
  hapticSuccess();
  showToast({ message: t('porter.bookSuccess'), type: 'success' });
  refetch(); // refresh order data
} catch (err: unknown) {
  hapticError();
  const errorData = (err as { data?: string })?.data;
  // Map known error codes to i18n messages if needed
  showToast({ message: errorData || t('porter.bookError'), type: 'error' });
}
```

---

## 9. Component Hierarchy

```
AdminOrderDetailScreen
├── OrderHeader (order number, status badge, delivery type indicator)
├── DispatchSection (when status === 'confirmed' || 'delivery_failed')
│   ├── SegmentedButtons (Porter / In-House)
│   ├── PorterQuoteFlow (when Porter selected)
│   │   ├── GetQuoteButton
│   │   └── QuoteCard (fare, ETA, distance, book button)
│   ├── InHouseDispatchFlow (when In-House selected)
│   │   ├── DeliveryStaffPicker
│   │   └── DispatchButton
│   └── CancelOrderButton (text variant)
├── PorterTrackingSection (when out_for_delivery + porter)
│   ├── PorterStatusBadge
│   ├── DriverInfoCard (name, phone, vehicle, call button)
│   ├── TrackOnPorterButton
│   └── CancelActions (Cancel & Reassign, Cancel Delivery)
├── InHouseActions (when out_for_delivery + in_house)
│   ├── MarkDeliveredButton
│   └── MarkFailedButton
├── DeliveryAddressSection
├── OrderItemsSection
├── TotalSection
└── NotesSection

CustomerOrderDetailScreen
├── OrderHeader
├── StatusTimeline
├── PorterTrackingCard (when out_for_delivery + porter)
│   ├── PorterStatusBadge
│   ├── DriverInfoCard
│   ├── ETARow
│   └── TrackDeliveryButton
├── DeliveryOTPSection (when out_for_delivery + in_house)
├── OrderItemsSection
├── PricingBreakdown
├── DeliveryAddressSection
├── NotesSection
└── ReorderButton (when delivered/cancelled)
```

---

## 10. Testing Checklist

### Porter Flow (Happy Path)
- [ ] Admin confirms order (placed → confirmed)
- [ ] Admin selects Porter tab, taps "Get Quote"
- [ ] Quote displays fare, ETA, distance
- [ ] Admin taps "Book Porter" → confirmation alert
- [ ] Order transitions to out_for_delivery with delivery_type=porter
- [ ] Porter status badge shows "Finding driver..."
- [ ] Admin triggers mock "allocated" event → driver info appears
- [ ] Admin triggers mock "picked_up" event → status updates
- [ ] Admin triggers mock "delivered" event → order status = delivered
- [ ] Customer sees Porter tracking card with driver info
- [ ] Customer taps "Track Delivery" → opens tracking URL
- [ ] Customer taps driver phone → opens dialer

### Cancel + Fallback Flow
- [ ] Admin cancels Porter with fallback → order returns to confirmed
- [ ] Dispatch section reappears, admin can select In-House
- [ ] Admin picks delivery staff, dispatches in-house
- [ ] In-house delivery proceeds with OTP flow normally

### Cancel Without Fallback
- [ ] Admin cancels Porter without fallback → order = delivery_failed
- [ ] Admin sees retry options (Porter or In-House)

### In-House Flow (Unchanged)
- [ ] Admin selects In-House tab, picks staff, dispatches
- [ ] Order goes to out_for_delivery with delivery_type=in_house
- [ ] Customer sees delivery OTP (not Porter card)
- [ ] Delivery staff verifies OTP → order delivered

### Edge Cases
- [ ] Order with active Porter delivery blocks manual status changes
- [ ] Double-booking prevented (PORTER_ALREADY_BOOKED error)
- [ ] Polling stops when order is delivered/cancelled
- [ ] Network error during booking shows toast and doesn't change state
- [ ] Already-cancelled Porter delivery shows appropriate error

---

## 11. Files to Modify/Create

| Action | File | Description |
|--------|------|-------------|
| **Modify** | `src/i18n/en.json` | Add `porter.*` and `dispatch.*` keys |
| **Modify** | `src/i18n/gu.json` | Add Gujarati translations |
| **Modify** | `src/store/apiSlice.ts` | Add `getDeliveryStaff` query |
| **Create** | `src/components/admin/DeliveryStaffPicker.tsx` | Staff selection component |
| **Modify** | `app/(admin)/orders/[id].tsx` | Full Porter dispatch + tracking UI |
| **Modify** | `app/(admin)/orders/index.tsx` | Add delivery type indicator to cards |
| **Modify** | `app/(customer)/orders/[id].tsx` | Porter tracking card, conditional OTP |
| **Modify** | `app/(customer)/orders/index.tsx` | Add delivery type indicator to cards |
| **Modify** | `app/(delivery)/index.tsx` | Filter out Porter orders from delivery staff view |

---

## 12. Mock Mode Notes

When `PORTER_ENV=mock` on the backend:
- Quotes return random fares between ₹80-120
- Bookings create mock order IDs (`MOCK-{timestamp}`)
- Tracking URLs point to `https://porter.in/track/MOCK-...` (non-functional)
- Use `porter-mock-event` endpoint to simulate status changes
- All SMS notifications logged to console (not actually sent)

To test the full flow in mock mode:
1. Book Porter via admin UI
2. Open a terminal and call mock events in sequence:
   ```bash
   # Simulate driver assignment
   curl -X POST .../porter-mock-event -d '{"order_id":"...","event":"allocated"}'
   # Wait, then simulate pickup
   curl -X POST .../porter-mock-event -d '{"order_id":"...","event":"picked_up"}'
   # Wait, then simulate delivery
   curl -X POST .../porter-mock-event -d '{"order_id":"...","event":"delivered"}'
   ```
3. Observe the admin/customer UI updating via polling
