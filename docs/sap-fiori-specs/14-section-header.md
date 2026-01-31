# SAP Fiori Section Header - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/list-view-cells/section-header/

## Intro

A header is a section title that summarizes the content within that section. It is used to organize screen content into logical parts, making it easier for users to navigate and understand the information.

**Headers should be**:
- Brief
- Concise
- Allow users to quickly identify what each section contains

---

## Anatomy

### A. Header
The header indicates what the section contains.

**Note**: Header can be used as:
- **Section header** (top of section)
- **Section footer** (bottom of section)

**Requirements**:
- **Section header**: Section title is **required**
- **Section footer**: Section title is **optional**

### B. Button (Optional)
The button enables user to perform relevant actions to the section.

**Button types**:
- Text button
- Icon button

---

## Variations

### 1. Section Header (Simple)

A section header represents the content of a section using a simple and short word or phrase.

**Purpose**: Convey the purpose of the section

**Examples**:
- "Customer Information"
- "Items"
- "Attachments"
- "Notes"

---

### 2. Section Header with Button

A section header can contain an action button associated with the content of the section.

**Button types**:
1. **Text button**: e.g., "Add Attachment"
2. **Icon button**: e.g., + icon

**Example**: Attachment header contains "Add" button to allow users to add attachments

**Reference**: See Attachment Form Cell article for workflow details

---

### 3. Section Footer

A section footer provides additional actions or information at the bottom of a group section.

**Supported layouts**:
1. Left-aligned button
2. Right-aligned button
3. Two opposite buttons (left and right)
4. Text only

**Features**: Flexible positioning to adapt to different use cases

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Section Header Height | 32pt (min), 44pt (with button) |
| Section Footer Height | 32pt (min), 44pt (with button) |
| Horizontal Padding | 16pt |
| Vertical Padding | 8pt top, 4pt bottom (header) |
| Vertical Padding | 4pt top, 8pt bottom (footer) |
| Title Font Size | 13pt |
| Title Font Weight | Semibold (600) |
| Title Text Transform | Uppercase |
| Title Letter Spacing | 0.5pt |
| Button Font Size | 14pt |
| Button Height | 28pt (compact) |

### Layout Structure (Simple Header)

```
┌─────────────────────────────────────────────────────────────┐
│ CUSTOMER INFORMATION                                         │
├─────────────────────────────────────────────────────────────┤
│ [Content rows...]                                            │
```

### Layout Structure (Header with Text Button)

```
┌─────────────────────────────────────────────────────────────┐
│ ATTACHMENTS                                      [Add]       │
├─────────────────────────────────────────────────────────────┤
│ [Content rows...]                                            │
```

### Layout Structure (Header with Icon Button)

```
┌─────────────────────────────────────────────────────────────┐
│ ITEMS                                            [+]         │
├─────────────────────────────────────────────────────────────┤
│ [Content rows...]                                            │
```

### Layout Structure (Footer with Left Button)

```
│ [Content rows...]                                            │
├─────────────────────────────────────────────────────────────┤
│ [Add Item]                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Footer with Right Button)

```
│ [Content rows...]                                            │
├─────────────────────────────────────────────────────────────┤
│                                                  [View All]  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Footer with Two Buttons)

```
│ [Content rows...]                                            │
├─────────────────────────────────────────────────────────────┤
│ [Clear All]                                      [View All]  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Footer with Text Only)

```
│ [Content rows...]                                            │
├─────────────────────────────────────────────────────────────┤
│ 24 items total                                               │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| Element | Color |
|---------|-------|
| Header Background | Transparent or #F7F9FA (grouped style) |
| Header Text | #556B82 (Fiori text secondary) |
| Footer Background | Transparent or #F7F9FA |
| Footer Text | #556B82 |
| Button Text (header) | #f69000 (primary) |
| Button Text (footer) | #f69000 (primary) |
| Button Icon | #f69000 (primary) |

### GCS App Section Header Usage

#### GRN Form Screens

**Step 1: Header Information**
```typescript
Sections:
1. "BASIC INFORMATION"
   - Date, Customer, Sender

2. "ADDITIONAL DETAILS"
   - Supervisor, Truck Registration

3. "NOTES"
   - Header with "Add Note" text button
   - Notes text area
```

**Step 2: Items**
```typescript
Sections:
1. "ITEMS" (header with + icon button)
   - List of selected items
   - Footer: "24 items added" (text only)

2. "RECENT ITEMS" (header with "View All" text button)
   - Quick add from recent items
```

