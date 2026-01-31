# SAP Fiori Tags & Badges - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/feedback/tags/

## Intro

Tags are used to display quick and useful bits of information to the user, such as:
- Keywords
- Labels
- Categories
- Statuses
- Count indicators
- Notification badges

## Usage

Tags display complementary information that relates to the object. They use a different visual representation than plain text and serve as independent bits of information.

---

## Do's and Don'ts

### Do
- Keep tag labels **concise**
- Recommended: Maximum of **two words** per tag

### Don't
- Don't write full sentences within a tag
- Don't place **icons or images** within a tag
- Don't **overload** the user by including excessive number of tags or very long text values

---

## Anatomy

### A. Container
Two styles available for containers:
1. **Filled** - Has solid background color
2. **Outlined** - Transparent background with border

### B. Label
The label indicates keywords or other bits of information.

**Format**: Short text (1-2 words)

---

## Behavior and Interaction

**Important**: Tags are **not interactive** (not tappable)

### Layout
- Multiple tags line up in **horizontal layout** one after the other
- Tag row can be configured to **wrap to next line** depending on parent container

---

## Variations

### Style

#### A. Filled (Default)
The default tag has a **filled background**.

**Use for**:
- Status indicators
- Categories
- Primary labels

#### B. Outlined
Optionally, tag can have **transparent background with outline**.

**Use for**:
- Secondary information
- Less prominent labels
- When background needs to be subtle

---

### Color

#### Default (Grey)
The default tag color is grey.

#### Accent Colors
Can also be displayed in many different colors of the accent color palette.

**Common color meanings**:
- **Green/Positive**: Success, completed, active, full stock
- **Orange/Critical**: Warning, partial, in progress
- **Red/Negative**: Error, rejected, empty stock
- **Blue/Neutral**: Information, pending, default
- **Grey**: Neutral, inactive, N/A

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Tag Height | 20pt (compact), 24pt (default) |
| Tag Min Width | 32pt |
| Tag Max Width | 120pt (recommended) |
| Horizontal Padding | 8pt |
| Vertical Padding | 4pt |
| Font Size | 11pt (compact), 12pt (default) |
| Font Weight | Semibold (600) |
| Corner Radius | 10pt (pill shape, compact), 12pt (default) |
| Border Width (outlined) | 1pt |
| Tag Spacing (horizontal) | 4pt |
| Tag Spacing (vertical) | 4pt |

### Layout Structure (Filled Tags)

```
┌────────┐  ┌────────┐  ┌────────┐
│ Active │  │ New    │  │ Hot    │
└────────┘  └────────┘  └────────┘
```

### Layout Structure (Outlined Tags)

```
┌────────┐  ┌────────┐  ┌────────┐
│ Draft  │  │ Review │  │ Done   │
└────────┘  └────────┘  └────────┘
```

### Layout Structure (Status Tags in Object Cell)

```
┌─────────────────────────────────────────────────────────────┐
│ GRN-2025-001                                    ┌────────┐  │
│ Customer ABC                                    │ Active │  │
│ Jan 15, 2025                                    └────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Multiple Tags - Wrapped)

```
┌─────────────────────────────────────────────────────────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ Frozen │ │ Urgent │ │ Paid   │ │ Q1     │               │
│ └────────┘ └────────┘ └────────┘ └────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

#### Filled Tags

| Type | Background | Text | Use Case |
|------|------------|------|----------|
| Default (Grey) | #E5E5E5 | #1D2D3E | Neutral, default |
| Positive (Green) | #F5FAE5 | #256F14 | Success, full stock, active |
| Critical (Orange) | #FEF7F1 | #AA5808 | Warning, partial, in progress |
| Negative (Red) | #FFF4F2 | #AA161F | Error, empty, rejected |
| Neutral (Blue) | #EBF8FF | #0040B0 | Info, pending |
| Primary (Orange) | #fff4e6 | #dd8200 | Brand, featured |

