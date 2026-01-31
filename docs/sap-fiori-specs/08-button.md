# SAP Fiori Button - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/buttons/button/

## Intro

Buttons allow users to perform actions, make decisions, or to begin a process. The label of a button communicates the action that it is going to initiate.

## Usage

### Do
- Use buttons only for actions
- Use simple buttons for specific actions:
  - "Create", "Edit", "Save"
  - "Approve", "Reject"
  - "Accept", "Decline"
  - "Submit", "Cancel"
- Use button labels that are short and meaningful
- Use **commands** for all button labels (e.g., "Save", "Cancel", "Edit")
- Use toggle buttons to activate/deactivate an element or switch between states
- Use secondary buttons in **tint style** for positive actions
- Use secondary buttons in **negative style** for negative and destructive actions

### Don't
- Don't use too many buttons (prevents decision paralysis)
  - Consider using segmented control instead for selecting from small group
- Don't use green buttons for positive actions
- Don't truncate labels in buttons

---

## Anatomy

A button can consist of:
- Label only
- Symbol (icon) only
- Label + symbol

Background:
- Filled rectangular background with rounded corners
- Unfilled (text only)

---

## Behavior and Interaction

### Button States

#### A. Active State
Indicates a button's interactivity (default, ready to tap).

#### B. Tap State (Pressed)
Communicates that the button has been pressed.

#### C. Disabled State
Discloses that action is available but has been disabled.

#### D. Keyboard Focus State
Indicates button is focused when navigating with keyboard.

#### E. VoiceOver Focus State
Indicates button is a focus target during VoiceOver interaction.

---

## Variations

### Button Types

SAP Fiori has three button types based on action priority:

#### 1. Primary Button
**Use for**: The most important action in the view

**Examples**:
- Sign-in screen
- Landing screen
- Confirmation screen
- Error screen
- Screen with explicit primary action

**Style**: Always filled

**Actions**:
- Activate
- Confirm
- Continue
- Create
- Sign in
- Scan

**Rule**: Only **one primary action** per view

#### 2. Secondary Button
**Use for**: Actions that are optional or have lower priority

**Examples**:
- "Dismiss" button on a card
- "Cancel" alongside "Save"
- "Skip" alongside "Continue"

**Style**: Can be tint, normal, or negative

#### 3. Tertiary Button
**Use for**: Actions with lowest priority or in navigation bar

**Examples**:
- Icon buttons in navigation bar
- Less important actions in lists
- Supporting actions

**Style**: Minimal styling (text or icon only)

---

### Toggle Button

Toggle buttons change between **secondary tint** and **secondary normal** style.

**Use for**:
- Direct action on object (no navigation required)
- Switching between states

**Examples**:
- Follow / Unfollow
- Select / Selected
- Bookmark / Bookmarked
- Favorite / Unfavorite
- Hold / Release

---

### Loading State Button

Applied when user-triggered non-disruptive progress is being processed.

**Behavior**:
- Original icon and/or text replaced with activity indicator and/or loading message
- Color and style follows tap state button
- Label is optional (especially in limited space)

#### Variants

**1. Auto-Width Loading Button**
- When there is only one button in container
- Button width changes according to text length
- Shows full loading message

**2. Fixed-Width Loading Button**
- When one or multiple buttons in container
- Button width stays fixed to default state width
- Can hide text-loading message, show only activity indicator
- **Recommended**: Change other buttons to disabled state during progress

**3. Full-Width Loading Button**
- When one or multiple buttons in container
- Button width changes to full width of container
- Shows full loading message
- Other buttons hidden until loading process finishes

#### Loading States

**A. Processing State**
- Activity indicator replaces original icon and/or label
- Keeps rotating until process completes
- **Apply animation when**: Processing time > 1000ms (1 second)

**B. Success State**
- Indicator replaced with success icon (✓)
- Text replaced with success message
- Success state remains for **3 seconds**
- Then automatically changes to next item

**C. Fail State**
- Text replaced with error message
- Buttons become user action options to proceed with error state

---

## Button Sizes

**Important**: Touch area of button should not be less than **44pt**.

### 1. Auto-Width Buttons
- Button container grows automatically to fit text size
- Default fixed height: **38pt**
- **Recommended for**: Within components (e.g., within object cell)

### 2. Standalone Buttons
- Fixed width: **201pt**
- Height: **44pt**
- **Recommended for**: Standalone pages (onboarding, sign-in)
- Pages with one topic and one or more actions in focus

### 3. Full-Width Buttons
- Automatically fill entire container
- Padding: **16pt** on left and right side
- **Recommended for**: Vertical button stacks

**Note**: Buttons within toolbar always have height of **38pt** to save vertical space.

---

## Button Styles

Button styles work in tandem with button types to enhance UI.

SAP Fiori Horizon has three main button styles:
1. **Tint Style**
2. **Normal Style**
3. **Negative Style**

**Note**: "Normal" style in secondary category does not include primary button counterpart.

---

### Tint Style

Emphasizes available actions and encourages user interaction.

**Primary button's default style** is tint (no separate "primary tint").

#### Usage: Primary Tint
- Use for primary actions
- **Only one action** on screen should use primary style

#### Usage: Secondary Tint
- Several actions with same importance
- When used with negative actions, use for **positive action**

#### Usage: Tertiary Tint
- Action placed within navigation bar
- Action has lowest priority compared to others on screen

---

### Normal Style

Reflects intermediate level of visual hierarchy.

