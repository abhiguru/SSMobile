# SAP Fiori Empty State - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/feedback/empty-state/

## Intro

When mobile applications do not have access to or cannot show data, an **Empty State View** can be used as a fallback to provide users with messaging about what has happened and what to do next.

**Can appear in**:
- Cards
- Chart cards
- Chart floor plans
- Chart headers
- List views
- Search results
- Filter results
- Other page types

---

## Anatomy

### A. Illustration (Optional)
This section can display:
- Custom illustration
- Illustration provided by **Fiori Moments**

### B. Title
The title explains the reason for the empty state.

**Format**: Preferably in a single line

### C. Description (Optional)
For charts, a description can be used only in **full-screen mode**.

**Purpose**: Provides additional context or guidance

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Container Padding | 24pt all sides |
| Illustration Size | 120pt × 120pt (default) |
| Illustration to Title Gap | 24pt |
| Title Font Size | 20pt |
| Title Font Weight | Semibold (600) |
| Title Line Height | 28pt |
| Title to Description Gap | 8pt |
| Description Font Size | 14pt |
| Description Font Weight | Regular (400) |
| Description Line Height | 20pt |
| Description to Action Gap | 24pt |
| Button Height | 44pt |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                        [Illustration]                        │
│                          120×120                             │
│                                                              │
│                       No GRNs Found                          │
│                                                              │
│              Try adjusting your filters or                   │
│              create a new GRN to get started                 │
│                                                              │
│                     [Create New GRN]                         │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| Element | Color |
|---------|-------|
| Illustration | Multicolor (or #556B82 for simple icons) |
| Title | #1D2D3E (Fiori text primary) |
| Description | #556B82 (Fiori text secondary) |
| Background | #FFFFFF or #F7F9FA |
| Button | Primary tint style |

### GCS App Empty State Scenarios

#### 1. Empty GRN List
```typescript
title: "No GRNs Found"
description: "Try adjusting your filters or create a new GRN to get started"
action: "Create New GRN"
illustration: clipboard-outline icon or custom illustration
```

#### 2. Empty Search Results
```typescript
title: "No Results Found"
description: "Try different keywords or check your spelling"
action: "Clear Search"
illustration: magnify icon
```

#### 3. Empty Filter Results
```typescript
title: "No Items Match Your Filters"
description: "Try removing some filters to see more results"
action: "Clear Filters"
illustration: filter-remove icon
```

#### 4. Empty Dispatch List
```typescript
title: "No Dispatches Yet"
description: "Create your first dispatch to track outgoing items"
action: "Create Dispatch"
illustration: truck-delivery icon
```

#### 5. Empty Invoice List
```typescript
title: "No Invoices Found"
description: "Invoices will appear here once created"
action: "Create Invoice"
illustration: receipt icon
```

#### 6. Empty Order History
```typescript
title: "No Orders Yet"
description: "Your order history will appear here"
action: null (no action needed)
illustration: package icon
```

#### 7. Network Error
```typescript
title: "Unable to Load Data"
description: "Check your internet connection and try again"
action: "Retry"
illustration: cloud-off icon
```

#### 8. No Items in GRN Form
```typescript
title: "No Items Added"
description: "Add items to continue creating this GRN"
action: "Add Item"
illustration: package-plus icon
```

#### 9. No Permission
```typescript
title: "Access Restricted"
description: "You don't have permission to view this content"
action: null
illustration: lock icon
```

### Empty State Component

```typescript
interface EmptyStateProps {
  illustration?: React.ReactNode | string; // Icon name or custom component
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  actionStyle?: 'primary' | 'secondary';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  illustration,
  title,
  description,
  actionLabel,
  onActionPress,
  actionStyle = 'primary',
}) => {
  return (
    <View style={styles.container}>
      {illustration && (
        <View style={styles.illustrationContainer}>
          {typeof illustration === 'string' ? (
            <Icon
              name={illustration}
              size={120}
              color={colors.textSecondary}
            />
          ) : (
            illustration
          )}
        </View>
      )}

      <Text style={styles.title}>{title}</Text>

      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {actionLabel && onActionPress && (
        <Button
          mode={actionStyle === 'primary' ? 'contained' : 'outlined'}
          onPress={onActionPress}
          style={styles.action}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  illustrationContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320, // Constrain width for readability
  },
  action: {
    minWidth: 160,
  },
});
```

### Usage Examples

#### Empty List
```typescript
{items.length === 0 && !isLoading && (
  <EmptyState
    illustration="clipboard-outline"
    title="No GRNs Found"
    description="Try adjusting your filters or create a new GRN to get started"
    actionLabel="Create New GRN"
    onActionPress={() => navigation.navigate('GRNForm')}
  />
)}
```

#### Empty Search
```typescript
{searchResults.length === 0 && searchQuery && (
  <EmptyState
    illustration="magnify"
    title="No Results Found"
    description={`No results for "${searchQuery}"`}
    actionLabel="Clear Search"
    onActionPress={() => setSearchQuery('')}
    actionStyle="secondary"
  />
)}
```

#### Network Error
```typescript
{error && (
  <EmptyState
    illustration="cloud-off-outline"
    title="Unable to Load Data"
    description="Check your internet connection and try again"
    actionLabel="Retry"
    onActionPress={handleRetry}
  />
)}
```

#### No Permission
```typescript
{!hasPermission && (
  <EmptyState
    illustration="lock-outline"
    title="Access Restricted"
    description="You don't have permission to view this content"
  />
)}
```

### Custom Illustrations

For more engaging empty states, use custom SVG illustrations:

```typescript
import EmptyBox from '@/assets/illustrations/empty-box.svg';

<EmptyState
  illustration={<EmptyBox width={120} height={120} />}
  title="No Items in Stock"
  description="Add items to your inventory to get started"
/>
```

### Animation

Empty state can have subtle entrance animation:

```typescript
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

<Animated.View
  entering={FadeIn.duration(300)}
  style={styles.container}
>
  <Animated.View
    entering={SlideInDown.delay(100).springify()}
    style={styles.illustrationContainer}
  >
    {/* Illustration */}
  </Animated.View>

  <Animated.Text
    entering={FadeIn.delay(200)}
    style={styles.title}
  >
    {title}
  </Animated.Text>

  {/* Description and action */}
</Animated.View>
```

### Contextual Empty States

Empty states should be contextual based on the reason:

| Scenario | Title Pattern | Action |
|----------|---------------|--------|
| First use | "No [Items] Yet" | "Create [Item]" |
| No search results | "No Results Found" | "Clear Search" |
| No filter results | "No Items Match Your Filters" | "Clear Filters" |
| Network error | "Unable to Load Data" | "Retry" |
| No permission | "Access Restricted" | None |
| No data available | "No [Items] Available" | None or "Refresh" |

### Best Practices

1. **Illustration**:
   - Use relevant icons or illustrations
   - Keep size consistent (120pt)
   - Use neutral colors (#556B82) or brand colors sparingly
   - Optional but recommended for better UX

2. **Title**:
   - Keep to single line
   - Be specific and clear
   - Use positive language when possible
   - Examples: "No GRNs Found" not "Empty"

3. **Description**:
   - Explain why state is empty
   - Suggest what user can do next
   - Keep to 1-2 lines
   - Optional for simple cases

4. **Action**:
   - Provide clear next step when applicable
   - Use primary button for create actions
   - Use secondary button for clear/reset actions
   - Omit if no action is needed

5. **Placement**:
   - Center vertically and horizontally in available space
   - Consider tab bar and navigation bar heights
   - Ensure adequate padding on all sides

6. **Accessibility**:
   - Ensure title and description are read by screen readers
   - Illustration should be decorative (hidden from screen readers)
   - Action button should be properly labeled

### Accessibility

```typescript
<View
  style={styles.container}
  accessible={true}
  accessibilityLabel={`${title}. ${description}`}
>
  <View
    style={styles.illustrationContainer}
    accessible={false} // Decorative, skip for screen readers
  >
    {illustration}
  </View>

  <Text
    style={styles.title}
    accessibilityRole="header"
  >
    {title}
  </Text>

  {description && (
    <Text style={styles.description}>
      {description}
    </Text>
  )}

  {actionLabel && (
    <Button
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
      accessibilityHint={`Tap to ${actionLabel.toLowerCase()}`}
    >
      {actionLabel}
    </Button>
  )}
</View>
```

### Illustration Resources

**Icon Libraries**:
- Material Community Icons (react-native-vector-icons)
- Ionicons
- Feather Icons

**Custom Illustrations**:
- unDraw (https://undraw.co) - Free customizable illustrations
- Storyset (https://storyset.com) - Animated illustrations
- Fiori Moments - SAP's illustration library

**Recommended Icons by Scenario**:
- Empty list: clipboard-outline, format-list-bulleted-square
- Search: magnify, search-web
- Filter: filter-remove-outline
- Network: cloud-off-outline, wifi-off
- Permission: lock-outline, shield-lock-outline
- No items: package-variant, inbox-outline
- Error: alert-circle-outline, information-outline