#### Outlined Tags

| Type | Border | Text | Background | Use Case |
|------|--------|------|------------|----------|
| Default | #E5E5E5 | #556B82 | Transparent | Secondary info |
| Positive | #5DC122 | #256F14 | Transparent | Success (subtle) |
| Critical | #F58B1F | #AA5808 | Transparent | Warning (subtle) |
| Negative | #EE3939 | #AA161F | Transparent | Error (subtle) |
| Neutral | #1B90FF | #0040B0 | Transparent | Info (subtle) |
| Primary | #f69000 | #dd8200 | Transparent | Brand (subtle) |

### GCS App Tags/Badges Usage

#### Object Cells (GRN List, Dispatch List, Invoice List)

**Status Tags (Filled)**:
```typescript
// GRN Status
"Received" → Positive (green)
"Pending" → Neutral (blue)
"Partial" → Critical (orange)
"Rejected" → Negative (red)

// Dispatch Status
"Dispatched" → Positive
"In Transit" → Neutral
"Delayed" → Critical
"Cancelled" → Negative

// Invoice Status
"Paid" → Positive
"Unpaid" → Critical
"Overdue" → Negative
"Draft" → Default (grey)
```

**Priority Tags (Outlined)**:
```typescript
"High" → Critical (orange border)
"Medium" → Neutral (blue border)
"Low" → Default (grey border)
```

**Category Tags (Filled)**:
```typescript
"Frozen" → Neutral (blue)
"Chilled" → Critical (orange)
"Dry" → Default (grey)
```

#### Notification Badges (Count)

**Tab Bar Badges**:
```typescript
GRN tab → Red badge with count "5"
Dispatch tab → Red badge with count "3"
```

**Navigation Bar Badges**:
```typescript
Filter button → Primary badge with count "2" (active filters)
Notifications → Red badge with count "12"
```

#### Cards

**Card Header Tags**:
```typescript
"New" → Primary (orange)
"Featured" → Primary
"Trending" → Critical (orange)
```

**Financial Year Tags**:
```typescript
"FY 2024" → Default (grey, outlined)
"Q1" → Default (grey, outlined)
```

### Component Implementation

```typescript
interface TagProps {
  label: string;
  variant?: 'filled' | 'outlined';
  color?: 'default' | 'positive' | 'critical' | 'negative' | 'neutral' | 'primary';
  size?: 'compact' | 'default';
}

const Tag: React.FC<TagProps> = ({
  label,
  variant = 'filled',
  color = 'default',
  size = 'default',
}) => {
  const colors = getTagColors(variant, color);

  return (
    <View style={[
      styles.tag,
      size === 'compact' && styles.tagCompact,
      variant === 'outlined' && styles.tagOutlined,
      { backgroundColor: colors.background, borderColor: colors.border },
    ]}>
      <Text style={[
        styles.label,
        size === 'compact' && styles.labelCompact,
        { color: colors.text },
      ]}>
        {label}
      </Text>
    </View>
  );
};

const getTagColors = (variant: string, color: string) => {
  const colorMap = {
    filled: {
      default: { background: '#E5E5E5', text: '#1D2D3E', border: 'transparent' },
      positive: { background: '#F5FAE5', text: '#256F14', border: 'transparent' },
      critical: { background: '#FEF7F1', text: '#AA5808', border: 'transparent' },
      negative: { background: '#FFF4F2', text: '#AA161F', border: 'transparent' },
      neutral: { background: '#EBF8FF', text: '#0040B0', border: 'transparent' },
      primary: { background: '#fff4e6', text: '#dd8200', border: 'transparent' },
    },
    outlined: {
      default: { background: 'transparent', text: '#556B82', border: '#E5E5E5' },
      positive: { background: 'transparent', text: '#256F14', border: '#5DC122' },
      critical: { background: 'transparent', text: '#AA5808', border: '#F58B1F' },
      negative: { background: 'transparent', text: '#AA161F', border: '#EE3939' },
      neutral: { background: 'transparent', text: '#0040B0', border: '#1B90FF' },
      primary: { background: 'transparent', text: '#dd8200', border: '#f69000' },
    },
  };

  return colorMap[variant][color];
};

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagOutlined: {
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 11,
  },
});
```

