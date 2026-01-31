# SAP Fiori Snackbar - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/feedback/snackbar/

## Intro

A snackbar provides a brief message about the performance of a process at the bottom of the screen. It disappears without requiring the user's dismissal.

## Usage

### Do
- Use a snackbar to provide brief, non-intrusive feedback

### Don't
- Don't use a snackbar to convey important information

---

## Top Tips

1. Create text labels that are **short and clear**
2. Distinguish the action from the text label
3. Use the third line to display actions with longer text
4. Use different colors for the text label and the text button
5. **Don't use icons** in snackbar
6. **Avoid stacking** snackbars on top of each other

---

## Variations

### 1. Snackbar with Text Label

The message on the snackbar directly relates to the process being performed.

**Examples**:
- "Files have been moved"
- "Item added to cart"
- "GRN saved successfully"

**Text label**: Can have **one or two lines** of text

---

### 2. Snackbar with Action

Snackbars can display a **single text button** that allows users to take action on a process performed by the app.

**To distinguish action from text label**:
- Action text should be **tinted** (colored)
- Text label should be neutral/white

**Examples**:
- "Item deleted" + [UNDO]
- "GRN saved" + [VIEW]
- "Connection lost" + [RETRY]

---

## Behavior and Interaction

### Appearance & Dismissal

**Location**: Bottom of screen

**Dismissal**: Does not require user's dismissal
- Appears momentarily
- Dismisses itself after **4-10 seconds**

**Duration guidelines**:
- Short message (1 line): 4 seconds
- Long message (2 lines): 6 seconds
- With action button: 8-10 seconds

---

### Consecutive Snackbars

When multiple app updates are necessary:
- Snackbars should appear **one at a time**
- Queue them instead of stacking
- Next snackbar appears after previous one dismisses

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Snackbar Min Height | 48pt (1 line) |
| Snackbar Max Height | 80pt (2 lines + action) |
| Width (Mobile) | Screen width - 32pt (16pt margin each side) |
| Width (Tablet) | 344pt (centered) |
| Corner Radius | 8pt |
| Horizontal Padding | 16pt |
| Vertical Padding | 14pt |
| Bottom Margin | 16pt (above tab bar: 72pt) |
| Text Font Size | 14pt |
| Text Line Height | 20pt |
| Action Button Font Size | 14pt |
| Action Button Font Weight | Semibold (600) |
| Action Button Min Width | 64pt |
| Shadow Elevation | 6dp |

### Layout Structure (Text Only)

```
┌────────────────────────────────────────────────────────┐
│ GRN saved successfully                                 │
└────────────────────────────────────────────────────────┘
```

### Layout Structure (With Action)

```
┌────────────────────────────────────────────────────────┐
│ Item deleted                                   [UNDO]  │
└────────────────────────────────────────────────────────┘
```

### Layout Structure (Two Lines)

```
┌────────────────────────────────────────────────────────┐
│ GRN-2025-001 has been saved                            │
│ successfully                                   [VIEW]  │
└────────────────────────────────────────────────────────┘
```

### Color Scheme

| Type | Background | Text | Action Button |
|------|------------|------|---------------|
| Default | #323232 (dark gray) | #FFFFFF | #f69000 (primary tint) |
| Success | #36A41D (Fiori positive) | #FFFFFF | #FFFFFF |
| Error | #D32030 (Fiori negative) | #FFFFFF | #FFFFFF |
| Warning | #E9730C (Fiori critical) | #FFFFFF | #FFFFFF |
| Info | #0057D2 (Fiori neutral) | #FFFFFF | #FFFFFF |

### GCS App Snackbar Usage

| Action | Message | Type | Action Button | Duration |
|--------|---------|------|---------------|----------|
| GRN Saved | "GRN saved successfully" | Success | VIEW | 6s |
| GRN Deleted | "GRN deleted" | Default | UNDO | 8s |
| Item Added | "Item added to GRN" | Default | - | 4s |
| Network Error | "Connection lost" | Error | RETRY | 10s |
| Filter Applied | "2 filters applied" | Info | CLEAR | 6s |
| Print Queued | "Print job queued" | Default | VIEW | 6s |
| Changes Saved | "Changes saved" | Success | - | 4s |
| No Results | "No items found" | Default | - | 4s |

### Implementation Example

