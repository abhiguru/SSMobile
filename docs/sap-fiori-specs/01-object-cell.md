# SAP Fiori Object Cell - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/table-view-cells/object-cell/

## Intro

An object cell is a table view cell that fits inside the table view container. It is highly customizable to accommodate a wide variety of uses.

## Usage

### Do
- Use an object cell to preview information about an object in an object page.
- Keep consistent height and alignment of all object cells in a table view or list report.

### Don't
- Do not mix object cells with different height and content types in a table view or list report.

---

## Anatomy

### A. Left Icon Stack (Optional)
A set of up to three vertically stacked icons can be displayed on the left of the detail image. These icons provide information about the object, such as whether it is unread or if it has attachments.

### B. Detail Image (Optional)
The detail image provides a visual representation of the object within a **44 pixel** frame. Leveraging the avatar component, the detail image has a **minimum size of 16 pixels** and a **maximum of 60 pixels**. The image may have a square or circular frame depending on the type of object that the object cell represents:
- **Circular frame**: If the object cell represents a user
- **Square frame**: If the object cell represents an object

### C. Main Content
The main content is the main area for text content. It allows for a wide range of component elements:
- Title (mandatory)
- Subtitle
- Footnote
- Caption
- Description
- Rating control
- Avatar stack
- Tags

**The title is the only mandatory content element for the object cell.**

### D. Description (Optional)
A description can be used to provide additional information about the object. The description label offers two display options:
- Truncated after a customizable number of lines (default: 3 lines)
- Configured to display full content

**Location varies by orientation:**
- **Portrait mode**: Appears at the bottom of the main content container
- **Landscape mode**: Appears in its own column (typically longer text)

### E. Attributes
The attributes are a vertically or horizontally stacked arrangement of labels and icon types displayed towards the right side of the object cell. These labels and icons can be used to indicate the condition of the item, such as:
- Priority
- Status

### F. Accessory View (Optional)
The accessory view is used to add secondary action(s) in addition to the primary action of drilling down or as another indicator. Options include:
- Navigational icon (chevron) - triggers push navigation
- Information disclosure icon - brings up a modal
- Single action download
- Overflow menu

---

## Variations

### 1. Vertically Centered and Top-Aligned Object Cell
An object cell comes in two different alignments:
- **Vertically centered alignment**: Elements should be kept to a single line
- **Top alignment**: For multi-line content

### 2. Preview Object Cell
The most common variation. Used to display a preview of an object.
- Uses a **chevron icon** in the accessory view on the right
- Indicates drill down to complete content (usually an object page)

### 3. Quick View Object Cell
Used to display a simple object that doesn't need a full object page.
- Uses an **information disclosure icon** on the right
- Triggers a modal when tapped
- Modal shows additional information and simple actions

### 4. Single Action Object Cell
Used to display an object with a specific action associated with it.
- Examples: downloading a document, adding item to cart
- Uses an **icon or button** on the right indicating the action
- Button can act as a toggle (e.g., "Follow/Unfollow")

---

## Behavior and Interaction

### Select (Edit Mode)
When edit mode is triggered, users can select single or multiple object cells at once to perform actions such as:
- Delete
- Change status
- Other batch operations

### Quick Actions
Quick actions are activated by gestures such as **swipe to delete**.

### Context Menu & Preview
Replacing the legacy Peek and Pop interaction (iOS 13+):
- Users access contextual menu and preview by **long-pressing** an object cell
- Not provided by default - developers add using standard iOS context menu APIs
- Enables quick actions and lightweight previews

### Navigation
| Variation | Icon | Behavior |
|-----------|------|----------|
| Preview | Chevron | Push to full content of object |
| Quick View | Information disclosure | Modal popup with full content |

---

## Adaptive Design

### Compact and Regular Width
The object cell is supported in both regular and compact width layouts:
- Optional description available in regular width
- Width of title content container and description container is flexible

### Compact and Regular Height
The object cell supports layouts with compact height:
- Allows more objects to be exposed on smaller screens

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Detail Image Frame | 44pt (default) |
| Detail Image Min | 16pt |
| Detail Image Max | 60pt |
| Touch Target | 44pt minimum |

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Icon Stack] [Image] [Main Content]      [Attributes] [Acc] │
│              44pt    Title (mandatory)   Status Badge  [>]  │
│                      Subtitle            Value              │
│                      Footnote            Label              │
│                      [Description - portrait only]          │
└─────────────────────────────────────────────────────────────┘
```

### Status Icon Mapping (GCS App)
| Stock Status | Fiori Semantic | Color |
|--------------|----------------|-------|
| Full (≥80%) | Positive | Green #36A41D |
| Partial (20-80%) | Critical | Orange #E9730C |
| Empty (<20%) | Negative | Red #D32030 |
| N/A | Neutral | Blue #0057D2 |
