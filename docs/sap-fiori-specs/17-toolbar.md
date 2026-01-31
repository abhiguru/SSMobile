# SAP Fiori Toolbar - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/bars/toolbar/

## Intro

The toolbar is a component with one or more buttons that is always located at the **bottom edge of the screen**. It is used for closing or finalizing actions that impact the current view.

**Key behavior**: When scrolling, the toolbar **remains fixed** and does not scroll away.

---

## Usage

### Do
- Use toolbar if you need **closing or finalizing actions**
- Use **descriptive and concise verbs** as button labels
- Only use primary button if your app has a **clear primary action**
- Use text-only buttons or buttons with **icons and text**
- Use overflow menu if toolbar on **iPhone requires more than 2 text buttons**
- Use overflow menu if toolbar on **iPad requires more than 3 text buttons**

### Don't
- Don't use toolbar if action influences only specific items instead of entire view
- Don't combine **icon-only and text-only** buttons within a toolbar
- Don't mix **tertiary buttons with secondary or primary** buttons
- Don't use helper text if toolbar has overflow button

---

## Design Psychology Note

**Western reading pattern**: Readers scan in Z-pattern (left to right, top to bottom)

**Best position for finalizing action**: **Bottom right side** of view

---

## Anatomy

### A. Toolbar Container
Contains one or more buttons. Always visible, even when users scroll down.

### B. Secondary Text Button
Actions that are not the primary action.

**Use when**:
- View has no clear primary action
- Displayed actions have same relevance
- Can consist of only secondary buttons
- Use secondary style only if **2 or more buttons** in toolbar

### C. Primary Text Button
Emphasize the most important action.

**Rules**:
- Show only **one primary action** for entire view
- If toolbar has only one button, recommend primary style

### D. Overflow Button
If toolbar has more than allowed text buttons, additional buttons move into overflow menu.

**Limits**:
- **Compact view (iPhone)**: Overflow after 2 text buttons
- **Regular view (iPad)**: Overflow after 3 text buttons

**Important actions displayed first**

### E. Tertiary Text Button
Can be used for additional actions user may need to access.

**Use when**:
- Toolbar should be subtle, yet perceivable
- Additional secondary actions needed

### F. Helper Text
Can be used for displaying information or status.

**Properties**:
- Read-only
- Not tappable

### G. Tertiary Icon Button
Can be used for additional actions.

**Important**: Use icon buttons that can be represented by **universally recognized icons**

---

## Button Recommendation

**Filled buttons** (primary or secondary) recommended for most likely actions:
- Have container with solid fill
- Visually more prominent than tertiary
- Helps people quickly identify action they want to perform

---

## Semantic Actions

Format semantic buttons in **secondary button style**:

**Negative/Destructive actions**:
- Use negative red button

**Positive actions**:
- Use secondary style in tint color
- Should be placed on **right side**

---

## Behavior and Interaction

### Overflow Menu

#### Text Buttons
**Compact view (iPhone)**:
- Maximum of **2 text buttons** can be displayed
- If more than 2, additional buttons move to overflow menu
- Most important actions displayed first

**Regular view (iPad)**:
- Maximum of **3 text buttons** can be displayed
- Overflow appears if more than 3 text buttons

#### Overflow Interaction
Tapping overflow button opens **action sheet** with additional action buttons.

---

### Long Button Labels

**Important for accessibility**: Truncated labels in buttons do not meet accessibility standards.

**Behavior**:
- Overflow should activate when not enough space to display all buttons
- If not enough space for 2 buttons (due to long text):
  - Secondary button moves into overflow
  - More important action stretched across full width of toolbar

**Button sorting**: By usage, with most frequently used action first (on right)
- Ensures most important buttons are last to move into overflow

---

## Adaptive Design

### Spacing
Toolbar spacing follows global layout margins of iOS/iPadOS size classes.

**Width**: Uses **100% of screen width**

### Button Alignment

**Compact view (iPhone)**:
- Buttons **equally distributed** across container

**Regular view (iPad)**:
- Buttons **aligned to right side** of container
- Provides convenient access to buttons

---

## Variations

Toolbar can be flexibly adapted depending on:
- Context
- Amount of actions
- Importance of actions