**Step 3: Review**
```typescript
Sections:
1. "HEADER INFORMATION"
   - Review fields

2. "ITEMS (24)"
   - List of items
   - Footer with "Edit Items" button (left aligned)

3. "ATTACHMENTS" (header with "Add" icon button)
   - Image grid
   - Footer: "3 images attached"
```

#### GRN Details Screen

```typescript
Sections:
1. "ITEMS (24)"
   - Object cells
   - Footer: "Total: 500 kg"

2. "RELATED DISPATCHES (5)"
   - Dispatch cells
   - Footer: [Clear Filters] (left) [View All] (right)

3. "CHANGE LOG"
   - Change entries
   - Footer: "Last updated 2h ago"
```

#### Settings Screen

```typescript
Sections:
1. "ACCOUNT"
   - User profile fields

2. "PREFERENCES"
   - Toggle switches
   - Footer: "Sync enabled"

3. "ABOUT"
   - App version, terms
```

### Component Implementation

```typescript
interface SectionHeaderProps {
  title: string;
  action?: {
    label?: string;
    icon?: string;
    onPress: () => void;
  };
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {action && (
        action.icon ? (
          <IconButton
            icon={action.icon}
            size={20}
            iconColor={colors.primary}
            onPress={action.onPress}
            style={styles.iconButton}
          />
        ) : (
          <Button
            mode="text"
            onPress={action.onPress}
            compact
            textColor={colors.primary}
          >
            {action.label}
          </Button>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#556B82',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  iconButton: {
    margin: 0,
  },
});
```

### Section Footer Implementation

```typescript
interface SectionFooterProps {
  text?: string;
  leftAction?: {
    label: string;
    onPress: () => void;
  };
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

const SectionFooter: React.FC<SectionFooterProps> = ({
  text,
  leftAction,
  rightAction,
}) => {
  return (
    <View style={styles.footer}>
      {leftAction && (
        <Button
          mode="text"
          onPress={leftAction.onPress}
          compact
          textColor={colors.primary}
        >
          {leftAction.label}
        </Button>
      )}

      {text && !leftAction && !rightAction && (
        <Text style={styles.footerText}>{text}</Text>
      )}

      {rightAction && (
        <Button
          mode="text"
          onPress={rightAction.onPress}
          compact
          textColor={colors.primary}
          style={{ marginLeft: 'auto' }}
        >
          {rightAction.label}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  footerText: {
    fontSize: 13,
    color: '#556B82',
  },
});
```

### Usage with SectionList

```typescript
const sections = [
  {
    title: 'Customer Information',
    data: customerFields,
  },
  {
    title: 'Items',
    action: {
      icon: 'plus',
      onPress: () => handleAddItem(),
    },
    data: items,
    footer: {
      text: `${items.length} items added`,
    },
  },
  {
    title: 'Attachments',
    action: {
      label: 'Add',
      onPress: () => handleAddAttachment(),
    },
    data: attachments,
  },
];

<SectionList
  sections={sections}
  renderSectionHeader={({ section }) => (
    <SectionHeader
      title={section.title}
      action={section.action}
    />
  )}
  renderSectionFooter={({ section }) =>
    section.footer && <SectionFooter {...section.footer} />
  }
  renderItem={({ item }) => <ListItem {...item} />}
/>
```

### Grouped Style (iOS Native Look)

For iOS-native grouped appearance:

```typescript
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F7F9FA', // Light gray background
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#556B82',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
```

### Accessibility

- Section header: `accessibilityRole="header"`
- Section title: Read automatically by screen reader
- Action button: `accessibilityRole="button"`, `accessibilityLabel="[Action] [section name]"`
- Icon button: `accessibilityLabel="Add [item type]"`
- Footer text: Read automatically when focused

### Best Practices

1. **Title Length**: Keep section titles short (1-3 words)
2. **Title Case**: Use uppercase for consistency with iOS standards
3. **Actions**: Only include actions directly related to section content
4. **Icon vs Text**: Use icon buttons when action is universally understood (+ for add)
5. **Footer Usage**: Use for:
   - Item counts
   - Summary information
   - Secondary actions (View All, Clear)
6. **Consistency**: Use same header style throughout app
7. **Spacing**: Maintain proper spacing between header and content
8. **Background**: Use transparent or light gray (#F7F9FA) for grouped style
