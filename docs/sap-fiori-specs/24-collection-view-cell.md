# SAP Fiori Collection View Cell - iOS Design Specification

> Source: https://www.sap.com/design-system/fiori-design-ios/components/table-and-collection-views/collection-view-cell/

## Intro

The collection view cell is an object within the collection view. It displays content with images to provide a more visual viewing experience.

For guidance on how a collection view cell can be used within the collection view, see Collection View.

---

## Anatomy

### A. Image View
Collection view cells are meant to be visual, which is why they must include an image.

### B. Title (Optional)
The title is used to give more information about the object.

### C. Subtitle (Optional)
The subtitle can hold further information about the object.

### D. Attribute (Optional)
Attributes, such as the availability status, can be added optionally.

---

## Behavior and Interaction

A single tap on a collection view cell navigates the user to a detailed view of the object.

For some cells, such as attachments, the navigation drills down to a preview of the attachment where it can be viewed larger and quick actions such as "Share" or "Delete" can be performed.

---

## Variations

### 1. Standard Image
The collection view cell has two fixed sizes when displaying the labels:
- **110px** width
- **120px** width

### 2. Standard Image Without Labels
When no labels are displayed, the size of the collection cell depends on the image view's size:
- **Minimum**: 60px × 60px
- **Maximum**: 110px × 110px
- Image view can be **circular** or **rectangular**
- Rectangular width cannot be smaller than its height

### 3. Profile Image
When showing a collection of people, use the circular profile image.
- If no profile image is available, **initials** can be displayed by default

### 4. Doctype Icons
Different types of documents can be displayed in the collection view.
- Doctype icons live within a rectangular image

### 5. Icon Actions
For actions that can be easily represented in an icon form:
- **One or two actions** allowed
- Number of actions must be **consistent** across all collection view items

### 6. Button Actions
For more complex actions:
- Use a button action
- **Only one action** is allowed when using button actions

---

## Implementation Notes for React Native

### Key Dimensions

| Element | Size |
|---------|------|
| Cell Width (with labels) | 110pt or 120pt |
| Cell Width (without labels) | 60pt - 110pt |
| Image Min Size | 60pt × 60pt |
| Image Max Size | 110pt × 110pt |
| Title Font Size | 13pt |
| Title Line Height | 18pt |
| Subtitle Font Size | 12pt |
| Subtitle Line Height | 16pt |
| Attribute Font Size | 12pt |
| Cell Padding | 8pt |
| Image-Text Gap | 8pt |
| Text Line Gap | 2pt |
| Corner Radius (rectangular) | 8pt |
| Corner Radius (circular) | 50% (full) |
| Action Icon Size | 20pt |
| Action Button Height | 28pt |

### Layout Structure

#### With Labels (110pt width)
```
┌──────────────────┐
│                  │
│    [  Image  ]   │
│                  │
├──────────────────┤
│ Title            │
│ Subtitle         │
│ Attribute        │
└──────────────────┘
```

#### Without Labels (60-110pt)
```
┌──────────────────┐
│                  │
│    [  Image  ]   │
│                  │
└──────────────────┘
```

#### With Actions
```
┌──────────────────┐
│            [x][y]│  <- Icon actions (top right)
│    [  Image  ]   │
│                  │
├──────────────────┤
│ Title            │
│ [  Button  ]     │  <- Button action
└──────────────────┘
```

### Color Scheme

| Element | Color |
|---------|-------|
| Title | #1D2D3E (primary text) |
| Subtitle | #556B82 (secondary text) |
| Attribute (Positive) | #36A41D |
| Attribute (Critical) | #E9730C |
| Attribute (Negative) | #D32030 |
| Attribute (Neutral) | #556B82 |
| Background | #FFFFFF |
| Border | #E5E5E5 |
| Action Icon | #556B82 |
| Action Icon (Destructive) | #D32030 |
| Placeholder Background | #F5F6F7 |
| Initials Background | #E5E5E5 |
| Initials Text | #556B82 |

### Typography

| Element | Font Size | Font Weight | Color | Lines |
|---------|-----------|-------------|-------|-------|
| Title | 13pt | Semibold (600) | #1D2D3E | 2 max |
| Subtitle | 12pt | Regular (400) | #556B82 | 1 |
| Attribute | 12pt | Regular (400) | Semantic | 1 |
| Initials | 17pt | Semibold (600) | #556B82 | 1 |
| Button Label | 13pt | Semibold (600) | #f69000 | 1 |

### Component Implementation

