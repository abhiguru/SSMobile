# SAP Fiori Switch - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/inputs-and-selections/switch/

## Intro

A switch form cell is used to toggle two mutually exclusive states: **on** and **off**.

**Purpose**:
- Control availability of related UI elements on current screen
- Should always be used in a table cell

**States**:
- Off (default)
- On (enabled)

---

## Behavior and Interaction

To change the state of a switch form cell:
- User can **tap on the toggle button**
- Switch animates between states
- Immediate feedback (no confirmation needed)

---

## Variations

### 1. Switch without Further Selection

The label describes what the switch control is for.

**Behavior**:
- When switch is enabled, the value changes to "On"
- Simple on/off toggle
- No additional configuration needed

**Example**:
```
┌─────────────────────────────────────────────────────────────┐
│ Enable Notifications                              [Switch]  │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Switch with Further Selection

**Important**: Avoid adding text to describe the value of a switch form cell.

If switch form cell requires further definition:
- Add a **cell row** through which user can drill down for additional information
- Additional cell row appears when switch is enabled

**Examples of additional cells**:
- Date picker
- List picker
- Time picker
- Text input

**Example**:
```
┌─────────────────────────────────────────────────────────────┐
│ Schedule Backup                                   [Switch]  │
├─────────────────────────────────────────────────────────────┤
│ Backup Time                                    10:00 PM  [>]│  ← Only visible when switch is ON
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Cell Height | 44pt (minimum) |
| Switch Width | 51pt (iOS standard) |
| Switch Height | 31pt (iOS standard) |
| Switch Track Width | 51pt |
| Switch Thumb Diameter | 27pt |
| Label Font Size | 17pt (iOS body text) |
| Label Font Weight | Regular (400) |
| Horizontal Padding | 16pt |
| Label-Switch Gap | 12pt |

### Layout Structure (Simple Switch)

```
┌─────────────────────────────────────────────────────────────┐
│ Enable Notifications                              [○──────] │  ← OFF
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Enable Notifications                              [──────●] │  ← ON
└─────────────────────────────────────────────────────────────┘
```

### Layout Structure (With Further Selection)

```
┌─────────────────────────────────────────────────────────────┐
│ Auto-Sync                                         [──────●] │
├─────────────────────────────────────────────────────────────┤
│ Sync Interval                                     Daily  [>]│
├─────────────────────────────────────────────────────────────┤
│ Last Synced                                  2 hours ago    │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

| State | Track Color (Off) | Track Color (On) | Thumb Color |
|-------|-------------------|------------------|-------------|
| iOS Default | #E5E5E5 (gray) | #34C759 (green) | #FFFFFF |
| Fiori Custom | #E5E5E5 (gray) | #f69000 (primary) | #FFFFFF |
| Disabled (off) | #E5E5E5 @ 50% | - | #FFFFFF @ 50% |
| Disabled (on) | - | #34C759 @ 50% or #f69000 @ 50% | #FFFFFF @ 50% |

**Recommendation**: Use iOS default green (#34C759) for on state to maintain platform consistency, unless brand requires primary color.

### GCS App Switch Usage

#### Settings Screen

**1. Notification Preferences**
```typescript
Label: "Enable Notifications"
Default: On
Further Selection: None
```

**2. GRN Notifications**
```typescript
Label: "GRN Updates"
Default: On
Further Selection: None
Parent: Only visible when "Enable Notifications" is ON
```

**3. Dispatch Alerts**
```typescript
Label: "Dispatch Alerts"
Default: On
Further Selection: None
Parent: Only visible when "Enable Notifications" is ON
```

**4. Auto-Sync**
```typescript
Label: "Auto-Sync"
Default: Off
Further Selection:
  - Sync Interval (picker: Hourly/Daily/Weekly)
  - Sync on WiFi Only (switch)
  - Last Synced (read-only text)
```

**5. Dark Mode**
```typescript
Label: "Dark Mode"
Default: Off (or Auto)
Further Selection: None
```

**6. Offline Mode**
```typescript
Label: "Offline Mode"
Default: Off
Further Selection:
  - Cache Duration (picker: 24h/48h/7days)
  - Cache Size (read-only text)
```

#### GRN Form

**1. Add to Recent Items**
```typescript
Label: "Add to Recent Items"
Default: On
Further Selection: None
Context: After saving GRN
```

**2. Print on Save**
```typescript
Label: "Print on Save"
Default: Off
Further Selection:
  - Printer (picker)
  - Number of Copies (stepper)
```

#### Filter Screens

**1. Show Empty Stock**
```typescript
Label: "Show Empty Stock"
Default: Off
Further Selection: None
```

**2. Apply Date Range**
```typescript
Label: "Apply Date Range"
Default: Off
Further Selection:
  - From Date (date picker)
  - To Date (date picker)
```

### Component Implementation

```typescript
import { Switch } from 'react-native';

interface SwitchCellProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  helperText?: string;
}

