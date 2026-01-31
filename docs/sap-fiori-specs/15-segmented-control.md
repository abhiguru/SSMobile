# SAP Fiori Segmented Control - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/inputs-and-selections/segmented-control/

## Intro

A segmented control form cell allows a user to quickly select from a small set of values. It is typically used in:
- Create pattern
- Edit pattern
- Occasionally in filter pattern

**When to use alternatives**: If value label is too long or there are more than three values, use:
- List picker
- Filter form cell

---

## Usage

### Do
- Use segmented control form cell when value texts are **short and concise**

### Don't
- Do not use if values are long and need to be truncated
  - Use list picker or filter form cell instead

---

## Anatomy

### A. Label
Describes the intent of the selection.

**Format**: Capital Case

### B. Buttons
May be in selected state or unselected state with a tap.

**Recommendation**: **Highly recommended** to have a default selection
- Indicates to user that buttons are tappable

---

## Adaptive Design

### Regular Width (iPad)
Segmented control form cell may be displayed in:
- Form sheet
- Popover
- Full screen modal

---

## Variations

### 1. Single-Line Buttons

Buttons displayed in a single line with the form cell label.

**Selection types available**:
- Single selection
- Multi-selection

**Use when**: Values are short

**Avoid**: If values are long (use stacked variation instead of truncation)

---

### 2. Stacked Buttons

Buttons displayed underneath the form cell label.

**Selection types available**:
- Single selection
- Multi-selection

**Use when**: Values are too long for single-line variation

---

### 3. Single-Line Segmented

Displays a segmented control with form cell label in a single line.

**Selection type**: Single selection only
- Values are **mutually exclusive**

---

### 4. Stacked Segmented

Displays a segmented control underneath a form cell label.

**Selection type**: Single selection only
- Values are **mutually exclusive**

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Cell Height (single-line) | 44pt |
| Cell Height (stacked) | 72pt minimum |
| Label Font Size | 13pt |
| Label Font Weight | Regular (400) |
| Button Height | 32pt |
| Button Min Width | 64pt |
| Button Font Size | 14pt |
| Button Horizontal Padding | 12pt |
| Segment Height | 32pt |
| Segment Min Width | 64pt |
| Segment Font Size | 14pt |
| Spacing Between Buttons | 8pt |
| Label-Control Gap | 12pt (stacked) |

### Layout Structure (Single-Line Buttons)

```
┌─────────────────────────────────────────────────────────────┐
│ Priority        [Low]    [Medium]    [High]                 │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Stacked Buttons)

```
┌─────────────────────────────────────────────────────────────┐
│ Status                                                       │
│ [Pending]    [In Progress]    [Completed]                   │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Single-Line Segmented)

```
┌─────────────────────────────────────────────────────────────┐
│ View Mode    ┌────────┬────────┬────────┐                   │
│              │  List  │  Grid  │  Map   │                   │
│              └────────┴────────┴────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Stacked Segmented)

```
┌─────────────────────────────────────────────────────────────┐
│ Stock Status                                                 │
│ ┌────────────┬────────────┬────────────┐                   │
│ │    Full    │  Partial   │   Empty    │                   │
│ └────────────┴────────────┴────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

#### Buttons (Single/Multi Selection)

| State | Background | Border | Text |
|-------|------------|--------|------|
| Unselected | Transparent | 1pt #E5E5E5 | #1D2D3E |
| Selected | #f69000 (primary) | None | #FFFFFF |
| Pressed (unselected) | #F5F6F7 | 1pt #C6C6C8 | #1D2D3E |
| Pressed (selected) | #dd8200 (primary-700) | None | #FFFFFF |
| Disabled | Transparent | 1pt #E5E5E5 @ 50% | #7e8e9d @ 50% |

#### Segmented Control (Single Selection Only)

| State | Background | Border | Text |
|-------|------------|--------|------|
| Segment Unselected | Transparent | None | #1D2D3E |
| Segment Selected | #FFFFFF | None | #f69000 |
| Container Background | #F2F2F7 | None | - |
| Container Border | 1pt #E5E5E5 | - | - |
| Pressed | #E5E5E5 | None | #1D2D3E |

### GCS App Segmented Control Usage

#### GRN Form

**1. Stock Status Filter (Single-Line Segmented)**
```typescript
Label: "Stock Status"
Options: ["All", "Full", "Partial", "Empty"]
Type: Single selection
Default: "All"
```

**2. Item Type (Stacked Buttons - Multi-selection)**
```typescript
Label: "Item Type"
Options: ["Frozen", "Chilled", "Dry"]
Type: Multi-selection
Default: All selected
```

**3. Priority (Single-Line Buttons)**
```typescript
Label: "Priority"
Options: ["Low", "Medium", "High"]
Type: Single selection
Default: "Medium"
```

#### Dispatch Form

**1. Transport Mode (Single-Line Segmented)**
```typescript
Label: "Transport Mode"
Options: ["Truck", "Van", "Pickup"]
Type: Single selection
Default: "Truck"
```

**2. Temperature Control (Stacked Buttons)**
```typescript
Label: "Temperature Control"
Options: ["Frozen (-18°C)", "Chilled (0-4°C)", "Ambient"]
Type: Single selection
Default: "Frozen (-18°C)"
```

