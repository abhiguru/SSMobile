# SAP Fiori Chip - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/chips/chip/

## Intro

Chips are interactive elements that provide users with a set of options, allowing them to make selections.

## Usage

### Do
- Use chips when you need to help users quickly choose between at least **two clearly distinct choices**
- Use chips to **optimize screen space** when the text of value is short

### Don't
- Don't use chips when the number of options is **more than eight**
  - Use a list picker form cell instead
- Don't use chips when the text of value is very long (even if ≤8 options)
  - Use a list picker form cell instead

---

## Top Tips

Use an **asterisk (*)** next to the chip form cell label to indicate that the input is required.

For broader or less experienced audiences:
- Include note: "Fields marked with an asterisk are required"
- Place at top or bottom of page
- Repeat consistently across the app

---

## Anatomy

### Chip Form Cell

#### A. Label
Describes the intent of the chip form cell.

The label may have an **asterisk (*)** next to it to indicate that the input is required.

#### B. Chips
Displays a list of chips for users to select.

#### C. Helper Text
Provides additional information about the form cell.

---

### Chip

#### A. Container
- Defines the boundary of each chip
- All chip elements wrapped in container
- Width depends on length of content
- Each container is a **touch target**

#### B. Text Label
- Describes what each chip stands for
- Text labels should be **concise**

#### C. Check Mark (✓)
- Appears when chip is selected
- Disappears when chip is deselected
- Pushes text label to the right when appears

---

## Variations

### 1. Single Selection

Single selection chips provide mutually exclusive options.

**Behavior**:
- User taps chip to activate option
- Tapping different chip transfers activation to that option
- **Only one chip** can be selected in a group

**Alternative for**: Radio buttons

**Selection animation**:
1. Check mark (✓) appears in front of text label
2. Text pushed to the right
3. Chip container expands horizontally to accommodate check mark
4. When deselected: check mark disappears, text shifts left, container returns to original size

---

### 2. Multiple Selection

Multiple selection chips allow users to select multiple options from a set.

**Behavior**:
- Each chip toggles between selected and unselected
- **Multiple chips** can be selected simultaneously

**Alternative for**: Checkboxes

**Selection animation**:
1. Check mark (✓) appears in front of text label
2. Text pushed to the right
3. Chip container expands horizontally to accommodate check mark
4. When deselected: check mark disappears, text shifts left, container returns to original size

---

### 3. Chip with Leading Icon

Chips with a leading icon can be used for single and multiple selection.

**Key difference**: When selected, **no check mark will appear**
- Selection indicated by chip style change only (background color, border)

**Use for**:
- Status chips (with status icon)
- Category chips (with category icon)
- Filter chips (with filter icon)

---

### 4. Wrapped Chips

A group of chips is typically displayed horizontally under the title.

**Layout options**:
1. **Horizontal scroll**: Chips overflow to right with horizontal scroll
2. **Wrapped**: More than one row of chips wrapped to next row

**Recommendation**: Choose layout that provides best readability for your use case.

---

## Behavior and Interaction

### Error State

**Use validation message only when necessary**:
- Show error message
- Direct feedback of this control

**Don't**: Distract users with unimportant information

**Page level feedback**: Use snackbar instead

**Validation message**:
- Should be **concise**
- One line of text recommended

**Default**: No validation message

**When triggered**:
- Insert message with padding after last row of chips (before divider line if used)
- Content under it will be pushed down

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Chip Height | 32pt |
| Chip Min Width | 64pt |
| Chip Horizontal Padding | 12pt (unselected), 16pt (selected with checkmark) |
| Chip Vertical Padding | 6pt |
| Corner Radius | 16pt (pill shape) |
| Text Font Size | 14pt |
| Text Font Weight | Medium (500) |
| Icon/Checkmark Size | 16pt × 16pt |
| Icon-Text Gap | 4pt |
| Chip Spacing (horizontal) | 8pt |
| Chip Spacing (vertical) | 8pt |
| Touch Target | 44pt minimum (add padding if needed) |

### Layout Structure (Single Selection)

```
Status
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Received │  │ Pending  │  │ Rejected │
└──────────┘  └──────────┘  └──────────┘

After selection of "Received":
┌────────────────┐  ┌──────────┐  ┌──────────┐
│ ✓ Received     │  │ Pending  │  │ Rejected │
└────────────────┘  └──────────┘  └──────────┘
```

### Layout Structure (Multiple Selection)

```
Items
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Apples   │  │ Oranges  │  │ Bananas  │  │ Grapes   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

After selecting "Apples" and "Bananas":
┌────────────────┐  ┌──────────┐  ┌────────────────┐  ┌──────────┐
│ ✓ Apples       │  │ Oranges  │  │ ✓ Bananas      │  │ Grapes   │
└────────────────┘  └──────────┘  └────────────────┘  └──────────┘
```

