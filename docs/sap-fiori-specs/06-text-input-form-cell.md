# SAP Fiori Text Input Form Cell - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/table-view-cells/simple-property-form-cell/

## Intro

Text input controls are used to request a text entry from the user. They are usually found in the create or edit pattern.

## Usage

### Do
- Use **capital case** for labels
- Use an **asterisk (*)** next to the label to indicate required input
- Use **sentence case** for:
  - Placeholder text
  - Helper text
  - Error messages
- Use note form cells for text input that requires more text input
- Error message should tell the user clearly how to fix the error

### Don't
- Don't show both helper text and error text at the same time

---

## Anatomy

### A. Label
Describes the intent of the text input form cell.

**Format**: Capital Case (e.g., "Customer Name", "GRN Number")

### B. Input Area
Indicates tappable area where input values are displayed.

### C. Helper Text
Provides additional information about the form cell.

**Special case**: If the cell is read-only, display **"Read-only field"** as hint text.

### D. Right Accessory Icon (Optional)
In certain use cases, provides additional input methods:
- Barcode scanner
- Password visibility toggle
- Other secondary actions

### E. Character Counter (Optional)
Displays the number of input characters in real-time over the total character limit.

**Format**: "45/100" or "45 of 100 characters"

---

## Variations

### 1. Simple Property Form Cell
Consists of:
- **Label** (property key) - required
- **Text field** (user input text)

**Use for**: Collecting short input

**Purpose**: Label helps users identify the purpose of text entry

### 2. Simple Property Form Cell with Scan
A secondary action added to provide input methods besides typing.

**Supported actions**:
- Barcode scan
- QR code scan

**Behavior**:
1. Scanner launches when user taps scan icon
2. User scans barcode or QR code
3. Value is filled in the form cell
4. User may edit the value directly if needed

**Helper text**: Can explain the scan feature to user

### 3. Simple Property Form Cell with Show/Hide Password
For password entry, special secondary action is added.

**Default behavior**:
- Password entry displayed in encrypted format (••••••)

**Toggle action**:
- User taps eye icon to toggle password visibility
- Eye icon changes to eye-off when password is visible

### 4. Note Form Cell
Best used for collecting long user input:
- Notes
- Comments
- Descriptions

**Key difference**: Taller text field compared to simple property form cell

---

## Behavior and Interaction

### States

#### 1. Enabled State (Default)

**Simple Property Form Cell**:
- Optional placeholder text shows correct input value when field is empty
- Placeholder explicitly shows expected text entry
- **Don't use placeholder text for instructions** (it disappears when typing)
- Use helper text for instructions instead
- Helper text should be short and precise
- Avoid wrapping to two lines

**Note Form Cell**:
- Default state has taller text field
- Encourages users to enter more input

#### 2. Error State

When user-entered value does not pass validation:
- Error icon appears indicating cell has error
- Error message appears below text input
- Error message provides instructions on how to fix error
- **Important**: DO NOT display both helper text and error message
- Replace helper text with error message when in error state

**Visual indicators**:
- Red border around input field
- Red error icon (!) on right
- Red error text below field

#### 3. Active Typing State

When user is actively typing:
- **Clear icon (×)** appears at right end of text field
- User can tap "Clear" icon to delete all input

**Simple Property Form Cell**:
- Height of field is **fixed**
- Text **overflows to the left** if user types more than one line
- Used for short user inputs

**Note Form Cell**:
- Text field can display **3 lines** of text initially
- As user keeps typing, field expands to maximum of **6 lines**
- Prevents note form cell from covering whole screen
- After reaching maximum height, cell stops expanding
- Content scrolls vertically inside text field area

#### 4. Read-Only State

Indicates current user role does not have authorization to edit field.

**Visual indicators**:
- Text field changes to **gray background**
- Helper text below says **"Read-only field"**
- Non-interactive appearance

**User capabilities**:
- Can **select and copy** existing value text
- **Cannot activate** the text field
- **Cannot edit** the text

**Height behavior**:
- Text field can expand to exceed maximum height
- Ensures text value is visible without scrolling inside field

#### 5. Disabled State

If text input form cell is disabled:
- Input in field (if any) does not affect user's task
- Disabled cell has **opacity of 50%** to reduce distraction
- User cannot interact with field at all

---

## Character Counter

### Option 1: Allow user to continue typing over character maximum

**Behavior**:
1. User can continue typing over character limit
2. Component displays error once input surpasses limit
3. Real-time counter **turns red**
4. Helper text appears or changes to **"Reduce the number of characters"**
5. Error state persists until user's input is shortened to within limit

**Example**: "152/100" (red text)

### Option 2: Stop user from typing once character maximum is met

