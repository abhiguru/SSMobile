# SAP Fiori Bottom Sheet - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/modals/bottom-sheet/

## Intro

Bottom sheets are containers with supplementary content that is located at the bottom of the screen.

## Usage

### Do
- Use bottom sheets to show deep-linked content that supplements the screen's primary UI region
- Use bottom sheets when representing actions in a list (as opposed to menus or simple dialog)
- Use bottom sheets when you need to allow for a wide variety of content and layouts
- Use bottom sheets when easy access is needed

### Don't
- Don't use bottom sheets for complex information
- Don't use bottom sheets to notify a user to take action

---

## Anatomy

### Modal Bottom Sheet – List View

Modal bottom sheets are alternatives to inline menus or simple dialogs on mobile:
- Provide room for additional items
- Allow for longer descriptions
- Support iconography

**Important**: They must be dismissed to interact with the underlying content.

### A. Header
Top section of the bottom sheet, typically contains:
- Title
- Optional close button
- Optional drag handle

### B. List of Actions
Main content area containing:
- List items
- Action buttons
- Selection options
- Other interactive elements

### C. Divider Line
Separates different sections or groups of items

---

## Behavior and Interaction

Modal bottom sheets present a set of choices while **blocking interaction with the rest of the screen**.

### Elevation
- Default elevation: **16dp** (Android) / **shadow-xl** (iOS)
- Helps users focus on their available choices
- Creates clear visual separation from underlying content

### Dismissal Methods
1. Tap outside bottom sheet (scrim/backdrop)
2. Swipe down gesture (drag handle)
3. Tap close button (if provided)
4. Select an action (if configured to close on selection)

---

## Adaptive Design

### Platform Usage
- **Primarily used**: Mobile devices
- **Also available**: Tablet solution

### Mobile vs Tablet
| Device | Width | Max Height |
|--------|-------|------------|
| Mobile (iPhone) | 100% screen width | 90% screen height |
| Tablet (iPad) | 540pt max (centered) | 80% screen height |

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Drag Handle Width | 36pt |
| Drag Handle Height | 5pt |
| Drag Handle Top Margin | 8pt |
| Header Height | 56pt (with title), 20pt (handle only) |
| Header Padding | 16pt horizontal, 12pt vertical |
| Content Padding | 16pt horizontal |
| List Item Height | 44pt minimum |
| Divider Height | 1pt |
| Corner Radius | 16pt (top corners only) |
| Backdrop Opacity | 0.4 (40% black) |
| Shadow Elevation | 16dp (Android) |

### Layout Structure (List View)

```
┌─────────────────────────────────────────────────────────────┐
│                          ─────                               │  ← Drag handle
│                                                              │
│  Select Customer                                        [×]  │  ← Header
├──────────────────────────────────────────────────────────────┤
│  [Icon] Customer A                                      [✓]  │
│  [Icon] Customer B                                           │
│  [Icon] Customer C                                           │
├──────────────────────────────────────────────────────────────┤  ← Divider
│  [Icon] Add New Customer                                 [>] │
└──────────────────────────────────────────────────────────────┘
```

### Layout Structure (Filter Bottom Sheet)

```
┌─────────────────────────────────────────────────────────────┐
│                          ─────                               │
│                                                              │
│  Filter by Date                   [Reset]            [Apply] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  From Date                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Jan 1, 2025                                     [📅] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  To Date                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Dec 31, 2025                                    [📅] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### GCS App Bottom Sheet Usage

| Screen | Bottom Sheet Type | Purpose | Dismissal Method |
|--------|-------------------|---------|------------------|
| GRN List | Customer Selection | Select customer for filter | Select or Cancel |
| GRN List | Filter Options | Apply multiple filters | Apply or Cancel |
| GRN Form | Customer Autocomplete | Search & select customer | Select or Cancel |
| GRN Form | Item Autocomplete | Search & select item | Select or Scan |
| GRN Form | Items Summary | Review selected items | Close |
| Dispatch List | Filter Options | Apply filters | Apply or Cancel |
| Invoice List | Filter Options | Apply filters | Apply or Cancel |
| Orders | Change Log | View change history | Swipe down or Close |
| Print | Print Jobs | View print queue | Swipe down or Close |

### Color Scheme

| Element | Color |
|---------|-------|
| Background | #FFFFFF (white) |
| Drag Handle | #C6C6C8 (gray) |
| Header BG | #FFFFFF (white) |
| Header Text | #1D2D3E (Fiori text primary) |
| Backdrop/Scrim | rgba(0, 0, 0, 0.4) |
| Divider | #E5E5E5 (Fiori divider) |
| List Item BG (normal) | #FFFFFF |
| List Item BG (pressed) | #F5F6F7 (Fiori pressed) |
| List Item BG (selected) | #EBF8FF (Fiori selected) |

### Bottom Sheet Snap Points

For complex bottom sheets with scrollable content:

```typescript
// Using @gorhom/bottom-sheet
const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);