```typescript
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type AttributeStatus = 'positive' | 'critical' | 'negative' | 'neutral';

interface CollectionViewCellProps {
  // Image
  imageSource?: ImageSourcePropType;
  imageUri?: string;
  initials?: string;
  isCircular?: boolean;

  // Content
  title?: string;
  subtitle?: string;
  attribute?: string;
  attributeStatus?: AttributeStatus;

  // Actions
  iconActions?: Array<{
    icon: string;
    onPress: () => void;
    destructive?: boolean;
  }>;
  buttonAction?: {
    label: string;
    onPress: () => void;
  };

  // Behavior
  onPress?: () => void;
  disabled?: boolean;

  // Layout
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

const ATTRIBUTE_COLORS: Record<AttributeStatus, string> = {
  positive: '#36A41D',
  critical: '#E9730C',
  negative: '#D32030',
  neutral: '#556B82',
};

const SIZE_CONFIG = {
  small: { width: 60, imageSize: 60 },
  medium: { width: 110, imageSize: 90 },
  large: { width: 120, imageSize: 100 },
};

const CollectionViewCell: React.FC<CollectionViewCellProps> = ({
  imageSource,
  imageUri,
  initials,
  isCircular = false,
  title,
  subtitle,
  attribute,
  attributeStatus = 'neutral',
  iconActions,
  buttonAction,
  onPress,
  disabled = false,
  size = 'medium',
  showLabels = true,
}) => {
  const config = SIZE_CONFIG[size];
  const hasImage = imageSource || imageUri;
  const hasLabels = showLabels && (title || subtitle || attribute);

  const renderImage = () => {
    const imageStyle = [
      styles.image,
      { width: config.imageSize, height: config.imageSize },
      isCircular && styles.imageCircular,
    ];

    if (hasImage) {
      return (
        <Image
          source={imageSource || { uri: imageUri }}
          style={imageStyle}
          resizeMode="cover"
        />
      );
    }

    if (initials) {
      return (
        <View style={[styles.initialsContainer, imageStyle]}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.placeholder, imageStyle]}>
        <Icon name="image-outline" size={24} color="#556B82" />
      </View>
    );
  };

  const renderIconActions = () => {
    if (!iconActions || iconActions.length === 0) return null;

    return (
      <View style={styles.iconActionsContainer}>
        {iconActions.slice(0, 2).map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.iconAction}
            onPress={action.onPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={action.icon}
              size={20}
              color={action.destructive ? '#D32030' : '#556B82'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLabels = () => {
    if (!hasLabels) return null;

    return (
      <View style={styles.labelsContainer}>
        {title && (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {attribute && (
          <Text
            style={[styles.attribute, { color: ATTRIBUTE_COLORS[attributeStatus] }]}
            numberOfLines={1}
          >
            {attribute}
          </Text>
        )}
        {buttonAction && (
          <TouchableOpacity
            style={styles.buttonAction}
            onPress={buttonAction.onPress}
          >
            <Text style={styles.buttonActionText}>{buttonAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: config.width },
        disabled && styles.containerDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {renderImage()}
        {renderIconActions()}
      </View>
      {renderLabels()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  imageCircular: {
    borderRadius: 9999,
    margin: 8,
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
  },
  placeholder: {
    backgroundColor: '#F5F6F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsContainer: {
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#556B82',
  },
  iconActionsContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  iconAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelsContainer: {
    padding: 8,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D2D3E',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#556B82',
    lineHeight: 16,
  },
  attribute: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  buttonAction: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f69000',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f69000',
  },
});

export default CollectionViewCell;
```

### Collection View Grid Component

```typescript
import React from 'react';
import { View, FlatList, StyleSheet, Dimensions } from 'react-native';

interface CollectionViewProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  numColumns?: number;
  itemWidth?: number;
  gap?: number;
  contentPadding?: number;
}

function CollectionView<T>({
  data,
  renderItem,
  numColumns = 3,
  itemWidth,
  gap = 8,
  contentPadding = 16,
}: CollectionViewProps<T>) {
  const screenWidth = Dimensions.get('window').width;
  const calculatedItemWidth = itemWidth ||
    (screenWidth - contentPadding * 2 - gap * (numColumns - 1)) / numColumns;

  return (
    <FlatList
      data={data}
      numColumns={numColumns}
      keyExtractor={(_, index) => index.toString()}
      contentContainerStyle={[
        styles.container,
        { padding: contentPadding },
      ]}
      columnWrapperStyle={[
        styles.row,
        { gap },
      ]}
      ItemSeparatorComponent={() => <View style={{ height: gap }} />}
      renderItem={({ item, index }) => (
        <View style={{ width: calculatedItemWidth }}>
          {renderItem(item, index)}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  row: {
    justifyContent: 'flex-start',
  },
});

export default CollectionView;
```