**Behavior**:
1. User is restricted from typing over character limit
2. User's input is automatically stopped at limit
3. Helper text appears or changes to **"Character limit reached"**

**Example**: "100/100" (normal color, input blocked)

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Label Font Size | 13pt |
| Label Line Height | 18pt |
| Input Font Size | 17pt (iOS default) |
| Input Line Height | 22pt |
| Helper/Error Text Font | 13pt |
| Helper/Error Line Height | 18pt |
| Simple Cell Min Height | 44pt |
| Note Cell Default Height | 88pt (3 lines) |
| Note Cell Max Height | 176pt (6 lines) |
| Input Padding | 12pt horizontal, 8pt vertical |
| Icon Size | 20pt × 20pt |

### Layout Structure (Simple Property Form Cell)

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Name *                                    [Scan 📷] │
│ ┌─────────────────────────────────────────────────────┐ [×] │
│ │ Enter customer name...                              │     │
│ └─────────────────────────────────────────────────────┘     │
│ Helper text goes here                          45/100       │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Note Form Cell)

```
┌─────────────────────────────────────────────────────────────┐
│ Notes                                                        │
│ ┌─────────────────────────────────────────────────────┐ [×] │
│ │ Enter notes or comments...                          │     │
│ │                                                      │     │
│ │                                                      │     │
│ └─────────────────────────────────────────────────────┘     │
│ Helper text goes here                          120/500      │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| State | Label Color | Input BG | Input Border | Input Text | Helper Text | Icon Color |
|-------|-------------|----------|--------------|------------|-------------|------------|
| Enabled | #1D2D3E | #FFFFFF | #E5E5E5 (1pt) | #1D2D3E | #556B82 | #7e8e9d |
| Active | #1D2D3E | #FFFFFF | #0057D2 (2pt) | #1D2D3E | #556B82 | #7e8e9d |
| Error | #D32030 | #FFFFFF | #D32030 (2pt) | #1D2D3E | #D32030 | #D32030 |
| Read-Only | #556B82 | #F2F2F7 | None | #1D2D3E | #556B82 | #7e8e9d |
| Disabled | #556B82 | #FFFFFF | #E5E5E5 | #556B82 | #556B82 | #7e8e9d |
| Disabled (opacity) | 50% | 50% | 50% | 50% | 50% | 50% |

### GCS App Text Input Usage

| Screen | Field | Type | Max Chars | Required | Scan |
|--------|-------|------|-----------|----------|------|
| GRN Form Step 1 | Customer | Autocomplete | - | Yes | No |
| GRN Form Step 1 | Sender | Autocomplete | - | Yes | No |
| GRN Form Step 1 | Supervisor | Autocomplete | - | No | No |
| GRN Form Step 1 | Truck Registration | Simple | 20 | No | No |
| GRN Form Step 1 | Notes | Note | 500 | No | No |
| GRN Form Step 2 | Item Name | Autocomplete | - | Yes | Yes (barcode) |
| GRN Form Step 2 | Quantity | Numeric | 10 | Yes | No |
| GRN Form Step 2 | Weight | Numeric | 10 | Yes | No |
| GRN Form Step 2 | Rack | Simple | 20 | No | No |
| GRN Form Step 2 | Package Mark | Simple | 50 | No | No |
| Dispatch Form | Similar pattern | - | - | - | - |
| Invoice Form | Similar pattern | - | - | - | - |
| Settings | User Name | Simple | 50 | Yes | No |
| Settings | Phone | Simple | 15 | Yes | No |

### Validation Patterns

```typescript
// Required field validation
const validateRequired = (value: string, fieldName: string) => {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
};

// Character limit validation (soft limit)
const validateCharLimit = (value: string, limit: number) => {
  if (value.length > limit) {
    return `Reduce the number of characters`;
  }
  return null;
};

// Character limit validation (hard limit)
const enforceCharLimit = (value: string, limit: number) => {
  return value.slice(0, limit);
};
```

### Barcode Scanner Integration

```typescript
const handleScan = async () => {
  const { status } = await BarCodeScanner.requestPermissionsAsync();
  if (status === 'granted') {
    setShowScanner(true);
  }
};

const handleBarCodeScanned = ({ data }) => {
  setFieldValue('itemCode', data);
  setShowScanner(false);
};
```

### Accessibility

- Label: `accessibilityLabel="[Field name], [required/optional]"`
- Input: `accessibilityHint="Enter [field name]"`
- Helper text: Read automatically when field gains focus
- Error text: Announced immediately when error appears
- Clear button: `accessibilityLabel="Clear [field name]"`
- Scan button: `accessibilityLabel="Scan barcode for [field name]"`
- Password toggle: `accessibilityLabel="Show/Hide password"`