```typescript
import { useState } from 'react';
import { Snackbar } from 'react-native-paper';

const [snackbarVisible, setSnackbarVisible] = useState(false);
const [snackbarMessage, setSnackbarMessage] = useState('');
const [snackbarAction, setSnackbarAction] = useState(null);

const showSnackbar = (
  message: string,
  action?: { label: string; onPress: () => void }
) => {
  setSnackbarMessage(message);
  setSnackbarAction(action);
  setSnackbarVisible(true);
};

// Usage
const handleSave = async () => {
  try {
    await saveGRN();
    showSnackbar('GRN saved successfully', {
      label: 'VIEW',
      onPress: () => navigation.navigate('GRNDetails', { id: grnId }),
    });
  } catch (error) {
    showSnackbar('Failed to save GRN', {
      label: 'RETRY',
      onPress: handleSave,
    });
  }
};

// Render
<Snackbar
  visible={snackbarVisible}
  onDismiss={() => setSnackbarVisible(false)}
  duration={snackbarAction ? 8000 : 4000}
  action={snackbarAction}
  style={styles.snackbar}
>
  {snackbarMessage}
</Snackbar>

const styles = StyleSheet.create({
  snackbar: {
    backgroundColor: '#323232',
    marginBottom: 16,
  },
});
```

### Snackbar Queue Implementation

For consecutive snackbars:

```typescript
const [snackbarQueue, setSnackbarQueue] = useState<Snackbar[]>([]);
const [currentSnackbar, setCurrentSnackbar] = useState<Snackbar | null>(null);

const enqueueSnackbar = (snackbar: Snackbar) => {
  setSnackbarQueue(prev => [...prev, snackbar]);
};

useEffect(() => {
  if (!currentSnackbar && snackbarQueue.length > 0) {
    // Show next snackbar in queue
    setCurrentSnackbar(snackbarQueue[0]);
    setSnackbarQueue(prev => prev.slice(1));
  }
}, [currentSnackbar, snackbarQueue]);

const handleDismiss = () => {
  setCurrentSnackbar(null);
  // Next snackbar will auto-show via useEffect
};
```

### Position Adjustment for Tab Bar

When tab bar is present, adjust bottom margin:

```typescript
const styles = StyleSheet.create({
  snackbar: {
    backgroundColor: '#323232',
    marginBottom: hasTabBar ? 72 : 16, // 56pt tab bar + 16pt margin
  },
});
```

### Animation

Snackbar should slide up from bottom:

```typescript
Animated.spring(translateY, {
  toValue: 0,
  friction: 8,
  tension: 40,
  useNativeDriver: true,
}).start();

// Auto-dismiss after duration
setTimeout(() => {
  Animated.spring(translateY, {
    toValue: 100, // Slide down
    friction: 8,
    tension: 40,
    useNativeDriver: true,
  }).start(() => {
    onDismiss();
  });
}, duration);
```

### Accessibility

- Snackbar: `accessibilityRole="alert"`
- Message: `accessibilityLabel={message}`
- Action button: `accessibilityRole="button"`, `accessibilityLabel={actionLabel}`
- Auto-dismiss: Announce message via screen reader when snackbar appears
- Action: Ensure sufficient time for screen reader users to interact (min 8s if action present)

### Best Practices

1. **Message Length**: Keep to 1-2 lines maximum
2. **Action Label**: Use uppercase, single word when possible (UNDO, VIEW, RETRY)
3. **Color Coding**: Use semantic colors only when appropriate (success/error)
4. **Default Color**: Use neutral dark gray (#323232) for most messages
5. **Duration**: Give users enough time to read and react
   - Without action: 4-6 seconds
   - With action: 8-10 seconds
6. **Queueing**: Never stack, always queue consecutive snackbars
7. **Icons**: Don't use icons in snackbar (SAP Fiori guideline)
8. **Important Info**: Don't use for critical information (use dialog instead)

### Common Patterns

#### Success Feedback
```typescript
showSnackbar('GRN saved successfully', {
  label: 'VIEW',
  onPress: () => navigation.navigate('GRNDetails'),
});
```

#### Undo Action
```typescript
const [deletedItem, setDeletedItem] = useState(null);

const handleDelete = (item) => {
  setDeletedItem(item);
  deleteItem(item.id);

  showSnackbar('Item deleted', {
    label: 'UNDO',
    onPress: () => {
      restoreItem(deletedItem);
      setDeletedItem(null);
    },
  });
};
```

#### Error with Retry
```typescript
const handleNetworkError = () => {
  showSnackbar('Connection lost', {
    label: 'RETRY',
    onPress: () => retryRequest(),
  });
};
```

#### Simple Notification
```typescript
showSnackbar('2 filters applied');
// Auto-dismisses after 4 seconds
```

### Library Recommendation

For React Native, use **react-native-paper** Snackbar:
- Follows Material Design 3 principles (compatible with Fiori)
- Supports actions and custom styling
- Built-in queue management
- Accessible by default
