# SAP Fiori Stepper Form Cell - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/inputs-and-selections/stepper-form-cell/

## Intro

A stepper is a control that displays and allows users to incrementally increase or decrease a select value.

---

## Anatomy

### A. Label
Describes the intent or desired value of the stepper form cell.

### B. Helper Text (Optional)
Provides additional information about the stepper form cell.

### C. Stepper Container
Houses the actual stepper component.

### D. +/- Buttons
Segmented control buttons for incremental increases or decreases of the shown value.

### E. Value/Input Field
Indicated tappable area where input values are displayed.

---

## Behavior and Interaction

### Increment/Decrement
A user can tap on the "+" or "-" control buttons to incrementally increase or decrease the shown value in the stepper container.

### Direct Input
A user can also tap on the value/input field to open up the keyboard and enter an exact value.

### States

| State | Description |
|-------|-------------|
| Default | Normal state, buttons enabled |
| Typing | Keyboard open, direct value entry |
| Disabled | Entire stepper is non-interactive |
| Min Reached | "-" button disabled when at minimum value |
| Max Reached | "+" button disabled when at maximum value |

---

## Adaptive Design

Stepper form cells are supported in both compact and regular widths.

On iPad, stepper form cells may be displayed inside a popover modal.

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Cell Min Height | 44pt |
| Label Font Size | 13pt |
| Label Line Height | 18pt |
| Helper Text Font Size | 13pt |
| Value Font Size | 17pt |
| Value Line Height | 22pt |
| Button Size | 32pt × 32pt |
| Button Icon Size | 20pt |
| Value Field Min Width | 60pt |
| Stepper Container Height | 36pt |
| Button Corner Radius | 8pt |
| Container Corner Radius | 8pt |
| Horizontal Padding | 16pt |
| Button-Value Gap | 0pt (connected) |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Label                                                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [-]  │      Value      │  [+]                            ││
│ └──────────────────────────────────────────────────────────┘│
│ Helper text (optional)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Alternative Layout (Inline)

```
┌─────────────────────────────────────────────────────────────┐
│ Label                              [-]  │  Value  │  [+]    │
│ Helper text (optional)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| Element | State | Color |
|---------|-------|-------|
| Label | Default | #1D2D3E |
| Helper Text | Default | #556B82 |
| Value Text | Default | #1D2D3E |
| Value Text | Typing | #1D2D3E |
| Button Background | Default | #F5F6F7 |
| Button Background | Pressed | #E5E5E5 |
| Button Background | Disabled | #F5F6F7 @ 50% |
| Button Icon | Default | #1D2D3E |
| Button Icon | Disabled | #1D2D3E @ 30% |
| Container Border | Default | #E5E5E5 |
| Container Border | Focused | #0057D2 (2pt) |
| Container Background | Default | #FFFFFF |

### Icon Names (MaterialCommunityIcons)

| Button | Icon Name |
|--------|-----------|
| Decrease | `minus` |
| Increase | `plus` |

### Component Implementation

```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface StepperFormCellProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  decimalPlaces?: number;
  prefix?: string;  // e.g., "₹"
  suffix?: string;  // e.g., "%"
  layout?: 'stacked' | 'inline';
}

const StepperFormCell: React.FC<StepperFormCellProps> = ({
  label,
  value,
  onValueChange,
  helperText,
  min = 0,
  max = Infinity,
  step = 1,
  disabled = false,
  decimalPlaces = 0,
  prefix,
  suffix,
  layout = 'stacked',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toFixed(decimalPlaces));
  const inputRef = useRef<TextInput>(null);

  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  const handleDecrement = () => {
    if (canDecrement) {
      const newValue = Math.max(min, value - step);
      onValueChange(Number(newValue.toFixed(decimalPlaces)));
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      const newValue = Math.min(max, value + step);
      onValueChange(Number(newValue.toFixed(decimalPlaces)));
    }
  };

  const handleValuePress = () => {
    if (!disabled) {
      setInputValue(value.toFixed(decimalPlaces));
      setIsEditing(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleInputChange = (text: string) => {
    // Allow empty, numbers, and decimal point
    const sanitized = text.replace(/[^0-9.]/g, '');
    setInputValue(sanitized);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onValueChange(Number(clamped.toFixed(decimalPlaces)));
    }
    Keyboard.dismiss();
  };

  const displayValue = `${prefix || ''}${value.toFixed(decimalPlaces)}${suffix || ''}`;

  const isInline = layout === 'inline';

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={[styles.labelRow, isInline && styles.labelRowInline]}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, disabled && styles.labelDisabled]}>
            {label}
          </Text>
          {helperText && !isInline && (
            <Text style={[styles.helperText, disabled && styles.helperTextDisabled]}>
              {helperText}
            </Text>
          )}
        </View>

        {isInline && (
          <View style={styles.stepperContainerInline}>
            {renderStepper()}
          </View>
        )}
      </View>

      {!isInline && (
        <View style={styles.stepperContainer}>
          {renderStepper()}
        </View>
      )}

      {helperText && isInline && (
        <Text style={[styles.helperText, disabled && styles.helperTextDisabled]}>
          {helperText}
        </Text>
      )}
    </View>
  );

  function renderStepper() {
    return (
      <View style={[styles.stepper, isEditing && styles.stepperFocused]}>
        {/* Decrement Button */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonLeft,
            !canDecrement && styles.buttonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={!canDecrement}
          activeOpacity={0.7}
        >
          <Icon
            name="minus"
            size={20}
            color={canDecrement ? '#1D2D3E' : '#1D2D3E4D'}
          />
        </TouchableOpacity>

        {/* Value Field */}
        <TouchableOpacity
          style={styles.valueContainer}
          onPress={handleValuePress}
          disabled={disabled}
          activeOpacity={0.9}
        >
          {isEditing ? (
            <TextInput
              ref={inputRef}
              style={styles.valueInput}
              value={inputValue}
              onChangeText={handleInputChange}
              onBlur={handleInputBlur}
              keyboardType="decimal-pad"
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleInputBlur}
            />
          ) : (
            <Text style={[styles.valueText, disabled && styles.valueTextDisabled]}>
              {displayValue}
            </Text>
          )}
        </TouchableOpacity>

        {/* Increment Button */}
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonRight,
            !canIncrement && styles.buttonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={!canIncrement}
          activeOpacity={0.7}
        >
          <Icon
            name="plus"
            size={20}
            color={canIncrement ? '#1D2D3E' : '#1D2D3E4D'}
          />
        </TouchableOpacity>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  labelRow: {
    marginBottom: 8,
  },
  labelRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D2D3E',
    lineHeight: 18,
  },
  labelDisabled: {
    color: '#556B82',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#556B82',
    lineHeight: 18,
    marginTop: 4,
  },
  helperTextDisabled: {
    color: '#556B82',
  },
  stepperContainer: {
    alignItems: 'flex-start',
  },
  stepperContainerInline: {
    marginLeft: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  stepperFocused: {
    borderColor: '#0057D2',
    borderWidth: 2,
  },
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F7',
  },
  buttonLeft: {
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  buttonRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5E5',
  },
  buttonDisabled: {
    backgroundColor: '#F5F6F7',
  },
  valueContainer: {
    minWidth: 80,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  valueText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D2D3E',
    lineHeight: 22,
    textAlign: 'center',
  },
  valueTextDisabled: {
    color: '#556B82',
  },
  valueInput: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D2D3E',
    textAlign: 'center',
    minWidth: 60,
    padding: 0,
  },
});