#### Invoice Form

**1. Payment Terms (Single-Line Segmented)**
```typescript
Label: "Payment Terms"
Options: ["Cash", "Credit", "UPI"]
Type: Single selection
Default: "Credit"
```

#### Settings

**1. Notification Preferences (Stacked Buttons - Multi)**
```typescript
Label: "Notifications"
Options: ["GRN Updates", "Dispatch Alerts", "Invoice Reminders"]
Type: Multi-selection
Default: All selected
```

**2. Theme (Single-Line Segmented)**
```typescript
Label: "Theme"
Options: ["Light", "Dark", "Auto"]
Type: Single selection
Default: "Auto"
```

### Component Implementation

#### Segmented Control (Single Selection)

```typescript
import { SegmentedButtons } from 'react-native-paper';

interface SegmentedControlProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  stacked?: boolean;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  label,
  value,
  onValueChange,
  options,
  stacked = false,
}) => {
  return (
    <View style={[styles.container, stacked && styles.stacked]}>
      <Text style={styles.label}>{label}</Text>
      <SegmentedButtons
        value={value}
        onValueChange={onValueChange}
        buttons={options.map(opt => ({
          value: opt.value,
          label: opt.label,
        }))}
        style={stacked && styles.stackedControl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 72,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D2D3E',
    marginRight: 12,
  },
  stackedControl: {
    marginTop: 8,
  },
});
```

#### Button Group (Multi-Selection)

```typescript
interface ButtonGroupProps {
  label: string;
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  multiSelect?: boolean;
  stacked?: boolean;
}

const ButtonGroup: React.FC<ButtonGroupProps> = ({
  label,
  selectedValues,
  onSelectionChange,
  options,
  multiSelect = false,
  stacked = false,
}) => {
  const handlePress = (value: string) => {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onSelectionChange(selectedValues.filter(v => v !== value));
      } else {
        onSelectionChange([...selectedValues, value]);
      }
    } else {
      onSelectionChange([value]);
    }
  };

  return (
    <View style={[styles.container, stacked && styles.stacked]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.buttonContainer}>
        {options.map(option => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <Button
              key={option.value}
              mode={isSelected ? 'contained' : 'outlined'}
              onPress={() => handlePress(option.value)}
              style={styles.button}
              buttonColor={isSelected ? colors.primary : 'transparent'}
              textColor={isSelected ? '#FFFFFF' : '#1D2D3E'}
            >
              {option.label}
            </Button>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 72,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D2D3E',
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    minWidth: 64,
    height: 32,
  },
});
```

### Usage Examples

#### Single Selection Segmented
```typescript
const [stockStatus, setStockStatus] = useState('all');

<SegmentedControl
  label="Stock Status"
  value={stockStatus}
  onValueChange={setStockStatus}
  options={[
    { value: 'all', label: 'All' },
    { value: 'full', label: 'Full' },
    { value: 'partial', label: 'Partial' },
    { value: 'empty', label: 'Empty' },
  ]}
/>
```

#### Multi-Selection Buttons
```typescript
const [selectedTypes, setSelectedTypes] = useState(['frozen', 'chilled']);

<ButtonGroup
  label="Item Type"
  selectedValues={selectedTypes}
  onSelectionChange={setSelectedTypes}
  multiSelect
  stacked
  options={[
    { value: 'frozen', label: 'Frozen' },
    { value: 'chilled', label: 'Chilled' },
    { value: 'dry', label: 'Dry' },
  ]}
/>
```

#### Stacked Segmented
```typescript
const [viewMode, setViewMode] = useState('list');

<SegmentedControl
  label="View Mode"
  value={viewMode}
  onValueChange={setViewMode}
  stacked
  options={[
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
    { value: 'map', label: 'Map' },
  ]}
/>
```

### Accessibility

- Segmented control: `accessibilityRole="radiogroup"`
- Individual segment: `accessibilityRole="radio"`
- Segment state: `accessibilityState={{ selected: isSelected }}`
- Button group (multi): `accessibilityRole="group"`
- Individual button: `accessibilityRole="checkbox"` (if multi) or `accessibilityRole="radio"` (if single)
- Label: Read as part of group accessibility label

### Best Practices

1. **Number of Options**:
   - Recommended: 2-4 options
   - Maximum: 5 options (use list picker if more)

2. **Label Length**:
   - Keep segment labels short (1-2 words)
   - Use stacked variation if labels are long
   - Never truncate labels

3. **Default Selection**:
   - Always provide a default selection
   - Indicates interactivity to users

4. **Selection Type**:
   - Use segmented control for mutually exclusive options (single)
   - Use button group for multiple selections allowed

5. **Layout**:
   - Use single-line for short labels and few options
   - Use stacked for longer labels or when space is limited

6. **Consistency**:
   - Use same control type for similar selections throughout app

7. **Feedback**:
   - Provide immediate visual feedback on selection
   - Use haptic feedback on selection (optional)

### When to Use Alternatives

| Scenario | Use Instead |
|----------|-------------|
| > 5 options | List picker form cell |
| Long option labels | List picker form cell |
| Complex options | Filter form cell |
| Need search | Autocomplete bottom sheet |
| Hierarchical options | List picker with sections |
