# SAP Fiori Card - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/cards/card/

## Intro

A card provides brief, related pieces of information and serves as an entry point, teaser, or preview to more detailed content. By pressing on the card, users can select the card and navigate to a dedicated page with more detailed information.

## Usage

The card system for SAP Fiori for iOS provides an advanced approach to utilizing cards, offering a convenient way to display content from various sources. It consists of a toolkit of nested components that enable creation of diverse cards to meet SAP product requirements.

**Nested components include**:
- Lists
- Calendars
- KPIs
- Charts
- Tables
- Object cells
- And more

**Features**:
- Enhanced customization and flexibility
- Adaptable sizing options
- Different layouts: list, masonry, or carousel

---

## Do's and Don'ts

### Do
- A card should **focus on a single topic** and be coherent in itself
- A card should serve as an **entry point, teaser, or preview** to more detailed content
- A card should be a **short representation** of a conceptual unit
- A card should present information in a **compact and easily scannable** format
- Incorporate cards to provide users with **quick overview** of various information
- Ensure clear indication when card selection opens web browser (use external icon)

### Don't
- Don't use **inset grouped style** (table view with rounded corners) as substitute for card component
  - Inset grouped style does not automatically transform component into card
- Don't place **unrelated elements** within a card
- Don't **overload** the user by including excessive number of UI elements within a card

---

## Anatomy

**Card height**: Determined by content, but recommended **maximum height is 520pt**

### A. Card Container
The element that holds the header, body, and footer of the card.

### B. Header
The card's uppermost part containing essential information about the card and its detail page content.

**Provides quick overview of**:
- Title
- Subtitle
- Status

**Reference**: See Card Header article for more information

### C. Body
The central part of a card used to provide additional information alongside the content shown in the card header.

**Allows for presentation of**:
- In-depth details
- Data
- Graphics relevant to card's context

**Reference**: See Card Body article for more information

### D. Footer
Located at bottom of card, used for important or routine actions that directly impact card's functionality.

**Examples**: "Approve", "Submit" actions

**Reference**: See Card Footer article for more information

---

## Behavior and Interaction

### Interaction States

#### 1. Selecting a Card
When user selects a card:
- Background color of card changes
- Provides clear and immediate feedback
- Indicates selection

#### 2. Selecting an Interactive Element
When specific element within card (e.g., object cell) is designed to be interactive:
- Element goes through unique background color transition
- Provides distinct visual indicator of selection
- **Only the element's background changes**, not entire card

**Loading behavior**: If data needs to load after selection, loading indicator appears

---

### Navigation

#### Selecting a Card
When card is selected:
- Prompts user to navigate to designated page with more details
- Examples: list report page, object details page

#### Selecting an Interactive Element
When users engage with interactive element within card:
- Triggers navigation to dedicated details page
- Corresponds to specific subject of that element

---

### Empty States

#### Entire Card
When there is no relevant content or data to display:
- Include empty state indicator within card
- Show appropriate message

#### Element within a Card
If a component within card fails to load:
- Empty state indicator displayed in body container
- Rest of card remains visible

---

### Skeleton Loading

Skeleton loading used when data that fills card still needs to be loaded.

**Three skeleton loading sizes available**:
1. Small card skeleton
2. Medium card skeleton
3. Large card skeleton

**Purpose**: Select size that approximately reflects loaded card size

**Reference**: See Skeleton Loading article for more information

---

## Adaptive Design

Cards adjust seamlessly to different screen sizes and orientations.

### Compact Size Classes (iPhone)
- Cards designed to be **narrower**
- Accommodate limited screen width
- Make efficient use of available space in portrait orientation

### Regular Size Classes (iPad)
- Cards can have **wider layout**
- Take advantage of increased screen real estate
- More spacious and visually appealing presentation

---

## Variations

The flexible card container allows variety of cards to be created for any use case by leveraging card header, body, and footer.

### 1. AR Card
Create AR card to display key information of an object.

**Components**:
- Card header (with header image and main header)
- Card footer
- Thumbnail image, icon, or app representation

### 2. Data Table Card
Display key data points about an object in two-column format.

**Components**:
- Card header (with main header)
- Card body (with data table)
- Card footer

### 3. Chart Card
Display thumbnail view of a chart with key information.

**Components**:
- Card header (with main header)
- Card body (with chart component)
- Card footer (optional)

### 4. List Card
Display preview of a set of items or objects in vertical list format.

**Components**:
- Card header (with main header)
- Card body (with object cell components or contact cell components)

**Variations**:
- Object cells
- Contact cells

### 5. Object Card
Display preview of an object.

**Components**:
- Card header (with header image, main header, extended header)
- Card body (with object cell and KPI) - optional
- Card footer

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Card Max Height | 520pt |
| Card Min Width | 280pt |
| Card Corner Radius | 12pt |
| Card Padding | 16pt |
| Header Height | Variable (48-80pt) |
| Body Padding | 16pt |
| Footer Height | 48-56pt |
| Card Spacing (grid) | 16pt |
| Shadow Elevation | 2dp (resting), 8dp (raised) |

### Layout Structure (Basic Card)

