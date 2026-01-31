# SAP Fiori Linear Progress Indicator - iOS Design Specification

> Source: SAP Fiori for iOS Design Guidelines - Progress Indicators

## Intro

Linear progress indicators display the length of a process or express an unspecified wait time. They inform users about the status of ongoing processes such as loading data, submitting a form, or saving updates.

## Usage

### Do
- Use linear progress indicators for operations that take more than 1 second
- Show determinate progress when the completion percentage is known
- Show indeterminate progress when duration is unknown
- Place at the top of the content area or within cards/sections
- Use semantic colors to indicate status (success, warning, error)

### Don't
- Don't use for operations that complete in less than 1 second
- Don't stack multiple progress indicators
- Don't use without context - always provide a label or description
- Don't animate when progress is at 0% or 100%

---

## Anatomy

A linear progress indicator consists of:
1. **Track** - Background bar showing the total length
2. **Indicator** - Filled portion showing progress
3. **Label** (optional) - Text describing the operation
4. **Percentage** (optional) - Numeric progress value

---

## Variations

### 1. Determinate Progress

Shows specific progress amount when percentage is known.

**Use for:**
- File uploads/downloads
- Form submission progress
- Data synchronization
- Multi-step processes

### 2. Indeterminate Progress

Animated indicator when duration is unknown.

**Use for:**
- Initial data loading
- Search operations
- Network requests with unknown duration

### 3. Segmented Progress

Multiple segments showing different categories or stages.

**Use for:**
- Stock vs Dispatched quantities (like in GRN)
- Multi-category breakdown
- Budget allocation views

---

## States

### A. Active State
Progress is ongoing, indicator is animating or updating.

### B. Success State
Process completed successfully. Track turns green briefly.

### C. Error State
Process failed. Track turns red with error indicator.

### D. Paused State
Process is paused. Indicator stops animating.

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Value |
|---------|-------|
| Track Height (Default) | 4pt |
| Track Height (Prominent) | 8pt |
| Corner Radius | height / 2 |
| Min Width | 100pt |
| Label Gap | 8pt |

### Typography

| Element | Font Size | Font Weight |
|---------|-----------|-------------|
| Label | 13pt | Regular (400) |
| Percentage | 13pt | Semibold (600) |

### Color Scheme

#### Default Progress (Brand)
| Element | Color |
|---------|-------|
| Track Background | #E5E5E5 |
| Indicator (Active) | #f69000 (primary) |
| Indicator (Indeterminate) | #f69000 with animation |

#### Semantic Progress
| Status | Track | Indicator |
|--------|-------|-----------|
| Success | #e8f4f4 | #53b1b1 |
| Warning | #fef3c7 | #f6c624 |
| Error | #FFF4F2 | #D32030 |
| Info | #EBF8FF | #0057D2 |

#### Segmented Progress (GRN Style)
| Segment | Color | Usage |
|---------|-------|-------|
| Stock | #53b1b1 (success) | Items in stock |
| Dispatched | #6366f1 (indigo) | Items dispatched |
| Empty | #E5E5E5 (gray) | Remaining capacity |

### Animation

| Property | Value |
|----------|-------|
| Duration (determinate) | 300ms |
| Duration (indeterminate cycle) | 1500ms |
| Easing | ease-in-out |

---

## React Native Component Structure

```typescript
// FIORI Constants
const FIORI_PROGRESS = {
  track: {
    height: 4,
    heightProminent: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 2, // height / 2
  },
  indicator: {
    default: '#f69000',
    success: '#53b1b1',
    warning: '#f6c624',
    error: '#D32030',
    info: '#0057D2',
  },
  typography: {
    label: {
      fontSize: 13,
      fontWeight: '400',
      color: '#556B82',
    },
    percentage: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1D2D3E',
    },
  },
  animation: {
    duration: 300,
    indeterminateDuration: 1500,
  },
} as const;
```

### Determinate Progress Example

```tsx
interface LinearProgressProps {
  progress: number; // 0 to 1
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'default' | 'prominent';
  label?: string;
  showPercentage?: boolean;
}

const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  variant = 'default',
  size = 'default',
  label,
  showPercentage = false,
}) => {
  const trackHeight = size === 'prominent' ? 8 : 4;
  const indicatorColor = FIORI_PROGRESS.indicator[variant];
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={styles.percentage}>{percentage}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height: trackHeight }]}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: `${percentage}%`,
              backgroundColor: indicatorColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#556B82',
  },
  percentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D2D3E',
  },
  track: {
    width: '100%',
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicator: {
    height: '100%',
    borderRadius: 2,
  },
});
```

### Segmented Progress Example (Stock/Dispatch)

```tsx
interface SegmentedProgressProps {
  segments: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
  total: number;
  size?: 'default' | 'prominent';
}

const SegmentedProgress: React.FC<SegmentedProgressProps> = ({
  segments,
  total,
  size = 'default',
}) => {
  const trackHeight = size === 'prominent' ? 8 : 4;

  return (
    <View style={[styles.track, { height: trackHeight }]}>
      {segments.map((segment, index) => {
        const width = total > 0 ? (segment.value / total) * 100 : 0;
        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                flex: segment.value,
                backgroundColor: segment.color,
              },
            ]}
          />
        );
      })}
    </View>
  );
};
```

---

## GCS App Usage

| Screen | Progress Type | Usage |
|--------|---------------|-------|
| GRN Hero Header | Segmented | Stock vs Dispatched breakdown |
| Image Upload | Determinate | Upload progress percentage |
| Print Job | Determinate/Indeterminate | Print job status |
| Data Loading | Indeterminate | Initial page loads |
| Form Submit | Indeterminate | Save operations |

---

## Accessibility

- Progress bar: `accessibilityRole="progressbar"`
- Determinate: `accessibilityValue={{ min: 0, max: 100, now: percentage }}`
- Indeterminate: `accessibilityLabel="Loading in progress"`
- Include text alternative for screen readers
- Announce completion state changes

---

## Best Practices

1. **Context is Key**: Always pair with descriptive text
2. **Appropriate Duration**: Only show for operations > 1 second
3. **Smooth Animation**: Use 300ms transitions for determinate updates
4. **Success Feedback**: Flash green briefly on completion
5. **Error Recovery**: Provide retry action on failure
6. **Accessible**: Include ARIA attributes for screen readers