**Use for**: Actions with medium priority

#### Usage: Secondary Normal
- Multiple buttons within a view
- Want to visually highlight priority of different actions
- **Tint style always reflects higher importance than normal style**
- Usage depends on app context (decide at app level)

#### Usage: Tertiary Normal
- Actions with low importance
- Usage depends on app context (decide at app level)

---

### Negative Style

Indicates destructive actions. Warns users to take extra precautions.

#### Usage: Secondary Negative
- Several actions with same importance
- One or more is negative/destructive

**Examples**:
- "Delete"
- "Remove"
- "Cancel Order"

#### Usage: Tertiary Negative
- Several negative actions within page (e.g., within object cells)
- Negative button has lowest importance

---

## Implementation Notes for React Native

### Key Dimensions

| Size Type | Width | Height | Min Touch |
|-----------|-------|--------|-----------|
| Auto-Width | Dynamic | 38pt | 44pt |
| Standalone | 201pt | 44pt | 44pt |
| Full-Width | 100% - 32pt | 44pt | 44pt |
| Toolbar | Dynamic | 38pt | 44pt |
| Icon Button | 44pt | 44pt | 44pt |

### Typography

| Button Type | Font Size | Font Weight | Letter Spacing |
|-------------|-----------|-------------|----------------|
| Primary | 17pt | Semibold (600) | -0.41pt |
| Secondary | 17pt | Semibold (600) | -0.41pt |
| Tertiary | 17pt | Regular (400) | -0.41pt |

### Spacing

| Element | Value |
|---------|-------|
| Horizontal Padding | 16pt |
| Vertical Padding | 11pt (for 44pt height) |
| Icon-Text Gap | 8pt |
| Corner Radius | 8pt |
| Min Width (auto) | 64pt |

### Color Scheme

#### Primary Tint Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | #f69000 (primary) | #FFFFFF | None |
| Pressed | #dd8200 (primary-700) | #FFFFFF | None |
| Disabled | #f69000 @ 30% opacity | #FFFFFF @ 50% | None |

#### Secondary Tint Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #f69000 (primary) | 1pt #f69000 |
| Pressed | #fff4e6 (primary-50) | #dd8200 | 1pt #dd8200 |
| Disabled | Transparent | #f69000 @ 30% | 1pt #f69000 @ 30% |

#### Secondary Normal Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #1D2D3E (text primary) | 1pt #E5E5E5 |
| Pressed | #F5F6F7 | #1D2D3E | 1pt #C6C6C8 |
| Disabled | Transparent | #1D2D3E @ 30% | 1pt #E5E5E5 @ 30% |

#### Secondary Negative Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #D32030 (negative) | 1pt #D32030 |
| Pressed | #FFF4F2 (negative light) | #AA161F | 1pt #AA161F |
| Disabled | Transparent | #D32030 @ 30% | 1pt #D32030 @ 30% |

#### Tertiary Tint Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #f69000 | None |
| Pressed | #fff4e6 (primary-50) | #dd8200 | None |
| Disabled | Transparent | #f69000 @ 30% | None |

#### Tertiary Normal Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #1D2D3E | None |
| Pressed | #F5F6F7 | #1D2D3E | None |
| Disabled | Transparent | #1D2D3E @ 30% | None |

#### Tertiary Negative Button
| State | Background | Text | Border |
|-------|------------|------|--------|
| Active | Transparent | #D32030 | None |
| Pressed | #FFF4F2 | #AA161F | None |
| Disabled | Transparent | #D32030 @ 30% | None |

### GCS App Button Usage

| Screen | Action | Button Type | Style |
|--------|--------|-------------|-------|
| Login | Sign In | Primary | Tint |
| GRN Form Step 1-2 | Next | Primary | Tint |
| GRN Form Step 3 | Save | Primary | Tint |
| GRN Form | Cancel | Secondary | Normal |
| GRN Details | Edit | Secondary | Tint |
| GRN Details | Print | Secondary | Tint |
| GRN Details | Delete | Secondary | Negative |
| Navigation Bar | Add (+) | Tertiary | Tint |
| Navigation Bar | Filter | Tertiary | Tint |
| Filter Sheet | Apply | Primary | Tint |
| Filter Sheet | Reset | Tertiary | Normal |
| Filter Sheet | Cancel | Tertiary | Normal |

### Loading Button Implementation

```typescript
const [isLoading, setIsLoading] = useState(false);
const [loadingState, setLoadingState] = useState<'processing' | 'success' | 'fail'>('processing');

const handleSubmit = async () => {
  setIsLoading(true);
  setLoadingState('processing');

  try {
    await saveGRN();
    setLoadingState('success');
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('GRNList');
    }, 3000); // Success state shows for 3 seconds
  } catch (error) {
    setLoadingState('fail');
    // Show error options
  }
};

// Render
{isLoading ? (
  loadingState === 'processing' ? (
    <ActivityIndicator /> + "Saving..."
  ) : loadingState === 'success' ? (
    <CheckIcon /> + "Saved!"
  ) : (
    "Failed to save" + <RetryButton />
  )
) : (
  "Save"
)}
```

### Accessibility

- Button: `accessibilityRole="button"`
- Primary button: `accessibilityHint="Primary action"`
- Disabled button: `accessibilityState={{ disabled: true }}`
- Loading button: `accessibilityLabel="[Action] in progress"`
- Success state: Announce "Success" via screen reader
- Toggle button: `accessibilityState={{ selected: true/false }}`