export default StepperFormCell;
```

### GCS App Usage Examples

#### Invoice Item Pricing
```typescript
// Storage Charge (currency with decimals)
<StepperFormCell
  label="Storage Charge"
  value={charge}
  onValueChange={setCharge}
  min={0}
  max={10000}
  step={0.5}
  decimalPlaces={2}
  prefix="₹"
  suffix="/unit/month"
  helperText="Rate per unit per month"
/>

// Labour Rate
<StepperFormCell
  label="Labour Rate"
  value={labourRate}
  onValueChange={setLabourRate}
  min={0}
  max={1000}
  step={0.5}
  decimalPlaces={2}
  prefix="₹"
  suffix="/unit"
/>

// Tax Percentage
<StepperFormCell
  label="Tax"
  value={tax}
  onValueChange={setTax}
  min={0}
  max={100}
  step={1}
  decimalPlaces={0}
  suffix="%"
  helperText="GST percentage"
/>
```

#### Quantity Stepper (Inline Layout)
```typescript
<StepperFormCell
  label="Quantity"
  value={quantity}
  onValueChange={setQuantity}
  min={1}
  max={1000}
  step={1}
  layout="inline"
/>
```

#### Duration (Read-only Display)
```typescript
<StepperFormCell
  label="Duration"
  value={duration}
  onValueChange={() => {}}
  disabled
  suffix=" months"
  helperText="Auto-calculated from dispatch date"
/>
```

### Compact Stepper (Icon Only Buttons)

For space-constrained layouts:

```typescript
const CompactStepper: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ value, onChange, min = 0, max = Infinity, step = 1 }) => {
  return (
    <View style={compactStyles.container}>
      <TouchableOpacity
        style={compactStyles.button}
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        <Icon name="minus" size={16} color={value > min ? '#1D2D3E' : '#1D2D3E4D'} />
      </TouchableOpacity>
      <Text style={compactStyles.value}>{value}</Text>
      <TouchableOpacity
        style={compactStyles.button}
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        <Icon name="plus" size={16} color={value < max ? '#1D2D3E' : '#1D2D3E4D'} />
      </TouchableOpacity>
    </View>
  );
};

const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F7',
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#1D2D3E',
    paddingHorizontal: 8,
  },
});
```

### Accessibility

- Stepper container: `accessibilityRole="adjustable"`
- Decrement button: `accessibilityLabel="Decrease [label]"`, `accessibilityHint="Decreases value by [step]"`
- Increment button: `accessibilityLabel="Increase [label]"`, `accessibilityHint="Increases value by [step]"`
- Value field: `accessibilityLabel="[label], [value]"`, `accessibilityHint="Double tap to edit directly"`
- Announce value changes: `accessibilityLiveRegion="polite"`
- Disabled state: `accessibilityState={{ disabled: true }}`
- Min/max reached: Announce when limit is reached

### Best Practices

1. **Step Size**: Choose appropriate step size for the use case (1 for integers, 0.5 or 0.01 for currency)
2. **Min/Max Limits**: Always set reasonable limits to prevent invalid values
3. **Visual Feedback**: Disable buttons when limits are reached
4. **Direct Input**: Allow direct keyboard entry for precise values
5. **Formatting**: Use prefix/suffix for currency symbols and units
6. **Decimal Places**: Match decimal places to the data type (2 for currency, 0 for integers)
7. **Haptic Feedback**: Consider adding subtle haptic on increment/decrement
8. **Long Press**: Consider implementing long press for continuous increment/decrement

### Haptic Feedback (Optional)

```typescript
import { Vibration } from 'react-native';

const handleIncrement = () => {
  if (canIncrement) {
    Vibration.vibrate(10); // Light haptic
    const newValue = Math.min(max, value + step);
    onValueChange(Number(newValue.toFixed(decimalPlaces)));
  }
};
```
