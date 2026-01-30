# Frontend Spec: Product Image Upload

## Overview

Admin users can upload, reorder, and delete product images from the mobile app. Images are stored in Supabase Storage (`product-images` bucket) with metadata tracked in the `product_images` table. Customers see a gallery on the product detail screen. The first confirmed image (by `display_order`) auto-syncs to `products.image_url`.

---

## New Dependency

```bash
npx expo install expo-image-picker
```

Add to `app.json` plugins if not present:
```json
["expo-image-picker"]
```

---

## Type Definitions

Add to `src/types/index.ts`:

```typescript
export type ProductImageStatus = 'pending' | 'confirmed';

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  uploaded_by?: string;
  status: ProductImageStatus;
  upload_token?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmImageResponse {
  success: boolean;
  image_id?: string;
  storage_path?: string;
  product_id?: string;
  status?: string;
  error?: string;
  message?: string;
}
```

---

## API Layer

### New RTK Query Endpoints

Add to `src/store/apiSlice.ts` inside the existing `endpoints` builder:

```typescript
// Add 'ProductImages' to tagTypes array:
tagTypes: ['Products', 'Categories', 'Orders', 'Order', 'Addresses', 'AppSettings', 'Favorites', 'ProductImages'],
```

#### 1. `getProductImages` (query)

Fetches confirmed images for a product, ordered by `display_order`.

```typescript
getProductImages: builder.query<ProductImage[], string>({
  query: (productId) => ({
    url: `/rest/v1/product_images?product_id=eq.${productId}&status=eq.confirmed&order=display_order.asc,created_at.asc`,
  }),
  providesTags: (_result, _error, productId) => [
    { type: 'ProductImages', id: productId },
  ],
}),
```

#### 2. `uploadProductImage` (mutation)

Three-step mutation using `queryFn`:
1. Upload file to Supabase Storage
2. Insert pending `product_images` record
3. Confirm via RPC

```typescript
uploadProductImage: builder.mutation<
  ConfirmImageResponse,
  { productId: string; uri: string; mimeType: string; fileName: string }
>({
  queryFn: async ({ productId, uri, mimeType, fileName }) => {
    try {
      const { accessToken } = await getStoredTokens();
      if (!accessToken) {
        return { error: { status: 'CUSTOM_ERROR', data: 'Not authenticated' } };
      }

      // 1. Read file and upload to Supabase Storage
      const ext = fileName.split('.').pop() || 'jpg';
      const storagePath = `${productId}/${Date.now()}.${ext}`;

      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(
        `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': mimeType,
            'x-upsert': 'false',
          },
          body: blob,
        }
      );

      if (!uploadResponse.ok) {
        const errData = await uploadResponse.json().catch(() => ({}));
        return {
          error: {
            status: uploadResponse.status,
            data: errData.message || 'Storage upload failed',
          },
        };
      }

      // 2. Insert pending product_images record
      const uploadToken = crypto.randomUUID();

      const insertResponse = await authenticatedFetch(
        '/rest/v1/product_images',
        {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            product_id: productId,
            storage_path: storagePath,
            original_filename: fileName,
            file_size: blob.size,
            mime_type: mimeType,
            display_order: 0,
            upload_token: uploadToken,
          }),
        }
      );

      if (!insertResponse.ok) {
        // Clean up storage on failure
        await fetch(
          `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_ANON_KEY,
            },
          }
        );
        return {
          error: {
            status: insertResponse.status,
            data: 'Failed to register image metadata',
          },
        };
      }

      const [insertedImage] = await insertResponse.json();

      // 3. Confirm via RPC
      const confirmResponse = await authenticatedFetch(
        '/rest/v1/rpc/confirm_product_image_upload',
        {
          method: 'POST',
          body: JSON.stringify({
            p_image_id: insertedImage.id,
            p_upload_token: uploadToken,
          }),
        }
      );

      if (!confirmResponse.ok) {
        return {
          error: {
            status: confirmResponse.status,
            data: 'Failed to confirm image upload',
          },
        };
      }

      const result = await confirmResponse.json();
      return { data: result };
    } catch (error) {
      return {
        error: {
          status: 'FETCH_ERROR',
          data: error instanceof Error ? error.message : 'Upload failed',
        },
      };
    }
  },
  invalidatesTags: (_result, _error, { productId }) => [
    { type: 'ProductImages', id: productId },
    'Products',
  ],
}),
```

#### 3. `deleteProductImage` (mutation)

Deletes the metadata record (CASCADE will not remove from storage), then deletes from storage.

```typescript
deleteProductImage: builder.mutation<
  null,
  { imageId: string; productId: string; storagePath: string }
>({
  queryFn: async ({ imageId, storagePath }) => {
    try {
      // Delete metadata record
      const deleteResponse = await authenticatedFetch(
        `/rest/v1/product_images?id=eq.${imageId}`,
        { method: 'DELETE' }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 204) {
        return {
          error: {
            status: deleteResponse.status,
            data: 'Failed to delete image record',
          },
        };
      }

      // Delete from storage
      const { accessToken } = await getStoredTokens();
      if (accessToken) {
        await fetch(
          `${API_BASE_URL}/storage/v1/object/product-images/${storagePath}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': SUPABASE_ANON_KEY,
            },
          }
        );
      }

      return { data: null };
    } catch (error) {
      return {
        error: {
          status: 'FETCH_ERROR',
          data: error instanceof Error ? error.message : 'Delete failed',
        },
      };
    }
  },
  invalidatesTags: (_result, _error, { productId }) => [
    { type: 'ProductImages', id: productId },
    'Products',
  ],
}),
```

#### 4. `reorderProductImages` (mutation)

Batch-updates `display_order` for all images of a product.

```typescript
reorderProductImages: builder.mutation<
  null,
  { productId: string; orderedImageIds: string[] }
