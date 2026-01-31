# SAP Fiori Inline Validation - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/inputs-and-selections/inline-validation/

## Intro

Inline validation provides static information to a user or provides temporary feedback in response to a user's input and is commonly used with form cells in forms. Inline validation should be placed underneath the relevant form cell and may display:
- Hint text
- Success message
- Warning message
- Error message

---

## Anatomy

Composed of an icon and message, inline validation is located directly underneath the relevant input field. The color corresponds to the variation of inline validation.

### A. Icon
Provides a visually accessible cue to the user when user action is required or form feedback is important.

**Note**: Helper text variation does not have an icon.

### B. Text
Provides a succinct and clear message to the user. The message may wrap to a maximum of **three lines** in certain use cases, but we recommend limiting the message to **one line**.

---

## Behavior and Interaction

Depending on the variation and use case, inline validation may persist or disappear.

### Persistence Rules

| Variation | Behavior |
|-----------|----------|
| Helper Text | **Persists** - provides contextual information |
| Success Message | **Temporary** - appears in response to user interaction, may disappear |
| Warning Message | **Temporary** - appears in response to user interaction, may disappear |
| Error Message | **Temporary** - disappears once error is corrected |

### Error Handling
- Error messages appear in response to user interaction
- Error messages disappear once the error has been corrected
- In certain use cases, error messages may be used with a **page-level error banner**
- If there are **critical errors**, user may be required to correct them before proceeding
- Once an error is resolved, the error message **reverts back to helper text**

---

## Variations

### 1. Helper Text
Use helper text to convey contextual information to the user.

**Characteristics:**
- No icon
- Persists (does not disappear)
- Reverts back after success/warning/error messages clear

**Examples:**
- "Enter your email address"
- "Format: DD/MM/YYYY"
- "Auto-calculated from invoice date"
- "Read-only field"

### 2. Success Message
Use a success message to provide temporary feedback in response to a user's input.

**Characteristics:**
- Green checkmark icon
- Temporary display
- Confirms valid input

**Examples:**
- "Email address is valid"
- "Password meets requirements"
- "Value saved successfully"

### 3. Warning Message
Use a warning message to provide temporary feedback when user should be aware of something.

**Characteristics:**
- Orange/yellow warning triangle icon
- Temporary display
- Non-blocking (user can proceed)

**Examples:**
- "This value is unusually high"
- "GRN has been changed"
- "Discount exceeds 20%"

### 4. Error Message
Use an error message when user action is required for correction.

**Characteristics:**
- Red error icon (circle with exclamation)
- Temporary display (clears when fixed)
- Blocking for critical errors
- Provides information about error and how to correct it

**Examples:**
- "This field is required"
- "Invalid phone number format"
- "Discount cannot exceed total amount"
- "Reduce the number of characters"

---

## Adaptive Design

Inline validation is available in compact and all regular widths. It adapts to the container with the related form cell.

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Icon Size | 16pt × 16pt |
| Text Font Size | 13pt |
| Text Line Height | 18pt |
| Icon-Text Gap | 4pt |
| Top Margin (from input) | 4pt |
| Max Lines | 3 (recommended: 1) |

### Color Scheme

| Variation | Icon Color | Text Color | Background |
|-----------|------------|------------|------------|
| Helper | None | #556B82 | None |
| Success | #36A41D | #36A41D | None |
| Warning | #E9730C | #E9730C | None |
| Error | #D32030 | #D32030 | None |

### Icon Names (MaterialCommunityIcons)

| Variation | Icon Name |
|-----------|-----------|
| Helper | (none) |
| Success | `check-circle` |
| Warning | `alert` |
| Error | `alert-circle` |

### Component Implementation

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type ValidationVariant = 'helper' | 'success' | 'warning' | 'error';

interface InlineValidationProps {
  message: string;
  variant?: ValidationVariant;
  visible?: boolean;
}

const VARIANT_CONFIG = {
  helper: {
    icon: null,
    color: '#556B82',
  },
  success: {
    icon: 'check-circle',
    color: '#36A41D',
  },
  warning: {
    icon: 'alert',
    color: '#E9730C',
  },
  error: {
    icon: 'alert-circle',
    color: '#D32030',
  },
};

