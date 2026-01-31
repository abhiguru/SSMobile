# SAP Fiori Key Value Table View Cell - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/table-view-cells/key-value-table-view-cell/

## Intro

The key value table view cell is an uneditable table view cell that fits inside the table view container. It is ideal for displaying simple sets of data or information to the user.

## Usage

### Do
- Use a key value cell to display simple sets of data or information

### Don't
- Don't use a key value cell as an editable field (i.e., text inputs)

### Top Tips
- Display a key label alongside a value, not with an image
- Convey uneditable information to a user

---

## Anatomy

### A. Key Label
A descriptive label.

### B. Value
The data for a particular label.

---

## Behavior and Interaction

### Text Wrapping
The value text may wrap as needed to display all the information.

### Actionable Value
By default, a key value table view cell is read-only, preventing user edits or interactions. However, in certain use cases, a value may be actionable.

Actionable values have a specific action associated with the text. For example:
- A phone number may open the native keypad
- An address may open the maps application

**Styling for actionable values:**
- Value text color: **Tint color** (primary)
- Text weight: **Semibold**
- Still uneditable (read-only)

---

## Adaptive Design

Key value table view cells may be used in:
- Compact width
- Regular width
- Regular-readable width
- Regular full-width

Regular width may also be used in an optional **two-column display**.

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Cell Min Height | 44pt |
| Key Label Font Size | 13pt |
| Key Label Line Height | 18pt |
| Value Font Size | 17pt (iOS default) |
| Value Line Height | 22pt |
| Horizontal Padding | 16pt |
| Vertical Padding | 11pt |
| Key-Value Gap | 4pt (stacked) or 8pt (inline) |

### Layout Variations

#### 1. Stacked Layout (Compact Width)
Key label above value, full width.

```
┌─────────────────────────────────────────────────────────────┐
│ Key Label                                                    │
│ Value text that may wrap to multiple lines                   │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Inline Layout (Regular Width)
Key label and value on same row.

```
┌─────────────────────────────────────────────────────────────┐
│ Key Label                                    Value Text      │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Two-Column Layout (Regular Width)
Multiple key-value pairs in columns.

```
┌─────────────────────────────────────────────────────────────┐
│ Key Label 1              Value 1  │  Key Label 2    Value 2 │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| Element | Color |
|---------|-------|
| Key Label | #556B82 (secondary text) |
| Value (Default) | #1D2D3E (primary text) |
| Value (Actionable) | #f69000 (tint/primary) |
| Background | #FFFFFF |
| Divider | #E5E5E5 |

### Typography

| Element | Font Size | Font Weight | Color |
|---------|-----------|-------------|-------|
| Key Label | 13pt | Regular (400) | #556B82 |
| Value (Default) | 17pt | Regular (400) | #1D2D3E |
| Value (Actionable) | 17pt | Semibold (600) | #f69000 |
| Value (Emphasized) | 17pt | Semibold (600) | #1D2D3E |

### Component Implementation

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

interface KeyValueCellProps {
  keyLabel: string;
  value: string | number;
  layout?: 'stacked' | 'inline';
  actionable?: boolean;
  onPress?: () => void;
  emphasized?: boolean;
  valuePrefix?: string;  // e.g., "₹" for currency
  valueSuffix?: string;  // e.g., "%" for percentage
}

const KeyValueCell: React.FC<KeyValueCellProps> = ({
  keyLabel,
  value,
  layout = 'inline',
  actionable = false,
  onPress,
  emphasized = false,
  valuePrefix,
  valueSuffix,
}) => {
  const isStacked = layout === 'stacked';

  const formattedValue = `${valuePrefix || ''}${value}${valueSuffix || ''}`;

  const ValueComponent = actionable ? TouchableOpacity : View;

  return (
    <View style={[styles.container, isStacked && styles.containerStacked]}>
      <Text style={styles.keyLabel}>{keyLabel}</Text>
      <ValueComponent
        onPress={actionable ? onPress : undefined}
        style={isStacked ? styles.valueContainerStacked : styles.valueContainer}
      >
        <Text style={[
          styles.value,
          actionable && styles.valueActionable,
          emphasized && styles.valueEmphasized,
        ]}>
          {formattedValue}
        </Text>
      </ValueComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  containerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: '#556B82',
    lineHeight: 18,
  },
  valueContainer: {
    flexShrink: 1,
    marginLeft: 8,
  },
  valueContainerStacked: {
    marginTop: 4,
    marginLeft: 0,
  },
  value: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D2D3E',
    lineHeight: 22,
    textAlign: 'right',
  },
  valueActionable: {
    color: '#f69000',
    fontWeight: '600',
  },
  valueEmphasized: {
    fontWeight: '600',
  },
});

export default KeyValueCell;
```

### GCS App Usage Examples

#### Invoice Calculation Summary
```typescript
<KeyValueCell keyLabel="Storage Amount" value={storageAmount} valuePrefix="₹" />
<KeyValueCell keyLabel="Labour Amount" value={labourAmount} valuePrefix="₹" />
<KeyValueCell keyLabel="Tax Amount" value={taxAmount} valuePrefix="₹" />
<Divider />
<KeyValueCell keyLabel="Grand Total" value={total} valuePrefix="₹" emphasized />
```

#### Invoice Item Details (Stacked)
```typescript
<KeyValueCell keyLabel="Duration" value={`${duration} months`} layout="stacked" />
<KeyValueCell keyLabel="Storage Charge" value={charge} valuePrefix="₹" valueSuffix="/unit/month" layout="stacked" />
```

#### Actionable Values
```typescript
// Phone number - opens dialer
<KeyValueCell
  keyLabel="Customer Phone"
  value="+91 98765 43210"
  actionable
  onPress={() => Linking.openURL('tel:+919876543210')}
/>

// Email - opens email app
<KeyValueCell
  keyLabel="Email"
  value="customer@example.com"
  actionable
  onPress={() => Linking.openURL('mailto:customer@example.com')}
/>
```

### Key-Value Group Component

For displaying multiple key-value pairs in a card:

```typescript
interface KeyValueGroupProps {
  items: Array<{
    key: string;
    value: string | number;
    emphasized?: boolean;
    actionable?: boolean;
    onPress?: () => void;
  }>;
  showDividers?: boolean;
}

const KeyValueGroup: React.FC<KeyValueGroupProps> = ({ items, showDividers = true }) => {
  return (
    <View style={groupStyles.container}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <KeyValueCell
            keyLabel={item.key}
            value={item.value}
            emphasized={item.emphasized}
            actionable={item.actionable}
            onPress={item.onPress}
          />
          {showDividers && index < items.length - 1 && (
            <View style={groupStyles.divider} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const groupStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginLeft: 16,
  },
});
```

### Accessibility

- Key label: `accessibilityLabel="[Key]: [Value]"`
- Actionable value: `accessibilityRole="link"` or `accessibilityRole="button"`
- Actionable value: `accessibilityHint="Tap to [action]"`
- Read-only indication: Screen reader announces as static text

### Best Practices

1. **Consistent Layout**: Use the same layout (stacked or inline) within a group
2. **Alignment**: Right-align values in inline layout for easy scanning
3. **Currency/Units**: Use valuePrefix/valueSuffix for consistent formatting
4. **Emphasized Values**: Use for totals, important figures
5. **Actionable Values**: Only make values actionable when there's a clear action
6. **Grouping**: Group related key-value pairs in cards with dividers
7. **Text Wrapping**: Allow value text to wrap for long content in stacked layout
