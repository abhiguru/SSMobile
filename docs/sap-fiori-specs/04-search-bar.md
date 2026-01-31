# SAP Fiori Search Bar - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/bars/search-bar/

## Intro

The search bar is used to locate objects within a large collection of items. It is usually used in a list report pattern or list picker to allow the user to quickly navigate to an object.

## Anatomy

### A. Placeholder Text
Provides context to the user about what type of object is being searched for.

**Examples**:
- "Search GRN or customer..."
- "Search items..."
- "Search invoices..."

### B. Trailing Icon (Optional)
An optional icon (hidden by default) can be added:
- **Microphone icon**: Voice search
- **Barcode scanner icon**: Launch scanning functions

### C. "Cancel" Button
Returns the search bar to its default state and allows the user to cancel their search.

### D. Input Text
Displays the search queries or text/keywords that the user has inputted into the search field.

### E. "Clear" Button
Clears all values that have been added by the user (appears when text is entered).

---

## Search Bar States

### 1. Default State
- Placeholder text visible
- Optional trailing icon (microphone/scanner)
- No "Cancel" button
- Inactive appearance

### 2. Active State (Tapped)
- Placeholder text visible
- Cursor blinking in input field
- "Cancel" button appears on right
- Keyboard appears (if text input)

### 3. Typing State
- User is entering text
- "Clear" button (×) appears in search field
- "Cancel" button remains visible
- Live search results may appear

### 4. Typed State (After Entry)
- Text displayed in search field
- "Clear" button visible
- "Cancel" button visible
- Search results populated

---

## Behavior and Interaction

### Navigation Bar Behavior
When the user taps on the search bar:
1. Search bar **shifts up** and takes the place of the navigation bar
2. Navigation bar is **automatically hidden**
3. Once user inputs value, results are populated within content area

### Search Results
- Results appear in content area below search bar
- Live filtering as user types (optional)
- Results update in real-time

---

## Adaptive Design

The search bar adapts to different screen sizes:
- **Compact width (iPhone)**: Full-width search bar
- **Regular width (iPad)**: Can be integrated into navigation bar or remain separate

---

## Variations

### Entry Points

#### 1. Search Icon (Collapsed)
Search initiated through a search icon on screen.
- Icon expands into search bar when tapped
- **Use when**: Search isn't the primary focus or action on the screen
- Saves screen space

#### 2. Search within Top Navigation Bar (Prominent)
Also known as **prominent search bar**.
- **Use when**: Search is the primary action in the current screen
- Remains visible at all times beneath navigation bar
- Always expanded

### Trailing Icons

#### 1. Microphone Icon
- Allows users to use speech/voice recognition
- Search for query without typing on keyboard
- Appears in search bar's default state (optional)

#### 2. Barcode Scanner Icon
- Allows user to quickly search for object without typing
- Launches barcode scanner when tapped
- Useful for warehouse/inventory apps (like GCS)

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Search Bar Height | 36pt (default), 44pt (prominent) |
| Touch Target Height | 44pt minimum |
| Corner Radius | 10pt (rounded search field) |
| Icon Size | 20pt × 20pt |
| Font Size | 17pt (iOS default) |

### Layout Structure (Default/Collapsed)
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] Search...                                     [🎤]     │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Active/Typing)
```
┌─────────────────────────────────────────────────────────────┐
│ [🔍] iphone charger cable                [×]      [Cancel] │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Prominent - Below Navigation Bar)
```
┌─────────────────────────────────────────────────────────────┐
│ [Back]              GRNs                    [Filter] [Add]  │
├─────────────────────────────────────────────────────────────┤
│ [🔍] Search GRN or customer...                     [🎤]     │
└─────────────────────────────────────────────────────────────┘
```

### GCS App Search Implementation by Screen

| Screen | Search Type | Placeholder Text | Trailing Icon |
|--------|-------------|------------------|---------------|
| GRN List | Prominent | "Search GRN or customer..." | Barcode scanner (optional) |
| Dispatch List | Prominent | "Search dispatch or customer..." | Barcode scanner (optional) |
| Invoice List | Prominent | "Search invoice or customer..." | - |
| Order List | Prominent | "Search orders or customer..." | - |
| Item Catalog | Prominent | "Search items..." | Barcode scanner |
| Stock | Prominent | "Search items or customers..." | - |

### Search Behavior Recommendations

#### Live Search (As User Types)
```typescript
// Debounce search to avoid excessive API calls
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300); // 300ms delay

useEffect(() => {
  if (debouncedSearch) {
    fetchSearchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

#### Search on Submit (Press Enter/Search Button)
```typescript
const handleSearchSubmit = () => {
  fetchSearchResults(searchQuery);
};
```

### Color Scheme
| Element | Color |
|---------|-------|
| Background (inactive) | #F2F2F7 (light gray) |
| Background (active) | #FFFFFF (white) |
| Border (active) | #0057D2 (blue - Fiori neutral) |
| Placeholder Text | #7e8e9d (gray-500) |
| Input Text | #1D2D3E (Fiori text primary) |
| Icon Color | #7e8e9d (gray-500) |
| Cancel Button | #0057D2 (blue) |

### Barcode Scanner Integration
For warehouse apps like GCS, barcode scanner is highly recommended:

```typescript
import { BarCodeScanner } from 'expo-barcode-scanner';

const handleScan = async () => {
  const { status } = await BarCodeScanner.requestPermissionsAsync();
  if (status === 'granted') {
    // Open scanner modal
    setShowScanner(true);
  }
};

const handleBarCodeScanned = ({ data }) => {
  setSearchQuery(data);
  setShowScanner(false);
  fetchSearchResults(data);
};
```

### Accessibility
- Search field should have `accessibilityLabel="Search"`
- Clear button: `accessibilityLabel="Clear search"`
- Cancel button: `accessibilityLabel="Cancel search"`
- Barcode scanner: `accessibilityLabel="Scan barcode"`
- Microphone: `accessibilityLabel="Voice search"`