const InlineValidation: React.FC<InlineValidationProps> = ({
  message,
  variant = 'helper',
  visible = true,
}) => {
  if (!visible || !message) return null;

  const config = VARIANT_CONFIG[variant];

  return (
    <View style={styles.container}>
      {config.icon && (
        <Icon
          name={config.icon}
          size={16}
          color={config.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[styles.text, { color: config.color }]}
        numberOfLines={3}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 0,
  },
  icon: {
    marginRight: 4,
    marginTop: 1, // Align with first line of text
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
});

export default InlineValidation;
```

### Form Cell with Inline Validation

```typescript
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import InlineValidation from './InlineValidation';

interface FormCellProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  helperText?: string;
  error?: string;
  warning?: string;
  success?: string;
  placeholder?: string;
}

const FormCell: React.FC<FormCellProps> = ({
  label,
  value,
  onChangeText,
  required = false,
  helperText,
  error,
  warning,
  success,
  placeholder,
}) => {
  // Determine which validation message to show (priority: error > warning > success > helper)
  const getValidationState = () => {
    if (error) return { variant: 'error' as const, message: error };
    if (warning) return { variant: 'warning' as const, message: warning };
    if (success) return { variant: 'success' as const, message: success };
    if (helperText) return { variant: 'helper' as const, message: helperText };
    return null;
  };

  const validation = getValidationState();
  const hasError = !!error;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, hasError && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#556B82"
      />
      {validation && (
        <InlineValidation
          message={validation.message}
          variant={validation.variant}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1D2D3E',
    marginBottom: 6,
    lineHeight: 18,
  },
  required: {
    color: '#D32030',
  },
  input: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 17,
    color: '#1D2D3E',
  },
  inputError: {
    borderColor: '#D32030',
    borderWidth: 2,
  },
});

export default FormCell;
```

### GCS App Usage Examples

#### Required Field Validation
```typescript
<FormCell
  label="Customer Name"
  value={customerName}
  onChangeText={setCustomerName}
  required
  error={!customerName ? 'This field is required' : undefined}
  helperText="Select a customer from the list"
/>
```

#### Character Limit Warning
```typescript
<FormCell
  label="Notes"
  value={notes}
  onChangeText={setNotes}
  warning={notes.length > 400 ? 'Approaching character limit' : undefined}
  error={notes.length > 500 ? 'Reduce the number of characters' : undefined}
  helperText={`${notes.length}/500 characters`}
/>
```

#### Success Confirmation
```typescript
<FormCell
  label="Email"
  value={email}
  onChangeText={setEmail}
  success={isValidEmail(email) ? 'Email address is valid' : undefined}
  error={email && !isValidEmail(email) ? 'Invalid email format' : undefined}
  helperText="Enter your email address"
/>
```

#### Invoice Form Examples
```typescript
// Invoice Number
<FormCell
  label="Invoice Number"
  value={invoiceNo}
  onChangeText={setInvoiceNo}
  required
  error={invoiceNo <= 0 ? 'Invoice number is required' : undefined}
  helperText="Auto-generated, can be edited"
/>

// Discount Validation
<FormCell
  label="Discount"
  value={discount}
  onChangeText={setDiscount}
  warning={discount > subtotal * 0.2 ? 'Discount exceeds 20% of subtotal' : undefined}
  error={discount > total ? 'Discount cannot exceed total amount' : undefined}
/>

// GRN Change Warning
<InlineValidation
  message="GRN has been changed - items will be recalculated"
  variant="warning"
/>
```

### Real-time Validation Pattern

```typescript
const [email, setEmail] = useState('');
const [touched, setTouched] = useState(false);

const validateEmail = (value: string) => {
  if (!value) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
  return null;
};

const error = touched ? validateEmail(email) : null;
const success = touched && !error && email ? 'Email is valid' : null;

<TextInput
  value={email}
  onChangeText={setEmail}
  onBlur={() => setTouched(true)}
/>
<InlineValidation
  message={error || success || 'Enter your email address'}
  variant={error ? 'error' : success ? 'success' : 'helper'}
/>
```

### Accessibility

- Error messages: `accessibilityRole="alert"` for immediate announcement
- Icon: `accessibilityElementsHidden={true}` (text conveys meaning)
- Combined announcement: `accessibilityLabel="[variant]: [message]"`
- Error state: Input should have `accessibilityState={{ invalid: true }}`

### Best Practices

1. **Message Clarity**: Error messages should explain how to fix the error, not just what's wrong
2. **Single Line**: Keep messages concise (one line recommended)
3. **Immediate Feedback**: Show validation on blur or after delay, not on every keystroke
4. **Priority**: Error > Warning > Success > Helper (only show one at a time)
5. **Helper Persistence**: Always show helper text when no other validation state
6. **Grouping**: Use page-level banners for multiple errors, inline for specific fields
7. **Timing**: Remove success messages after 2-3 seconds, keep errors until fixed