**Decision matrix**:
- **Clear primary action** → Toolbar with primary button
- **No clear primary action** → Toolbar with only secondary or only tertiary buttons

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Toolbar Height | 56pt (compact), 64pt (regular) |
| Button Height | 44pt |
| Button Min Width | 64pt |
| Horizontal Padding | 16pt |
| Vertical Padding | 8pt |
| Button Spacing | 8pt (compact), 12pt (regular) |
| Helper Text Font Size | 13pt |
| Safe Area Bottom | Add inset for devices with home indicator |

### Layout Structure (Single Primary Button)

```
┌─────────────────────────────────────────────────────────────┐
│                                             [Save]          │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Two Buttons - Compact)

```
┌─────────────────────────────────────────────────────────────┐
│             [Cancel]                      [Save]            │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Two Buttons - Regular/iPad)

```
┌─────────────────────────────────────────────────────────────┐
│                                    [Cancel]     [Save]      │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (With Overflow - Compact)

```
┌─────────────────────────────────────────────────────────────┐
│                [...]                      [Save]            │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (With Helper Text)

```
┌─────────────────────────────────────────────────────────────┐
│ Last saved 2 mins ago                     [Save]            │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Tertiary Icon Buttons)

```
┌─────────────────────────────────────────────────────────────┐
│ [📤] [🔖] [⭐]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

See Button component (08-button.md) for detailed color specifications.

### GCS App Toolbar Usage

#### GRN Form (Step 1-2)

```typescript
Compact (iPhone):
  Left: [Cancel] (Secondary Normal)
  Right: [Next] (Primary)

Regular (iPad):
  Right: [Cancel] (Secondary Normal) [Next] (Primary)
```

#### GRN Form (Step 3 - Final)

```typescript
Compact:
  Left: [Cancel] (Secondary Normal)
  Right: [Save] (Primary)

Regular:
  Right: [Cancel] (Secondary Normal) [Save] (Primary)
```

#### GRN Edit Mode

```typescript
Compact:
  Left: [Cancel] (Secondary Normal)
  Right: [Save Changes] (Primary)

With Overflow (if more actions):
  Left: [...]  (opens: Cancel, Delete)
  Right: [Save Changes] (Primary)
```

#### Dispatch Form

```typescript
Compact:
  Left: [Cancel] (Secondary Normal)
  Right: [Create] (Primary)
```

#### Invoice Form (Step 4)

```typescript
Compact:
  Left: [Cancel] (Secondary Normal)
  Right: [Generate Invoice] (Primary)
```

#### Filter Modal

```typescript
Compact:
  Left: [Clear All] (Tertiary Normal)
  Right: [Apply] (Primary)

Regular:
  Right: [Clear All] (Tertiary Normal) [Apply] (Primary)
```

#### Delete Confirmation

```typescript
Compact:
  Left: [Cancel] (Secondary Normal)
  Right: [Delete] (Secondary Negative)
```

### Component Implementation