>({
  queryFn: async ({ orderedImageIds }) => {
    try {
      for (let i = 0; i < orderedImageIds.length; i++) {
        const response = await authenticatedFetch(
          `/rest/v1/product_images?id=eq.${orderedImageIds[i]}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ display_order: i }),
          }
        );
        if (!response.ok) {
          return {
            error: {
              status: response.status,
              data: `Failed to update order for image ${i}`,
            },
          };
        }
      }
      return { data: null };
    } catch (error) {
      return {
        error: {
          status: 'FETCH_ERROR',
          data: error instanceof Error ? error.message : 'Reorder failed',
        },
      };
    }
  },
  invalidatesTags: (_result, _error, { productId }) => [
    { type: 'ProductImages', id: productId },
    'Products',
  ],
}),
```

#### Exported Hooks

Add to the existing `export const { ... } = apiSlice` block:

```typescript
useGetProductImagesQuery,
useUploadProductImageMutation,
useDeleteProductImageMutation,
useReorderProductImagesMutation,
```

---

## Image URL Helper

Add to `src/constants/index.ts`:

```typescript
/**
 * Build a full URL for a product image stored in Supabase Storage.
 * Uses the authenticated object endpoint (bucket is private).
 */
export function getProductImageUrl(storagePath: string): string {
  return `${API_BASE_URL}/storage/v1/object/authenticated/product-images/${storagePath}`;
}
```

All image display should use this helper instead of raw `product.image_url`. The `expo-image` component should pass the auth header via a custom source object:

```typescript
// In a component:
import { getStoredTokens } from '../services/supabase';
import { SUPABASE_ANON_KEY } from '../constants';

// Build source with auth headers (expo-image supports this)
const imageSource = storagePath
  ? {
      uri: getProductImageUrl(storagePath),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    }
  : null;
```

> **Note:** If authenticated URLs prove difficult with `expo-image` caching, an alternative is to generate **signed URLs** via `/storage/v1/object/sign/product-images/{path}` (returns a time-limited public URL). This avoids passing headers on every image load. Evaluate during implementation.

---

## New Component: `ProductImageManager`

**File:** `src/components/common/ProductImageManager.tsx`

Admin-only component for managing product images. Rendered inside `EditProductSheet`.

### Props

```typescript
interface ProductImageManagerProps {
  productId: string;
  disabled?: boolean;
}
```

### Layout

```
+--------------------------------------------------+
|  Product Images                           [+ Add] |
+--------------------------------------------------+
|  +--------+  +--------+  +--------+  +--------+  |
|  |  img1  |  |  img2  |  |  img3  |  | dashed |  |
|  |        |  |        |  |        |  |  + Add  |  |
|  |  [x]   |  |  [x]   |  |  [x]   |  |        |  |
|  +--------+  +--------+  +--------+  +--------+  |
|                                                    |
|  Drag to reorder. First image is the thumbnail.   |
+--------------------------------------------------+
```

### Behavior

| Action | Behavior |
|--------|----------|
| **Tap "+" or empty slot** | Opens `expo-image-picker` (camera + gallery). Limit: 5MB, JPEG/PNG/WebP. |
| **Tap "x" on thumbnail** | Confirm dialog ("Delete this image?") then calls `deleteProductImage`. |
| **Long-press + drag** | Reorder images. On release, calls `reorderProductImages`. First image = primary. |
| **Upload in progress** | Show `ActivityIndicator` overlay on the thumbnail slot. Disable add button. |
| **Error** | Toast via existing `Toast` component: "Upload failed" / "Delete failed". |
| **Max images** | Cap at 5 images per product. Hide add button when at limit. |

### Image Picker Configuration

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    exif: false,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    // asset.uri, asset.mimeType, asset.fileName, asset.fileSize
    uploadProductImage({
      productId,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
      fileName: asset.fileName || `product-${Date.now()}.jpg`,
    });
  }
};
```

### Thumbnail Grid Styling

```typescript
// 4 items per row, square aspect ratio
const THUMB_SIZE = (screenWidth - spacing.lg * 2 - spacing.sm * 3) / 4;

const styles = {
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  addSlot: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.fieldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: colors.brand,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
};
```

The first image shows a small "Primary" badge overlay. All images show an "x" delete button in the top-right corner.

---

## Changes to Existing Components

### 1. `EditProductSheet.tsx`

Add `ProductImageManager` below the title, above the text fields.

```diff
 <Text variant="titleMedium" style={styles.title}>
   {t('admin.editProduct')}
 </Text>

+<ProductImageManager productId={product.id} disabled={saving} />
+
 <ScrollView ...>
   <TextInput label={t('admin.nameEn')} ... />
```

The sheet's `maxHeight` may need to increase from `0.55` to `0.65` to accommodate the image grid without cramping the text fields.

### 2. `app/(customer)/product/[id].tsx` — Image Gallery

Replace the single hero image with a horizontal `FlatList` gallery when multiple images exist.

```
+----------------------------------------------+
|  [  img1  ] [  img2  ] [  img3  ]  ...       |  <-- horizontal scroll
|                                               |
|  o  o  .                                      |  <-- page indicator dots
+----------------------------------------------+
```

**Data source:** `useGetProductImagesQuery(product.id)` — returns confirmed images ordered by `display_order`.

**Fallback:** If no `product_images` records exist but `product.image_url` is set, show single hero image as before. If neither exists, show the gradient + leaf icon fallback.

```typescript
const { data: productImages } = useGetProductImagesQuery(product.id);
const hasGallery = productImages && productImages.length > 0;
```

Gallery component:
- `FlatList` with `horizontal`, `pagingEnabled`, `showsHorizontalScrollIndicator={false}`
- Item width = screen width
- Item height = 300 (matches current hero)
- `onScroll` with `Animated.event` for page indicator
- Page indicator dots below: active dot = `colors.brand`, inactive = `colors.fieldBorder`
- `expo-image` with `contentFit="cover"`, `transition={300}`

If only 1 image, render as a static `Image` (no scroll, no dots) — same as current behavior.

### 3. `app/(customer)/index.tsx` — Product List Thumbnails

No query change needed. The existing code uses `product.image_url` which is auto-updated by the `confirm_product_image_upload` RPC. Thumbnails will show the primary image without any code change.

If `image_url` contains a storage path (e.g. `product-images/xxx/yyy.jpg`) instead of a full URL, the display code needs to prepend the storage base URL:

```typescript
const imageUri = product.image_url
  ? product.image_url.startsWith('http')
    ? product.image_url
    : getProductImageUrl(product.image_url)
  : null;
```

Apply this pattern in all places that render `product.image_url`:
- `app/(customer)/index.tsx` — home product list
- `app/(admin)/products.tsx` — admin product list
- `app/(admin)/orders/[id].tsx` — order detail (if showing product thumbnails)

### 4. `app/(admin)/products.tsx` — Admin Product List

Add a small camera icon overlay on product thumbnails that have no image, as a visual cue that images can be added via edit.

---

## i18n Keys

Add to `src/i18n/en.json`:

```json
{
  "admin": {
    "productImages": "Product Images",
    "addImage": "Add Image",
    "deleteImage": "Delete Image",
    "deleteImageConfirm": "Remove this image?",
    "primaryImage": "Primary",
    "uploadingImage": "Uploading...",
    "uploadFailed": "Image upload failed",
    "deleteFailed": "Failed to delete image",
    "maxImagesReached": "Maximum 5 images per product",
    "dragToReorder": "Drag to reorder. First image is the thumbnail."
  }
}
```

Add Gujarati translations to `src/i18n/gu.json`:

```json
{
  "admin": {
    "productImages": "ઉત્પાદન છબીઓ",
    "addImage": "છબી ઉમેરો",
    "deleteImage": "છબી કાઢો",
    "deleteImageConfirm": "આ છબી દૂર કરશો?",
    "primaryImage": "મુખ્ય",
    "uploadingImage": "અપલોડ થઈ રહ્યું છે...",
    "uploadFailed": "છબી અપલોડ નિષ્ફળ",
    "deleteFailed": "છબી કાઢવામાં નિષ્ફળ",
    "maxImagesReached": "દરેક ઉત્પાદન માટે વધુમાં વધુ 5 છબીઓ",
    "dragToReorder": "ક્રમ બદલવા ખેંચો. પ્રથમ છબી થંબનેલ છે."
  }
}
```

---

## Permissions

`expo-image-picker` requires:
- **iOS:** `NSPhotoLibraryUsageDescription` — already handled by Expo's managed workflow via `app.json`
- **Android:** `READ_MEDIA_IMAGES` (Android 13+) / `READ_EXTERNAL_STORAGE` — handled by expo-image-picker plugin

Request permission before opening picker:

```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Permission needed', 'Please allow photo access to upload images.');
  return;
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| **No network** | RTK Query `FETCH_ERROR` → Toast "Upload failed. Check connection." |
| **File too large** | Check `asset.fileSize > 5242880` before upload → Toast "Image must be under 5MB" |
| **Invalid type** | Check `mimeType` is in `['image/jpeg', 'image/png', 'image/webp']` → Toast "Only JPEG, PNG, WebP allowed" |
| **Storage upload fails** | Return error, no metadata record created (clean state) |
| **Metadata insert fails** | Delete uploaded storage object (cleanup in `queryFn`) |
| **Confirm RPC fails** | Orphan left in pending state → cleaned up by `cleanup_orphaned_product_images` (server-side, runs hourly or on-demand) |
| **Delete fails** | Toast "Failed to delete image". Image remains. User can retry. |
| **401 during upload** | `authenticatedFetch` handles refresh automatically. Storage upload uses manual token — if expired, re-fetch token and retry once. |

---

## Upload Flow Sequence

```
Admin taps [+ Add]
    |
    v
expo-image-picker opens
    |
    v
Admin selects/crops image
    |
    v
Client-side validation (size, type)
    |
    v
Show ActivityIndicator on thumbnail slot
    |
    v
POST /storage/v1/object/product-images/{productId}/{timestamp}.{ext}
    |  (binary body, Content-Type header)
    v
POST /rest/v1/product_images
    |  (metadata: storage_path, filename, size, mime, upload_token)
    v
POST /rest/v1/rpc/confirm_product_image_upload
    |  (p_image_id, p_upload_token)
    v
RPC sets status='confirmed', updates products.image_url
    |
    v
RTK Query invalidates ['ProductImages', 'Products'] tags
    |
    v
UI refreshes: new image appears in grid, product list thumbnail updates
```

---

## File Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `ProductImage`, `ConfirmImageResponse` types |
| `src/store/apiSlice.ts` | Add `ProductImages` tag, 4 new endpoints, 4 new hooks |
| `src/constants/index.ts` | Add `getProductImageUrl()` helper |
| `src/components/common/ProductImageManager.tsx` | **New file** — admin image grid with upload/delete/reorder |
| `src/components/common/EditProductSheet.tsx` | Embed `ProductImageManager`, increase maxHeight |
| `app/(customer)/product/[id].tsx` | Gallery FlatList for multi-image, page indicator dots |
| `app/(customer)/index.tsx` | Use `getProductImageUrl()` for storage path images |
| `app/(admin)/products.tsx` | Use `getProductImageUrl()` for storage path images |
| `src/i18n/en.json` | Add image management translation keys |
| `src/i18n/gu.json` | Add Gujarati translations |
| `package.json` | Add `expo-image-picker` dependency |
| `app.json` | Add `expo-image-picker` plugin (if needed) |