### Layout Structure (With Leading Icon)

```
Status
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ●● Full      │  │ ●● Partial   │  │ ●● Empty     │
└──────────────┘  └──────────────┘  └──────────────┘
(green icon)      (orange icon)      (red icon)

After selecting "Full":
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ●● Full      │  │ ●● Partial   │  │ ●● Empty     │
└──────────────┘  └──────────────┘  └──────────────┘
(selected style)  (unselected)      (unselected)
```

### Color Scheme

#### Single/Multiple Selection Chips (No Icon)

| State | Background | Border | Text | Checkmark |
|-------|------------|--------|------|-----------|
| Unselected | #F2F2F7 (light gray) | None | #1D2D3E | None |
| Selected | #f69000 (primary) | None | #FFFFFF | #FFFFFF (✓) |
| Pressed (unselected) | #E5E5E5 | None | #1D2D3E | None |
| Pressed (selected) | #dd8200 (primary-700) | None | #FFFFFF | #FFFFFF (✓) |
| Disabled | #F2F2F7 | None | #7e8e9d @ 50% | None |

#### Chips with Leading Icon

| State | Background | Border | Text | Icon |
|-------|------------|--------|------|------|
| Unselected | Transparent | 1pt #E5E5E5 | #1D2D3E | Icon color |
| Selected | #EBF8FF (blue light) | 1pt #0057D2 (blue) | #0057D2 | Icon color |
| Pressed (unselected) | #F5F6F7 | 1pt #C6C6C8 | #1D2D3E | Icon color |
| Pressed (selected) | #D6EFFF | 1pt #0040B0 | #0040B0 | Icon color |

#### Status Chips (GCS App - Leading Icon)

| Status | Icon | Icon Color | Selected BG | Selected Border |
|--------|------|------------|-------------|-----------------|
| Full (Positive) | ●● | #36A41D (green) | #F5FAE5 | #5DC122 |
| Partial (Critical) | ●● | #E9730C (orange) | #FEF7F1 | #F58B1F |
| Empty (Negative) | ●● | #D32030 (red) | #FFF4F2 | #EE3939 |
| N/A (Neutral) | ●● | #0057D2 (blue) | #EBF8FF | #1B90FF |

### Wrapped vs Horizontal Scroll

#### Wrapped (Recommended for ≤8 chips)
```typescript
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
  {chips.map(chip => <Chip key={chip.id} {...chip} />)}
</View>
```

#### Horizontal Scroll (Recommended for >5 chips)
```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
>
  {chips.map(chip => <Chip key={chip.id} {...chip} />)}
</ScrollView>
```

### GCS App Chip Usage

| Screen | Chip Group | Selection Type | Max Options |
|--------|------------|----------------|-------------|
| Filter (GRN) | Stock Status | Single | 4 (Full/Partial/Empty/All) |
| Filter (GRN) | Date Range | Single | 5 (Today/Week/Month/Year/Custom) |
| Filter (Dispatch) | Status | Multiple | 6 (various statuses) |
| GRN Form Step 2 | Package Type | Single | 6 (Box/Bag/Pallet/etc) |
| Settings | Notification Preferences | Multiple | 8 (various types) |
| Invoice Filter | Financial Year | Single | 5 (FY2021-2025) |

### Error State Implementation

```typescript
const [error, setError] = useState<string | null>(null);

// Validation
const handleSubmit = () => {
  if (selectedChips.length === 0) {
    setError('Please select at least one option');
    return;
  }
  setError(null);
  // Continue...
};

// Render
<ChipFormCell
  label="Status *"
  chips={chipOptions}
  selectedChips={selectedChips}
  onSelect={setSelectedChips}
  error={error}
  helperText={!error && "Select the current status"}
/>
```

### Animation

Chip selection should use spring animation:

```typescript
// Check mark appears
Animated.spring(checkMarkScale, {
  toValue: 1,
  friction: 5,
  tension: 100,
  useNativeDriver: true,
}).start();

// Chip container expands
Animated.spring(chipWidth, {
  toValue: expandedWidth,
  friction: 5,
  tension: 100,
  useNativeDriver: false, // Layout animation
}).start();
```

### Accessibility

- Chip group: `accessibilityRole="radiogroup"` (single selection) or `accessibilityRole="group"` (multiple)
- Chip: `accessibilityRole="radio"` (single) or `accessibilityRole="checkbox"` (multiple)
- Chip state: `accessibilityState={{ checked: isSelected }}`
- Chip label: `accessibilityLabel="[Chip label]"`
- Required field: Include "required" in group accessibility label
- Helper text: Read automatically when group gains focus
- Error text: Announced immediately when error appears

### Component Library Recommendation

For React Native, implement custom chip component or use:
- **react-native-paper** Chip component (Material Design 3)
- Customize to match SAP Fiori specs with theme overrides
