# SAP Fiori Tab Bar (Bottom Navigation) - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/bars/tab-bar/

## Intro

The tab bar (or: tab view) is a navigation element located at the bottom of a screen. It uses tab items to navigate between mutually exclusive panes of content at the same level of hierarchy within the same view.

## Usage

A tab bar lets users navigate among different areas of an app. Tab items usually consist of:
- Text label
- Icon

This helps users quickly classify content. The label may be omitted only if the icon shown is **universally known and understood**.

### Use it for:
- Enabling navigation between top-level areas

### Don't use it for:
- Performing actions on current view elements (use toolbar component instead)

**Important**: Make sure the tab bar is visible when users navigate to different areas in your app.

---

## Do's and Don'ts

### Do
- Keep label text short and concise (no more than **25 characters** including spaces)
- Use concrete nouns or verbs as tab labels
- Use "More" tab as overflow menu if iPhone app needs more than 5 tab items
- Use "More" tab as overflow menu if iPad app needs more than 6 tab items
- Use icon-only tab items only if represented by universally recognized icons:
  - Store
  - Search
  - Basket
  - Profile
- Use **filled icon** for active tab
- Use **default icons (unfilled)** for unselected tabs

### Don't
- Don't mix tab items with labels and icon-only ones
- Don't use more than **5 tab items** in compact width (iPhone)
- Don't use more than **6 tab items** in regular width (iPad)
- Don't remove tabs when content is currently unavailable (explain why instead)

---

## Anatomy

### A. Tab Bar Container
Contains active and inactive tab items. Should always be visible when navigating to different areas.

### B. Tab Icon
Represents the content of its tab.
- **Portrait orientation**: Icons appear above tab labels
- **Landscape orientation**: Icons and labels can appear side by side

### C. Active Tab
The selected, active tab item should:
- Display **filled variant** of icon
- Be colored in **tint color** to stand out from inactive tabs

### D. Inactive Tabs
Display the **unfilled variant** of the icon.

### E. Notification Badge
- **Red badge** appears on tab item if associated tab has active notification
- Can display **number of notifications** with white text

### F. Tab Label
Represents the content of the tab. Should be:
- Understandable
- Short
- Concise

---

## Behavior and Interaction

### Tab Selection
- When inactive tab is selected, it becomes active
- Users are directed to content of that tab
- Visually highlighted by:
  - Tint color
  - Filled icon

### Scrollable Content
When content exceeds screen size and users can scroll, **tab bar remains fixed at bottom** of screen.

### Haptic Feedback for Tab Selection
When a specific tab is selected:
- User receives haptic feedback (slight vibration)
- **Selection feedback generator** indicates change in selection (active/inactive tab)

### Haptic Feedback for Notifications
When new message arrives in one of the existing tabs:
- User receives slightly stronger haptic feedback
- **Notification feedback generator** indicates incoming notification

**Note**: System determines whether to play haptics based on:
- Device has supported Taptic Engine
- App running in foreground
- System Haptics setting is enabled

### "More" Tab (Overflow)
When not enough horizontal space to display all tabs:
- Trailing tab becomes "More" tab (overflow tab)
- Displays remaining items in a list on separate screen

**Warning**: Limit use of "More" tab to prevent content from being hidden and overlooked.

---

## Adaptive Design

### Spacing and Layout
- Tab bar spacing follows global layout margins of iOS size classes
- Uses **100% of screen width**
- Different tabs are equally distributed across container

### Tab Item Limits
| Device | Max Tab Items |
|--------|---------------|
| Compact width (iPhone) | 5 |
| Regular width (iPad) | 6 |

### Translucency
By default, tab bar is:
- Translucent with blur effect
- Helps people retain context by providing visible reminder of background content

### Keyboard Behavior
Tab bar **hides when keyboard is on screen**.

### iPad Consideration
In iPadOS app, consider using a **sidebar** instead of tab bar:
- Sidebar can display large number of items
- Makes navigating iPad app more efficient

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Tab Bar Height | 49pt (compact), 65pt (regular) |
| Icon Size | 24pt × 24pt (recommended) |
| Touch Target | 44pt minimum height per tab |
| Label Font Size | 10pt (default) |
| Badge Size | 18pt diameter (min) |

### Layout Structure (Portrait)
```
┌─────────────────────────────────────────────────────────────┐
│  [Icon]    [Icon]    [Icon]    [Icon]    [Icon]            │
│   Home      GRN     Dispatch  Invoice   Profile            │
│  (filled)  (outline) (outline) (outline) (outline)         │
│  (orange)   (gray)    (gray)    (gray)    (gray)           │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (Landscape - Optional)
```
┌─────────────────────────────────────────────────────────────┐
│ [Icon] Home  [Icon] GRN  [Icon] Dispatch  [Icon] Invoice   │
│ [Icon] Profile                                              │
└─────────────────────────────────────────────────────────────┘
```

### GCS App Tab Bar Structure

| Tab Position | Label | Icon | Route |
|--------------|-------|------|-------|
| 1 (Left) | Home | home | /index |
| 2 | GRN | clipboard-list | /grn |
| 3 | Dispatch | truck-delivery | /dispatch |
| 4 | Invoices | receipt | /invoices |
| 5 (Right) | Profile | account-circle | /profile or /settings |

### Color States
| State | Icon | Label | Background |
|-------|------|-------|------------|
| Active | Filled, Primary Orange (#f69000) | Primary Orange | Tint/Highlight (optional) |
| Inactive | Outline, Gray (#7e8e9d) | Gray | Transparent |
| Badge | Red (#D32030) | White text | Red background |

### Haptic Feedback Implementation
```typescript
import { Vibration } from 'react-native';

// Tab selection feedback (light)
Vibration.vibrate(10);

// Notification feedback (stronger)
Vibration.vibrate([0, 20, 10, 20]);
```

### Notification Badge
- Position: Top-right corner of icon
- Size: 18pt diameter (or larger for 2+ digit numbers)
- Color: Red (#D32030)
- Text color: White
- Font size: 11pt, bold
