# SAP Fiori Modal & Dialog - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/modals/dialog/

## Intro

**Modality** is a method to present content in a temporary mode, generally through:
- Modal sheet
- Form sheet
- Popover

With Adaptive Design, modality on iPhone and iPad devices will adapt to screen sizes and utilize available space.

## Usage

A modal is used for:
- Completing a task
- Updating content
- Selecting filters

**Purpose**: Helps user focus on current task by providing relevant properties.

**Common patterns**: Create and filter patterns are generally presented in modals.

### Behavior
A modal typically:
- Slides up from bottom of screen
- Remains open until user takes action to close it

**Exception**: In edit mode, modal has **Dissolve transition**.

---

## Compact Width (iPhone)

### Full-Screen Modal

In compact width, modal is presented as a **full-screen window**.

#### Exit Methods
User must tap one of two action buttons placed in navigation bar:

**Left button** (generally):
- "Cancel" button
- Abandons current task

**Right button** (generally):
- Completes the task
- Saves user's progress

#### Button Label Recommendations
Use language that best describes the current action:
- **Good**: "Create", "Add" (when creating task or adding contact)
- **Avoid**: "Done" (may sound vague to user)

#### Common Patterns

**1. Create Pattern**
- Full-screen form for creating new item
- Left: "Cancel"
- Right: "Create" or "Add"

**2. Filter Pattern**
- Full-screen filter options
- Left: "Cancel"
- Right: "Apply"

---

## Regular Width (iPad)

### 1. Form Sheets

Form sheets appear **in center of screen** with semi-transparent overlay underneath.

**Use for**: Collecting data from users

**Key principle**: Users should be able to complete task **without referring to extra information outside of the modal**

#### Dismissal
- **Tapping outside** form sheet allows user to exit window
- Functions like tapping "Cancel" button
- Task is **not completed**
- Progress is **not saved**

#### Exit Animation
Modal window **slides downwards** until completely exited from screen.

---

### 2. Popover

Popover is another modal type used in regular width.

**Use for**: Quick tasks or actions, such as:
- Filtering a list
- Quick selections
- Simple actions

#### Dismissal
**Tapping outside** popover dismisses the modal.

---

### 3. Full-Screen Modal (Regular Width)

Full-screen modal can also be used in regular width.

**Readable width** should be applied to components:
- May be difficult to read across wide screen
- Components should have max-width constraint

**Best used for**:
- Complex tasks
- Tasks requiring user's full attention

---

## Implementation Notes for React Native

### Key Dimensions

| Modal Type | Width (Compact) | Width (Regular) | Max Height |
|------------|-----------------|-----------------|------------|
| Full-Screen | 100% | 100% | 100% |
| Form Sheet | 100% | 540pt (centered) | 90% |
| Popover | 100% | 320pt - 480pt | 70% |

### Layout Structure (Full-Screen Modal - Compact)

```
┌─────────────────────────────────────────────────────────────┐
│ [Cancel]         Create GRN               [Create]          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Customer *                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Select customer...                              [>]  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Date *                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Jan 15, 2025                                   [📅] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Additional form fields...]                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Form Sheet - Regular)

```
        ┌─────────────────────────────────────────────┐
        │                                             │
Overlay │  [Cancel]  Create GRN       [Create]       │
(40%    │  ─────────────────────────────────────────  │
opacity)│                                             │
        │  Customer *                                 │
        │  ┌─────────────────────────────────────┐   │
        │  │ Select customer...             [>] │   │
        │  └─────────────────────────────────────┘   │
        │                                             │
        │  [Form fields...]                          │
        │                                             │
        └─────────────────────────────────────────────┘
```

### Layout Structure (Popover - Regular)

```
                              ┌───────────────────────┐
                              │ Filter by Status      │
                              ├───────────────────────┤
                              │ ☐ Received           │
                              │ ☐ Pending            │
                              │ ☐ In Transit         │
                              │ ☐ Rejected           │
                              ├───────────────────────┤
                              │ [Clear]     [Apply]  │
                              └───────────────────────┘
```

### Presentation Styles

#### Full-Screen Modal
```typescript
// React Navigation
<Stack.Screen
  name="GRNForm"
  component={GRNFormScreen}
  options={{
    presentation: 'modal',
    headerLeft: () => <CancelButton />,
    headerRight: () => <CreateButton />,
  }}
