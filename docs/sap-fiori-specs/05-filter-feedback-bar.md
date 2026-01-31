# SAP Fiori Filter Feedback Bar - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/bars/filter-feedback-bar/

## Intro

The filter feedback bar is a horizontal bar that appears above a list of content. It uses interactive buttons to communicate which filters have been applied to the list and allows users to quickly apply frequently used filters. It is typically used in list report or work list floorplans.

## Usage

### Do
- Use a filter feedback bar when there are frequently used filter options

### Don't
- Don't use a filter feedback bar when there are many filters that need to be applied to the list
- Don't use when filters have complex names
- Instead: Use the count as feedback in the filter button

---

## Anatomy

### Positioning
The filter feedback bar sits:
1. Below the navigation bar
2. If available, beneath the search bar
3. Directly above the content area

### Filter Buttons

#### A. Active Filter Buttons
Active filter buttons are those that have been selected:
- Indicate a sort button (if non-default sort)
- Show filters currently applied to the list
- Always placed to the **left** of any visible inactive filter buttons

#### B. Inactive Filter Buttons
Inactive filter buttons:
- Appear in filter bar for fast filters not currently selected by user
- Only shown for predefined fast filters
- See Types section for more information

---

## Filter Sheet

When there is a complex filter action associated with a filter button, a filter sheet appears.

### A. Navigation Bar
Contains sheet-level control actions:
- "Cancel" button
- "Reset" button

### B. Component Area
Interchangeable with components from Input & Selection section:
- Filter form cell
- Slider
- Calendar
- Other input components

Used for seamless option to set fast filters in modal sheet.

### C. Toolbar Container
- Contains one button (typically "Apply")
- Always visible, even when users scroll down

---

## Behavior and Interaction

### Horizontal Scrolling
- Users can scroll the filter feedback bar horizontally
- View additional buttons that may be off-screen
- If sort button is present, filter buttons **slide beneath it** when scrolling

### Applying Fast Filters
When user taps a fast filter button:
1. Filter is applied to content list
2. Button takes on **active status**
3. Button moves to left side of bar

### Removing Filters
To remove a filter, users can:
- **Option 1**: Tap on its active filter button in filter feedback bar
- **Option 2**: Deselect it within filter modal window
- **Option 3** (if using filter sheet): Tap "Reset" then "Apply"

**Important behavior**:
- Filter buttons **remain in filter feedback bar** even when inactive (for predefined fast filters)
- Filters from modal window (not originally in filter feedback bar) **disappear** when deactivated

### Applying Filters from Filter Sheet
When user selects filter button with **downward chevron icon**:
1. Indicates more complex filter action
2. Filter modal sheet appears at bottom of screen
3. User interacts with components
4. Taps "Apply" to confirm

### Applying Filters from Filter Modal
When user selects filter from filter modal window:
1. Filter is applied to content list
2. Active filter button appears on **left side** of filter feedback bar
3. Positioned to the right of sort button (if available)

---

## Variations

### Filter Button Types

There are four types of filter buttons:

1. **Default filter button**
   - Text only
   - No icon

2. **Default filter button with chevron**
   - Text with downward chevron (∨)
   - Indicates filter sheet opens

3. **Descriptive icon filter button**
   - Icon + text
   - Icon describes filter type

4. **Descriptive icon filter button with chevron**
   - Icon + text + downward chevron
   - Indicates filter sheet opens

**Important rule**: If using descriptive icon filter buttons:
- **All buttons** in feedback bar must have corresponding descriptive icon
- Cannot mix default buttons with descriptive icon buttons
- Any button with chevron may be used with either type

### Filter Feedback Bar with Filter Buttons
- Filter buttons remain visible even when not applied
- Provides quick access to most frequently used filter options
- **App defines** which filters should be included (users cannot customize)

### Filter Feedback Bar without Filter Buttons
When no filter buttons predefined:
- Filter feedback bar is **hidden by default**
- Only appears after user has:
  - Applied a filter, OR
  - Changed sort option within filter modal
- **Note**: Default sort does not appear in filter feedback bar (only non-default sorts)

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Filter Bar Height | 44pt minimum |
| Filter Button Height | 32pt (chip height) |
| Filter Button Padding | 8pt horizontal, 6pt vertical |
| Filter Button Margin | 8pt between buttons |
| Icon Size | 16pt × 16pt |
| Font Size | 14pt |
| Corner Radius | 16pt (pill shape) |

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Sort: Date ∨] [Status: Received] [Customer] [Items ∨] ... │
│  (active)      (active)            (inactive)  (inactive)   │
└─────────────────────────────────────────────────────────────┘
```

### Filter Button States

| State | Background | Border | Text Color | Icon Color |
|-------|------------|--------|------------|------------|
| Active | Primary (#f69000) | None | White (#FFFFFF) | White |
| Inactive | Light gray (#F2F2F7) | 1pt gray (#E5E5E5) | Primary text (#1D2D3E) | Gray (#7e8e9d) |
| Pressed (active) | Primary dark (#dd8200) | None | White | White |
| Pressed (inactive) | Gray (#E5E5E5) | 1pt gray | Primary text | Gray |

### GCS App Filter Feedback Bar by Screen

#### GRN List
Predefined fast filters:
- Sort: [Date ∨] [GRN No ∨]
- Status (inactive by default)
- Customer (inactive by default)
- Items (inactive by default)

#### Dispatch List
Predefined fast filters:
- Sort: [Date ∨] [Dispatch No ∨]
- Status (inactive by default)
- Customer (inactive by default)

#### Invoice List
Predefined fast filters:
- Sort: [Date ∨] [Invoice No ∨]
- Financial Year (inactive by default)
- Customer (inactive by default)

#### Order List
Predefined fast filters:
- Updated: [Today] [This Week] [This Month]
- Customer (inactive by default)

### Filter Sheet Component Structure

```typescript
// Filter Sheet with Calendar (Date Range)
<BottomSheet>
  <NavigationBar>
    <LeftButton>Cancel</LeftButton>
    <Title>Filter by Date</Title>
    <RightButton>Reset</RightButton>
  </NavigationBar>

  <ComponentArea>
    <Calendar selectionMode="range" />
  </ComponentArea>

  <Toolbar>
    <Button>Apply</Button>
  </Toolbar>
</BottomSheet>
```

### Horizontal Scrolling Behavior

```typescript
// Filter feedback bar should be horizontally scrollable
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: 16 }}
>
  {filterButtons.map(button => (
    <FilterButton key={button.id} {...button} />
  ))}
</ScrollView>
```

### Active Filter Count Badge

If not using filter feedback bar, show count on main filter button:

```typescript
// Navigation bar filter button
<IconButton icon="filter-variant">
  {activeFilterCount > 0 && (
    <Badge
      size={18}
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#D32030' // Fiori negative
      }}
    >
      {activeFilterCount}
    </Badge>
  )}
</IconButton>
```

### Accessibility
- Filter buttons: `accessibilityRole="button"`
- Active filters: `accessibilityLabel="[Filter name] applied, tap to remove"`
- Inactive filters: `accessibilityLabel="Apply [filter name] filter"`
- Chevron buttons: `accessibilityHint="Opens filter options"`