```typescript
interface ToolbarProps {
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  tertiaryActions?: Array<{
    icon?: string;
    label?: string;
    onPress: () => void;
  }>;
  overflowActions?: Array<{
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }>;
  helperText?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  primaryAction,
  secondaryAction,
  tertiaryActions,
  overflowActions,
  helperText,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 768;

  const [showOverflow, setShowOverflow] = useState(false);

  return (
    <Surface style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
      {helperText && !overflowActions && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}

      {tertiaryActions && (
        <View style={styles.tertiaryContainer}>
          {tertiaryActions.map((action, index) => (
            <IconButton
              key={index}
              icon={action.icon}
              onPress={action.onPress}
              size={24}
            />
          ))}
        </View>
      )}

      <View style={[
        styles.buttonContainer,
        isCompact && styles.buttonContainerCompact,
      ]}>
        {overflowActions && (
          <IconButton
            icon="dots-horizontal"
            onPress={() => setShowOverflow(true)}
          />
        )}

        {secondaryAction && (
          <Button
            mode="outlined"
            onPress={secondaryAction.onPress}
            style={[
              styles.button,
              isCompact && styles.buttonCompact,
            ]}
          >
            {secondaryAction.label}
          </Button>
        )}

        {primaryAction && (
          <Button
            mode="contained"
            onPress={primaryAction.onPress}
            loading={primaryAction.loading}
            style={[
              styles.button,
              isCompact && styles.buttonCompact,
            ]}
          >
            {primaryAction.label}
          </Button>
        )}
      </View>

      {/* Overflow Action Sheet */}
      {overflowActions && (
        <Portal>
          <Modal
            visible={showOverflow}
            onDismiss={() => setShowOverflow(false)}
            contentContainerStyle={styles.overflowModal}
          >
            {overflowActions.map((action, index) => (
              <Button
                key={index}
                mode="text"
                onPress={() => {
                  setShowOverflow(false);
                  action.onPress();
                }}
                textColor={action.destructive ? '#D32030' : undefined}
              >
                {action.label}
              </Button>
            ))}
          </Modal>
        </Portal>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  helperText: {
    fontSize: 13,
    color: '#556B82',
    marginBottom: 8,
  },
  tertiaryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  buttonContainerCompact: {
    justifyContent: 'space-between',
  },
  button: {
    minWidth: 100,
  },
  buttonCompact: {
    flex: 1,
  },
  overflowModal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
});
```

### Usage Examples

#### Simple Save Action
```typescript
<Toolbar
  primaryAction={{
    label: 'Save',
    onPress: handleSave,
    loading: isSaving,
  }}
/>
```

#### Cancel + Save
```typescript
<Toolbar
  secondaryAction={{
    label: 'Cancel',
    onPress: handleCancel,
  }}
  primaryAction={{
    label: 'Save',
    onPress: handleSave,
  }}
/>
```

#### With Overflow
```typescript
<Toolbar
  overflowActions={[
    { label: 'Save as Draft', onPress: handleSaveDraft },
    { label: 'Cancel', onPress: handleCancel },
    { label: 'Delete', onPress: handleDelete, destructive: true },
  ]}
  primaryAction={{
    label: 'Save',
    onPress: handleSave,
  }}
/>
```

#### With Helper Text
```typescript
<Toolbar
  helperText="Last saved 2 minutes ago"
  primaryAction={{
    label: 'Save Changes',
    onPress: handleSave,
  }}
/>
```

#### Delete Confirmation
```typescript
<Toolbar
  secondaryAction={{
    label: 'Cancel',
    onPress: handleCancel,
  }}
  primaryAction={{
    label: 'Delete',
    onPress: handleDelete,
    // Use Secondary Negative style
  }}
/>
```

### Safe Area Handling

Always account for safe area on devices with home indicator:

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

<View style={{ paddingBottom: insets.bottom + 8 }}>
  {/* Toolbar content */}
</View>
```

### Keyboard Avoiding

Toolbar should stay above keyboard when input is focused:

```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={90} // Adjust based on navigation bar
>
  <Toolbar {...props} />
</KeyboardAvoidingView>
```

### Accessibility

- Toolbar: `accessibilityRole="toolbar"`
- Buttons: `accessibilityRole="button"`
- Primary button: `accessibilityHint="Primary action"`
- Overflow: `accessibilityLabel="More actions"`
- Helper text: Read automatically when toolbar gains focus

### Best Practices

1. **Button Count**:
   - iPhone: Max 2 visible buttons (use overflow for more)
   - iPad: Max 3 visible buttons (use overflow for more)

2. **Button Labels**:
   - Use action verbs: "Save", "Create", "Delete"
   - Keep concise (1-2 words)
   - Never truncate (use overflow instead)

3. **Primary Action**:
   - Only one per toolbar
   - Place on right (Z-pattern reading)
   - Most common action

4. **Button Styles**:
   - Don't mix icon-only with text buttons
   - Don't mix tertiary with primary/secondary
   - Be consistent throughout app

5. **Helper Text**:
   - Use sparingly
   - Show status or context
   - Not tappable

6. **Safe Area**:
   - Always respect safe area insets
   - Add extra padding for home indicator

7. **Loading States**:
   - Show loading indicator on primary button
   - Disable all buttons during operation
   - Provide feedback on completion