/>
```

#### Form Sheet (React Native Modal)
```typescript
<Modal
  visible={isVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={handleClose}
>
  <View style={styles.overlay}>
    <View style={styles.formSheet}>
      {/* Form content */}
    </View>
  </View>
</Modal>

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSheet: {
    width: 540,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...shadows.xl,
  },
});
```

#### Popover
```typescript
<Modal
  visible={isVisible}
  animationType="fade"
  transparent={true}
  onRequestClose={handleClose}
>
  <Pressable style={styles.backdrop} onPress={handleClose}>
    <View style={styles.popover}>
      {/* Popover content */}
    </View>
  </Pressable>
</Modal>

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popover: {
    width: 320,
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...shadows.lg,
  },
});
```

### Color Scheme

| Element | Color |
|---------|-------|
| Overlay/Backdrop | rgba(0, 0, 0, 0.4) |
| Modal Background | #FFFFFF |
| Form Sheet Shadow | Elevation 16 (shadow-xl) |
| Popover Shadow | Elevation 8 (shadow-lg) |

### Navigation Bar (Full-Screen Modal)

| Button | Position | Style | Action |
|--------|----------|-------|--------|
| Cancel | Left | Tertiary Normal | Close without saving |
| Create/Add | Right | Tertiary Tint | Save and close |
| Apply | Right | Tertiary Tint | Apply and close |
| Done | Right | Tertiary Tint | Complete and close |

### GCS App Modal Usage

| Screen | Modal Type | Presentation | Left Button | Right Button |
|--------|------------|--------------|-------------|--------------|
| GRN Form (Create) | Full-Screen | Slide up | Cancel | - (Save in step 3) |
| GRN Form (Edit) | Full-Screen | Dissolve | Cancel | - (Save in step 3) |
| Dispatch Form | Full-Screen | Slide up | Cancel | - |
| Invoice Form | Full-Screen | Slide up | Cancel | - |
| Filter (Mobile) | Full-Screen | Slide up | Cancel | Apply |
| Filter (Tablet) | Form Sheet | Fade | - | Apply (tap outside = cancel) |
| Quick Filter (Tablet) | Popover | Fade | - | - (tap outside = dismiss) |
| Customer Selection | Bottom Sheet | Slide up | - | - (select = dismiss) |
| Date Picker | Form Sheet | Slide up | Cancel | Done |

### Transition Animations

#### Slide Up (Create Pattern)
```typescript
Animated.spring(translateY, {
  toValue: 0,
  damping: 20,
  stiffness: 90,
  useNativeDriver: true,
}).start();
```

#### Dissolve (Edit Pattern)
```typescript
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  easing: Easing.ease,
  useNativeDriver: true,
}).start();
```

#### Slide Down (Dismiss)
```typescript
Animated.spring(translateY, {
  toValue: screenHeight,
  damping: 20,
  stiffness: 90,
  useNativeDriver: true,
}).start(() => {
  onDismiss();
});
```

### Unsaved Changes Handling

When user attempts to dismiss modal with unsaved changes:

```typescript
const handleCancel = () => {
  if (hasUnsavedChanges) {
    Alert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to discard them?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => closeModal(),
        },
      ]
    );
  } else {
    closeModal();
  }
};
```

### Readable Width (Full-Screen on iPad)

For full-screen modals on iPad, constrain content width:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 672, // Readable width (42em at 16pt base)
    padding: 24,
  },
});
```

### Keyboard Handling

Modals should adjust for keyboard:

```typescript
import { KeyboardAvoidingView } from 'react-native';

<Modal visible={isVisible}>
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    {/* Form content */}
  </KeyboardAvoidingView>
</Modal>
```

### Accessibility

- Modal container: `accessibilityViewIsModal={true}`
- Overlay: `accessibilityElementsHidden={true}` (for background content)
- Navigation bar title: `accessibilityRole="header"`
- Cancel button: `accessibilityLabel="Cancel [action]"`
- Save button: `accessibilityLabel="Save [item]"`
- Form sheet/Popover: Announce when opened via screen reader
- Dismiss gesture: Ensure accessible alternative (close button)

### Best Practices

1. **Full-Screen Modal**: Use for multi-step forms or complex tasks
2. **Form Sheet**: Use for simple data collection (3-5 fields)
3. **Popover**: Use for quick selections or filters (≤10 options)
4. **Button Labels**: Use specific verbs ("Create GRN" not "Done")
5. **Overlay Tap**: Always allow tap-outside-to-dismiss for form sheets and popovers
6. **Unsaved Changes**: Always warn before discarding changes
7. **Keyboard**: Ensure keyboard doesn't cover input fields
8. **Loading States**: Show loading indicator on save button during submission