const SwitchCell: React.FC<SwitchCellProps> = ({
  label,
  value,
  onValueChange,
  disabled = false,
  helperText,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {helperText && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: '#E5E5E5',
          true: '#34C759', // iOS green (or use '#f69000' for Fiori)
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5E5E5"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1D2D3E',
  },
  labelDisabled: {
    color: '#7e8e9d',
    opacity: 0.5,
  },
  helperText: {
    fontSize: 13,
    color: '#556B82',
    marginTop: 2,
  },
});
```

### Switch with Further Selection

```typescript
interface SwitchWithDetailsProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  details?: React.ReactNode;
}

const SwitchWithDetails: React.FC<SwitchWithDetailsProps> = ({
  label,
  value,
  onValueChange,
  details,
}) => {
  return (
    <View>
      <SwitchCell
        label={label}
        value={value}
        onValueChange={onValueChange}
      />
      {value && details && (
        <View style={styles.detailsContainer}>
          {details}
        </View>
      )}
    </View>
  );
};

// Usage
<SwitchWithDetails
  label="Auto-Sync"
  value={autoSync}
  onValueChange={setAutoSync}
  details={
    <>
      <ListItem
        title="Sync Interval"
        value="Daily"
        onPress={() => openSyncIntervalPicker()}
      />
      <SwitchCell
        label="Sync on WiFi Only"
        value={wifiOnly}
        onValueChange={setWifiOnly}
      />
      <ListItem
        title="Last Synced"
        value="2 hours ago"
        disabled
      />
    </>
  }
/>
```

### Grouped Settings Example

```typescript
const SettingsScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [grnUpdates, setGrnUpdates] = useState(true);
  const [dispatchAlerts, setDispatchAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(false);

  return (
    <ScrollView>
      <SectionHeader title="Notifications" />
      <SwitchCell
        label="Enable Notifications"
        value={notifications}
        onValueChange={setNotifications}
      />

      {notifications && (
        <>
          <SwitchCell
            label="GRN Updates"
            value={grnUpdates}
            onValueChange={setGrnUpdates}
          />
          <SwitchCell
            label="Dispatch Alerts"
            value={dispatchAlerts}
            onValueChange={setDispatchAlerts}
          />
        </>
      )}

      <SectionHeader title="Sync" />
      <SwitchWithDetails
        label="Auto-Sync"
        value={autoSync}
        onValueChange={setAutoSync}
        details={
          <ListItem
            title="Sync Interval"
            value="Daily"
            onPress={() => openPicker()}
          />
        }
      />
    </ScrollView>
  );
};
```

### Haptic Feedback

Add subtle haptic feedback on toggle:

```typescript
import { Vibration } from 'react-native';

const handleToggle = (newValue: boolean) => {
  Vibration.vibrate(10); // Light haptic
  onValueChange(newValue);
};
```

### Accessibility

- Switch: `accessibilityRole="switch"`
- Switch state: `accessibilityState={{ checked: value }}`
- Label: `accessibilityLabel="[Label], [state]"` (e.g., "Enable Notifications, On")
- Disabled: `accessibilityState={{ disabled: true }}`
- Helper text: Read automatically when switch gains focus

### Best Practices

1. **Label Clarity**:
   - Use clear, descriptive labels
   - Avoid negative phrasing (use "Enable" not "Disable")
   - Keep labels short (1-4 words)

2. **Default State**:
   - Choose appropriate default (usually off for new features)
   - Consider user expectations
   - Document default states

3. **Further Selection**:
   - Only show additional options when switch is ON
   - Use smooth animation when revealing/hiding
   - Group related settings together

4. **Feedback**:
   - Provide immediate visual feedback
   - Consider haptic feedback (optional)
   - No confirmation dialog needed

5. **Grouping**:
   - Group related switches under section headers
   - Use parent-child relationships (enable notifications → specific notification types)
   - Maintain consistent order

6. **State Persistence**:
   - Save switch states immediately
   - Restore states on app launch
   - Handle offline changes

7. **Disabled State**:
   - Only disable when truly necessary
   - Explain why switch is disabled (use helper text)
   - Consider hiding instead of disabling

### Common Patterns

#### Parent-Child Relationship
```typescript
<SwitchCell label="Enable Notifications" value={notifications} />
{notifications && (
  <>
    <SwitchCell label="GRN Updates" value={grnUpdates} />
    <SwitchCell label="Dispatch Alerts" value={dispatchAlerts} />
  </>
)}
```

#### With Date/Time Picker
```typescript
<SwitchWithDetails
  label="Schedule Backup"
  value={scheduleBackup}
  details={
    <DateTimePickerCell
      label="Backup Time"
      value={backupTime}
      onValueChange={setBackupTime}
    />
  }
/>
```

#### With List Picker
```typescript
<SwitchWithDetails
  label="Auto-Sync"
  value={autoSync}
  details={
    <ListPickerCell
      label="Sync Interval"
      value={syncInterval}
      options={['Hourly', 'Daily', 'Weekly']}
      onValueChange={setSyncInterval}
    />
  }
/>
```

### Library Recommendation

For React Native, use the built-in **Switch** component:
- Native iOS/Android appearance
- Platform-specific styling
- Accessible by default
- Performant