```
┌─────────────────────────────────────────────────────────────┐
│ [Header]                                                     │
│ Title                                            [Status]    │
│ Subtitle                                                     │
├─────────────────────────────────────────────────────────────┤
│ [Body]                                                       │
│ Content goes here...                                         │
│ - List items                                                 │
│ - Charts                                                     │
│ - Tables                                                     │
│ - KPIs                                                       │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                     │
│                                   [Action 1]   [Action 2]   │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| State | Background | Border | Shadow |
|-------|------------|--------|--------|
| Default | #FFFFFF | 1pt #E5E5E5 | Elevation 2 |
| Pressed | #F5F6F7 (Fiori pressed) | 1pt #E5E5E5 | Elevation 2 |
| Selected | #EBF8FF (Fiori selected) | 2pt #0057D2 | Elevation 4 |
| Hover (tablet) | #FFFFFF | 1pt #C6C6C8 | Elevation 4 |

### GCS App Card Usage

#### Dashboard Cards (Home Screen)

**1. GRN Summary Card**
```typescript
Type: Data Table Card
Header: "GRNs This Month"
Body:
  - Total GRNs: 145
  - Total Items: 2,340
  - Total Weight: 12,500 kg
Footer: "View All GRNs" button
Navigation: → GRN List
```

**2. Recent GRNs Card**
```typescript
Type: List Card
Header: "Recent GRNs"
Body: List of 3-5 recent GRN object cells
Footer: "View All" link
Navigation:
  - Card tap → GRN List
  - Object cell tap → GRN Details
```

**3. Pending Dispatches Card**
```typescript
Type: List Card
Header: "Pending Dispatches"
Body: List of pending dispatch object cells
Footer: Count badge
Navigation: → Dispatch List (filtered)
```

**4. Low Stock Alert Card**
```typescript
Type: List Card with Status
Header: "Low Stock Items" + Critical badge
Body: List of items with low stock
Footer: "View Inventory" button
Navigation: → Stock List (filtered)
```

**5. Invoice Summary Card**
```typescript
Type: Chart Card
Header: "Revenue This Month"
Body: Bar chart or line chart
Footer: Total amount displayed
Navigation: → Invoice List
```

#### Detail Screen Cards

**GRN Details - Items Card**
```typescript
Type: List Card
Header: "Items (24)"
Body: Expandable list of item object cells
Footer: -
Navigation: Item tap → Item Details
```

**GRN Details - Related Dispatches Card**
```typescript
Type: List Card
Header: "Related Dispatches (5)"
Body: List of dispatch object cells
Footer: -
Navigation: Dispatch tap → Dispatch Details
```

### Card Component

```typescript
interface CardProps {
  header?: {
    title: string;
    subtitle?: string;
    status?: {
      label: string;
      color: 'positive' | 'critical' | 'negative' | 'neutral';
    };
    headerImage?: string;
  };
  body: React.ReactNode;
  footer?: {
    actions?: Array<{
      label: string;
      onPress: () => void;
      style?: 'primary' | 'secondary';
    }>;
  };
  onPress?: () => void;
  loading?: boolean;
  error?: boolean;
}

const Card: React.FC<CardProps> = ({
  header,
  body,
  footer,
  onPress,
  loading,
  error,
}) => {
  return (
    <Surface
      style={styles.card}
      elevation={2}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardContent,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Header */}
        {header && (
          <View style={styles.header}>
            {header.headerImage && (
              <Image source={{ uri: header.headerImage }} style={styles.headerImage} />
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>{header.title}</Text>
              {header.subtitle && (
                <Text style={styles.subtitle}>{header.subtitle}</Text>
              )}
            </View>
            {header.status && (
              <Badge style={styles.statusBadge}>{header.status.label}</Badge>
            )}
          </View>
        )}

        {/* Body */}
        <View style={styles.body}>
          {loading ? (
            <SkeletonLoader />
          ) : error ? (
            <EmptyState title="Failed to load" />
          ) : (
            body
          )}
        </View>

        {/* Footer */}
        {footer?.actions && (
          <View style={styles.footer}>
            {footer.actions.map((action, index) => (
              <Button
                key={index}
                mode={action.style === 'primary' ? 'contained' : 'text'}
                onPress={action.onPress}
              >
                {action.label}
              </Button>
            ))}
          </View>
        )}
      </Pressable>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardContent: {
    overflow: 'hidden',
  },
  cardPressed: {
    backgroundColor: '#F5F6F7',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D2D3E',
  },
  subtitle: {
    fontSize: 14,
    color: '#556B82',
    marginTop: 2,
  },
  statusBadge: {
    marginLeft: 8,
  },
  body: {
    padding: 16,
    maxHeight: 520 - 80 - 56, // Max card height - header - footer
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});
```

### Card Layouts

#### List Layout (Vertical Stack)
```typescript
<ScrollView>
  <Card {...card1Props} />
  <Card {...card2Props} />
  <Card {...card3Props} />
</ScrollView>
```

#### Grid Layout (2 columns on tablet)
```typescript
<View style={styles.grid}>
  <View style={styles.column}>
    <Card {...card1Props} />
    <Card {...card3Props} />
  </View>
  <View style={styles.column}>
    <Card {...card2Props} />
    <Card {...card4Props} />
  </View>
</View>

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
  },
});
```

#### Carousel Layout
```typescript
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  <Card {...card1Props} style={{ width: 280 }} />
  <Card {...card2Props} style={{ width: 280 }} />
  <Card {...card3Props} style={{ width: 280 }} />
</ScrollView>
```

### Accessibility

- Card container: `accessibilityRole="button"` (if tappable)
- Card header: `accessibilityRole="header"`
- Card title: Read as part of accessibility label
- Interactive elements: Separate touch targets with proper labels
- Footer actions: `accessibilityRole="button"` for each action

### Best Practices

1. **Single Topic**: Each card focuses on one subject/concept
2. **Scannable**: Keep content concise and easy to scan
3. **Height Limit**: Don't exceed 520pt in height
4. **Clear Actions**: Footer actions should be clear and specific
5. **Loading States**: Always show skeleton loading for async content
6. **Empty States**: Show appropriate message when no data
7. **Navigation**: Make it clear where card tap will navigate
8. **Consistency**: Use same card patterns throughout app