### Tag Row (Multiple Tags)

```typescript
interface TagRowProps {
  tags: Array<{
    label: string;
    variant?: 'filled' | 'outlined';
    color?: string;
  }>;
  wrap?: boolean;
}

const TagRow: React.FC<TagRowProps> = ({ tags, wrap = true }) => {
  return (
    <View style={[styles.tagRow, wrap && styles.tagRowWrap]}>
      {tags.map((tag, index) => (
        <Tag key={index} {...tag} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tagRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tagRowWrap: {
    flexWrap: 'wrap',
  },
});
```

### Badge (Notification Count)

```typescript
interface BadgeProps {
  count: number;
  max?: number;
  variant?: 'notification' | 'filter';
}

const Badge: React.FC<BadgeProps> = ({ count, max = 99, variant = 'notification' }) => {
  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <View style={[
      styles.badge,
      variant === 'filter' && styles.badgeFilter,
    ]}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D32030', // Fiori negative (red)
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeFilter: {
    backgroundColor: '#f69000', // Primary (orange)
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
```

### Usage Examples

#### Status Tag in Object Cell
```typescript
<View style={styles.objectCell}>
  <View style={styles.content}>
    <Text style={styles.title}>GRN-2025-001</Text>
    <Text style={styles.subtitle}>Customer ABC</Text>
  </View>
  <Tag label="Received" color="positive" />
</View>
```

#### Multiple Tags
```typescript
<TagRow
  tags={[
    { label: 'Frozen', color: 'neutral' },
    { label: 'Urgent', color: 'critical' },
    { label: 'Q1', variant: 'outlined' },
  ]}
/>
```

#### Notification Badge on Tab
```typescript
<View>
  <Icon name="inbox" size={24} />
  {unreadCount > 0 && (
    <Badge count={unreadCount} variant="notification" />
  )}
</View>
```

#### Filter Badge
```typescript
<IconButton
  icon="filter"
  onPress={openFilters}
>
  {activeFilterCount > 0 && (
    <Badge count={activeFilterCount} variant="filter" />
  )}
</IconButton>
```

### Accessibility

- Tag: `accessibilityRole="text"` (not interactive)
- Tag label: Read automatically by screen reader
- Badge: `accessibilityLabel="[count] notifications"` or `accessibilityLabel="[count] filters applied"`
- Badge on button: Announce count as part of button label

### Best Practices

1. **Label Length**:
   - Keep to 1-2 words maximum
   - Never use full sentences
   - Use abbreviations if necessary (Q1, FY24)

2. **Color Usage**:
   - Use semantic colors consistently
   - Green = positive, Red = negative, Orange = warning, Blue = info
   - Don't use random colors

3. **Tag Count**:
   - Don't overload with too many tags (max 3-4 per item)
   - Most important tags first
   - Consider wrapping vs scrolling

4. **Style Selection**:
   - Use filled for primary/important information
   - Use outlined for secondary information
   - Be consistent throughout app

5. **Icons**:
   - Don't place icons within tags (SAP Fiori guideline)
   - Use separate icon buttons if needed

6. **Badges**:
   - Use red for notifications/alerts
   - Use primary color for filters/selections
   - Show "99+" for counts over 99

7. **Placement**:
   - Right side for status tags in object cells
   - Top-right corner for notification badges
   - Below title for category tags

### Library Recommendation

For React Native, use **react-native-paper** Chip component or create custom:
- Paper Chip is close to SAP Fiori tags
- Customize colors to match Fiori semantic colors
- Add badge component for counts
