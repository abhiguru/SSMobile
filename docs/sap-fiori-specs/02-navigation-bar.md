# SAP Fiori Navigation Bar - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/bars/navigation-bar/

## Intro

The navigation bar is an integral part of the screen that indicates the position of the user within the app and contains the page-level control actions.

## Usage

Use a navigation bar to represent the navigation hierarchy of the current page to the user.

### Character Limits
| Element | Max Characters |
|---------|----------------|
| Title (no subtitle) | 37 characters (including spaces) |
| Title (with subtitle) | 24 characters (including spaces) |
| Title wrapping | Up to 2 lines, then truncated (only if no subtitle) |

### Action Button Limits
| Device | Max Actions (Right Side) |
|--------|--------------------------|
| Compact width (iPhone) | 3 actions |
| Regular width (iPad) | 4 actions |

If your app needs more actions, display only the most important actions and use an **overflow menu** to accommodate additional actions.

---

## Do's and Don'ts

### Do
- Keep the default title and large title text short and concise
- Title text should be no longer than 37 characters (including spaces)
- Title can wrap up to two lines, then truncate (if no subtitle)
- If navigation bar has title AND subtitle, limit title to 24 characters
- Use an overflow button or pull-down button if too many page-level actions
- Ensure consistency of "Close", "Cancel", and "Back" button positions (generally on left side)
- If "Back" button text is too long, the text can be omitted
- In compact width (iPhone), try to use symbol buttons if possible
- Use label buttons if there is no suitable or understandable icon for the action

### Don't
- Don't show more than 3 buttons on the right side in compact width (iPhone)
- Don't provide multiple similar actions (e.g., if "Back" and "Save" trigger same action, use one button)
- Don't truncate text on label buttons - choose more concise words instead
- Don't wrap the title if there is also a subtitle used

---

## Anatomy

### A. Left Accessory
Typically contains:
- "Profile" button
- "Back" button
- "Cancel" button

Shows where the user comes from and offers action to navigate back.

### B. Large Title
The large version of the title. Hidden when the default title is shown.

### C. Title
The heading of the entire page. Options:
- Default small title
- Large title
- Optional subtitle (in addition to main title)

The default title is hidden when the large title is visible.

### D. Right Accessory
Typically contains page-level actions.

### E. Search Bar
Can be persistent inside the navigation bar. Generally used as global search.

---

## Text vs. Icon Buttons

**Recommendation**: Use text for actions to make it clearer which action is being performed.

**Exception**: Label may be omitted only if the icon is universally known and understood:
- Add icon (+)
- Filter icon
- Search icon
- Close icon (×)

---

## Behavior and Interaction

### Visibility of Default Title and Large Title
- When using large title, default (small) title is hidden
- Default title appears when large title is scrolled out of screen
- When using object header component, use navigation bar without additional title to avoid redundancy
- Object header's title transitions into navigation bar on scroll

### Long Title Handling
If title gets truncated, user can **press and hold** on the title to display full text in a popover.

### History Stack via Long-Press on Back Button
- Tap and hold "Back" button opens contextual menu
- Shows previously visited pages (history stack)
- Breadcrumb-like vertical navigation
- Helps users jump back to first page

**Tip**: For apps with complex object hierarchy, provide a one-time in-product feature announcement (tooltip) for the history stack function.

---

## Adaptive Design

The navigation bar spacing follows the global layout margins of iOS size classes.

### iPhone vs iPad Differences
- Number of buttons can differ between iPhone and iPad
- Some toolbar buttons (iPhone) can move to navigation bar (iPad)
- Some navigation bar buttons can move to sidebar (iPad)
- UI elements like avatar may move from navigation bar to sidebar on iPad

---

## Variations

### 1. Large Title
- **Optional** - emphasizes page content and purpose
- Use for primary screens and list views
- Scrolls away to reveal default title

### 2. Logo
- App logo can be placed on left side of navigation bar (home page)
- **Recommended height**: 24pt
- **Maximum height**: 30pt (exceptional cases only)
- Scale correctly to avoid distortion

### 3. Screen without Navigation Bar
Some screens may not need a navigation bar if:
- Page information is already in content area
- Page-level actions are provided elsewhere

### 4. Search Field within Navigation Bar

**iPad**:
- Navigation bar can include search field
- No large title in this variant
- Left-aligned default title
- Alternative: search field below title

**iPhone**:
- Always use search field **below** the navigation bar

---

## Implementation Notes for React Native

### Key Dimensions
| Element | Size |
|---------|------|
| Navigation Bar Height | 44pt (standard) |
| Large Title Height | 52pt additional |
| Logo Max Height | 24-30pt |
| Touch Target | 44pt minimum |
| Icon Button Size | 24pt icon within 44pt touch target |

### Layout Structure (Compact Width)
```
┌─────────────────────────────────────────────────────────────┐
│ [Back/Profile]     [Title]              [Action] [Action] [+]│
│                    [Subtitle]                                │
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (With Large Title)
```
┌─────────────────────────────────────────────────────────────┐
│ [Back]                                  [Action] [Action] [+]│
├─────────────────────────────────────────────────────────────┤
│ Large Title                                                  │
│ [Search Bar - optional]                                      │
└─────────────────────────────────────────────────────────────┘
```

### GCS App Navigation Bar Actions by Screen

| Screen | Left | Right Actions |
|--------|------|---------------|
| GRN List | Profile Avatar | Filter, Add |
| GRN Details | Back | Edit, Print, More |
| GRN Form | Cancel/Back | Save (Step 3 only) |
| Dispatch List | Profile Avatar | Filter, Add |
| Invoice List | Profile Avatar | Filter, Add |
| Settings | Back | - |
