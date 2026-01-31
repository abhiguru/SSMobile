# SAP Fiori Data Table - iOS Design Specification

> Source: SAP Fiori for iOS Design Guidelines

## Intro

A data table is a range of labeled columns and rows used to present numbers, text, or even images. Generally, data tables are a grid layout of columns and rows.

The horizontal scrollable data table with a sticky header and column is available in both compact and regular screen sizes. Alternatively, the data table will be converted to a list report by default in compact width if horizontal scrolling is not available.

---

## Usage

### Do
- Use data tables when users need to compare multiple attributes across items in a large data set
- Use data tables in compact screen sizes with horizontal scrolling and sticky headers

### Don't
- Don't use data tables in preview views
- Don't use data tables when users don't need to compare multiple attributes across the items

---

## Anatomy

### A. Header Row
A header row is always at the top of the data table. The row contains key data label of each column and always sticks to the top during scrolling.

### B. Rows of Data
Each row represents one instance of data. Each column inside a row represents each attribute of the instance. The leftmost column can be persistent and stick to the left of the screen.

### C. Persistent Column (Optional)
The first column can be set to be persistent which allows the column to stick to the left during scrolling.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [A] HEADER ROW (sticky)                                                     │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│ [C] Sticky   │  Column 2    │  Column 3    │  Column 4    │  Column 5      │
│    Column    │              │              │              │                │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│ [B] Row 1    │  Data        │  Data        │  Data        │  Data          │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│     Row 2    │  Data        │  Data        │  Data        │  Data          │
├──────────────┼──────────────┼──────────────┼──────────────┼────────────────┤
│     Row 3    │  Data        │  Data        │  Data        │  Data          │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────┘
                              ← Horizontal Scroll →
```

---

## Behavior and Interaction

### Bulk Actions
The data table allows multi-selection. The user can choose to take further actions with the selected items.

- Display toolbar with action buttons after selection
- Show selection count indicator
- Provide "Select All" / "Deselect All" options

### Add a Data Row
The "+" button, which can appear on the navigation bar or in an inline cell button, allows users to add a new data row to the current data table.

**Behavior:**
- Added data appears at the location following the current order direction rules
- Example: If table is ordered by timestamp, the added row appears as the top row
- Screen scrolls to the location where the added row appears
- Highlight background color applied, then fades away

### Edit a Data Row
An edit action can either be:
- Triggered after drill-down to see object details
- Triggered after tapping the "Edit" button within a row

### Edit Data In-line
In-line edit mode is triggered after tapping the "Edit" button in the navigation bar.

**Features:**
- Edit multiple data cells in-line without drilling down to object detail pages
- Tap on any available data table cell to edit
- Active cell has highlighted stroke and text background
- Tap "Done" button in navigation bar to save and exit

**Error Handling:**
- Invalid entry: Cell highlighted in red + error banner
- If user deselects cell: Red underline remains + error banner displayed

**Supported Data Types:**
- Text
- Duration
- Time
- Date
- List Picker

### Read-Only State
If a data table cell can't be edited in the in-line editing mode:
- Display as read-only cell with grey background
- On tap: Show toast message indicating cell is read-only

---

## Adaptive Design

### Compact Width (iPhone)
- Data table converts to list report by default
- If horizontal scroll is enabled: Show data table with horizontal scroll
- Sticky headers remain functional

### Regular Width (iPad)
- Full data table display
- Horizontal scrolling available
- Persistent/sticky first column supported

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Header Row Height | 44pt (min touch target) |
| Data Row Height | 44pt (min), 48-56pt (comfortable) |
| Column Min Width | 80pt |
| Sticky Column Width | Auto (content-based) or fixed |
| Cell Padding | 12pt horizontal, 8pt vertical |
| Font Size (Header) | 13pt, Semibold |
| Font Size (Data) | 15pt, Regular |

### Color Tokens
| Element | Color |
|---------|-------|
| Header Background | #F7F9FA (gray50) |
| Header Text | #1D2D3E (textPrimary) |
| Row Background (default) | #FFFFFF |
| Row Background (alternate) | #F7F9FA |
| Row Background (selected) | #FFF4E6 (primaryLight) |
| Row Background (highlight/new) | #FFF4E6 → fade to #FFFFFF |
| Border/Divider | #E5E5E5 |
| Active Cell Stroke | #f69000 (primary) |
| Error Cell Background | #FFF4F2 (negativeLight) |
| Error Cell Border | #D32030 (negative) |
| Read-Only Background | #F5F6F7 |
| Selection Checkbox | #f69000 (primary) |

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Navigation Bar with Edit/Done button]                      │
├─────────────────────────────────────────────────────────────┤
│ [Toolbar - shown when items selected]                       │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  STICKY      │           SCROLLABLE AREA                    │
│  COLUMN      │                                              │
│              │  ┌─────────┬─────────┬─────────┬─────────┐  │
│  Header      │  │ Header  │ Header  │ Header  │ Header  │  │
│  ───────     │  ├─────────┼─────────┼─────────┼─────────┤  │
│  Row 1       │  │  Data   │  Data   │  Data   │  Data   │  │
│  Row 2       │  │  Data   │  Data   │  Data   │  Data   │  │
│  Row 3       │  │  Data   │  Data   │  Data   │  Data   │  │
│              │  └─────────┴─────────┴─────────┴─────────┘  │
│              │              ← scroll →                      │
└──────────────┴──────────────────────────────────────────────┘
```

### Component Structure
```typescript
interface DataTableColumn {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sticky?: boolean;        // First column only
  sortable?: boolean;
  editable?: boolean;
  dataType?: 'text' | 'number' | 'date' | 'time' | 'duration' | 'picker';
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps {
  columns: DataTableColumn[];
  data: Record<string, any>[];

  // Selection
  selectable?: boolean;
  multiSelect?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // Editing
  editable?: boolean;
  onEdit?: (rowId: string, columnKey: string, value: any) => void;

  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;

  // Actions
  onRowPress?: (row: Record<string, any>) => void;
  onAddRow?: () => void;

  // Layout
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  alternateRowColors?: boolean;

  // Compact conversion
  convertToListOnCompact?: boolean;
}
```

### Accessibility
- Header cells: `accessibilityRole="columnheader"`
- Data cells: `accessibilityRole="cell"`
- Rows: `accessibilityRole="row"`
- Selection state: `accessibilityState={{ selected: isSelected }}`
- Sort state: Announce sort direction when header tapped
- Read-only cells: `accessibilityHint="This cell is read-only"`

### Haptic Feedback
```typescript
// Row selection
Vibration.vibrate(10);

// Edit mode enter/exit
Vibration.vibrate(15);

// Error on invalid input
Vibration.vibrate([0, 20, 10, 20]);
```

### Animation Specs
| Animation | Duration | Easing |
|-----------|----------|--------|
| New row highlight fade | 2000ms | ease-out |
| Selection background | 200ms | ease-in-out |
| Edit mode transition | 300ms | ease-in-out |
| Error shake | 300ms | spring |

### GCS App Data Table Use Cases
| Screen | Data | Columns | Sticky Column |
|--------|------|---------|---------------|
| Invoice Line Items | Dispatch items | Item, Qty, Rate, Days, Charge | Item Name |
| Stock Summary | Item stock | Item, Rack, Qty, Weight | Item Name |
| GRN Items | Received items | Item, Qty, Weight, Rack | Item Name |
| Dispatch Items | Dispatched items | Item, GRN, Qty, Date | Item Name |