### GCS App Usage Examples

#### Product/Item Grid
```typescript
<CollectionView
  data={products}
  numColumns={3}
  renderItem={(product) => (
    <CollectionViewCell
      imageUri={product.image_url}
      title={product.name}
      subtitle={product.category}
      attribute={`₹${product.price}`}
      attributeStatus="neutral"
      onPress={() => navigateToProduct(product.id)}
    />
  )}
/>
```

#### Invoice Attachments
```typescript
<CollectionView
  data={attachments}
  numColumns={4}
  renderItem={(attachment) => (
    <CollectionViewCell
      imageUri={attachment.thumbnail_url}
      title={attachment.filename}
      subtitle={attachment.size}
      showLabels={true}
      iconActions={[
        { icon: 'share-variant', onPress: () => shareAttachment(attachment) },
        { icon: 'delete', onPress: () => deleteAttachment(attachment), destructive: true },
      ]}
      onPress={() => previewAttachment(attachment)}
    />
  )}
/>
```

#### Customer/User Grid (Profile Images)
```typescript
<CollectionView
  data={customers}
  numColumns={4}
  renderItem={(customer) => (
    <CollectionViewCell
      imageUri={customer.avatar_url}
      initials={getInitials(customer.name)}
      isCircular={true}
      title={customer.name}
      subtitle={customer.company}
      onPress={() => navigateToCustomer(customer.id)}
    />
  )}
/>
```

#### Document Types
```typescript
const DOCTYPE_ICONS: Record<string, string> = {
  pdf: 'file-pdf-box',
  excel: 'file-excel-box',
  word: 'file-word-box',
  image: 'file-image',
};

<CollectionView
  data={documents}
  numColumns={3}
  renderItem={(doc) => (
    <CollectionViewCell
      imageSource={require(`./icons/${doc.type}.png`)}
      title={doc.name}
      subtitle={doc.date}
      attribute={doc.size}
      buttonAction={{
        label: 'Download',
        onPress: () => downloadDocument(doc),
      }}
    />
  )}
/>
```

#### GRN Image Gallery
```typescript
<CollectionView
  data={grnImages}
  numColumns={3}
  gap={4}
  renderItem={(image, index) => (
    <CollectionViewCell
      imageUri={image.signed_url}
      showLabels={false}
      size="small"
      iconActions={[
        { icon: 'delete', onPress: () => removeImage(index), destructive: true },
      ]}
      onPress={() => openImageViewer(index)}
    />
  )}
/>
```

### Accessibility

- Cell: `accessibilityRole="button"`
- Cell: `accessibilityLabel="[title], [subtitle], [attribute]"`
- Cell: `accessibilityHint="Double tap to view details"`
- Icon actions: `accessibilityLabel="[action name]"`
- Icon actions: `accessibilityRole="button"`
- Disabled: `accessibilityState={{ disabled: true }}`
- Image: `accessibilityElementsHidden={true}` when decorative

### Best Practices

1. **Consistent Sizing**: Use the same size for all cells in a collection
2. **Consistent Actions**: Use the same number of icon actions across all cells
3. **Image Aspect Ratio**: Keep images square (1:1) for consistent layout
4. **Title Length**: Keep titles concise (2 lines max)
5. **Placeholder Images**: Always provide placeholder for missing images
6. **Touch Target**: Ensure minimum 44pt touch area
7. **Loading States**: Show skeleton placeholders while loading
8. **Grid Columns**: Adjust columns based on screen width (3 for compact, 4-5 for regular)

### Skeleton Loading

```typescript
const CollectionViewCellSkeleton: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium',
}) => {
  const config = SIZE_CONFIG[size];

  return (
    <View style={[skeletonStyles.container, { width: config.width }]}>
      <View style={[skeletonStyles.image, { height: config.imageSize }]} />
      <View style={skeletonStyles.labels}>
        <View style={skeletonStyles.title} />
        <View style={skeletonStyles.subtitle} />
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  image: {
    backgroundColor: '#F5F6F7',
    width: '100%',
  },
  labels: {
    padding: 8,
    gap: 4,
  },
  title: {
    height: 14,
    width: '80%',
    backgroundColor: '#F5F6F7',
    borderRadius: 4,
  },
  subtitle: {
    height: 12,
    width: '60%',
    backgroundColor: '#F5F6F7',
    borderRadius: 4,
  },
});
```