// Or dynamic based on content
const snapPoints = useMemo(() => {
  const minHeight = 200; // Minimum height in pts
  const maxHeight = dimensions.height * 0.9; // 90% of screen
  return [minHeight, maxHeight];
}, [dimensions]);
```

### Bottom Sheet Header Variants

#### 1. Simple (Drag Handle Only)
```typescript
<BottomSheet>
  <DragHandle />
  <Content />
</BottomSheet>
```

#### 2. With Title
```typescript
<BottomSheet>
  <Header>
    <Title>Select Customer</Title>
  </Header>
  <Content />
</BottomSheet>
```

#### 3. With Title and Actions
```typescript
<BottomSheet>
  <Header>
    <CancelButton>Cancel</CancelButton>
    <Title>Filter by Date</Title>
    <ResetButton>Reset</ResetButton>
  </Header>
  <Content />
  <Footer>
    <ApplyButton>Apply</ApplyButton>
  </Footer>
</BottomSheet>
```

### Gesture Handling

```typescript
// Swipe down to dismiss
const handleSheetChanges = useCallback((index: number) => {
  if (index === -1) {
    // Sheet dismissed
    onClose();
  }
}, []);

// Tap backdrop to dismiss
const handleBackdropPress = () => {
  bottomSheetRef.current?.close();
};
```

### Search in Bottom Sheet

For autocomplete bottom sheets:

```typescript
<BottomSheet>
  <Header>
    <SearchBar
      placeholder="Search customers..."
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
  </Header>
  <ScrollView>
    {filteredItems.map(item => (
      <ListItem key={item.id} onPress={() => handleSelect(item)}>
        {item.name}
      </ListItem>
    ))}
  </ScrollView>
</BottomSheet>
```

### Performance Optimization

For large lists in bottom sheets:

```typescript
// Use FlashList instead of FlatList
import { FlashList } from '@shopify/flash-list';

<BottomSheet>
  <FlashList
    data={items}
    renderItem={({ item }) => <ListItem {...item} />}
    estimatedItemSize={44}
  />
</BottomSheet>
```

### Accessibility

- Bottom sheet container: `accessibilityViewIsModal={true}` (blocks background interaction)
- Header title: `accessibilityRole="header"`
- Close button: `accessibilityLabel="Close [sheet name]"`
- Drag handle: `accessibilityLabel="Drag to dismiss"`
- List items: `accessibilityRole="button"` or `accessibilityRole="radio"` (for selection)
- Backdrop: `accessibilityLabel="Close [sheet name]"`, `accessibilityRole="button"`

### Animation

Bottom sheet should use spring animation for natural feel:

```typescript
// Entry animation
Animated.spring(translateY, {
  toValue: 0,
  damping: 20,
  stiffness: 90,
  useNativeDriver: true,
}).start();

// Exit animation
Animated.spring(translateY, {
  toValue: screenHeight,
  damping: 20,
  stiffness: 90,
  useNativeDriver: true,
}).start(() => {
  onDismiss();
});
```

### Library Recommendation

For React Native, use **@gorhom/bottom-sheet**:
- Follows iOS bottom sheet patterns
- Supports gestures and snap points
- Performant with native driver
- Accessible by default
- Supports dynamic sizing
