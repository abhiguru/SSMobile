import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import { FioriDialog } from './FioriDialog';
import { ImagePreviewModal, PreviewImage } from './ImagePreviewModal';
import {
  useGetProductImagesQuery,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
} from '../../store/apiSlice';
import { getProductImageUrl } from '../../constants';
import { spacing, borderRadius } from '../../constants/theme';
import { useAppTheme } from '../../theme/useAppTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / 4;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductImageManagerProps {
  productId: string;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ProductImageManager({ productId, disabled, onUploadingChange }: ProductImageManagerProps) {
  const { t } = useTranslation();
  const { appColors } = useAppTheme();
  const { data: images = [] } = useGetProductImagesQuery(productId);
  const [uploadImage, { isLoading: uploading }] = useUploadProductImageMutation();
  const [deleteImage] = useDeleteProductImageMutation();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ imageId: string; storagePath: string } | null>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const compressAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const TAG = '[ImageCompress]';
    const actions: ImageManipulator.Action[] = [];
    // Resize to 1200px max (covers 3x retina full-screen)
    if (asset.width > 1200 || asset.height > 1200) {
      actions.push(asset.width >= asset.height
        ? { resize: { width: 1200 } }
        : { resize: { height: 1200 } });
    }
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      actions,
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
    );
    console.log(TAG, 'compressed:', asset.width, 'x', asset.height, '→', manipulated.width, 'x', manipulated.height);
    return manipulated;
  };

  const pickImage = async () => {
    const TAG = '[ImagePicker]';
    const remainingSlots = MAX_IMAGES - images.length;
    console.log(TAG, 'pickImage called — current images count:', images.length, 'remaining slots:', remainingSlots);

    if (remainingSlots <= 0) {
      console.log(TAG, 'ABORT — max images reached');
      return;
    }

    console.log(TAG, 'requesting permissions...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log(TAG, 'permission status:', status);
    if (status !== 'granted') {
      return;
    }

    console.log(TAG, 'launching image library...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
      exif: false,
    });

    if (result.canceled || result.assets.length === 0) {
      console.log(TAG, 'picker cancelled or no assets');
      return;
    }

    console.log(TAG, 'assets selected:', result.assets.length);

    const compressAndUpload = async (asset: ImagePicker.ImagePickerAsset) => {
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileSize = asset.fileSize || 0;
      console.log(TAG, 'asset — uri:', asset.uri, 'mimeType:', mimeType, 'fileSize:', fileSize);
      console.log(TAG, 'asset dimensions:', asset.width, 'x', asset.height);

      if (fileSize > MAX_FILE_SIZE) {
        console.log(TAG, 'SKIP — file too large:', fileSize);
        return;
      }

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        console.log(TAG, 'SKIP — unsupported mime type:', mimeType);
        return;
      }

      // Compress before upload
      const compressed = await compressAsset(asset);
      console.log(TAG, 'compressed URI:', compressed.uri);

      const uploadParams = {
        productId,
        uri: compressed.uri,
        mimeType: 'image/jpeg',
        fileName: asset.fileName?.replace(/\.[^.]+$/, '.jpg') || `product-${Date.now()}.jpg`,
      };
      console.log(TAG, 'calling uploadImage mutation with:', JSON.stringify(uploadParams));
      return uploadImage(uploadParams).unwrap();
    };

    try {
      const uploads = result.assets.map((asset) => compressAndUpload(asset));
      const results = await Promise.allSettled(uploads);
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.log(TAG, 'some uploads failed:', failed.length);
      } else {
        console.log(TAG, 'all uploads succeeded');
      }
    } catch (err) {
      console.log(TAG, 'upload FAILED — error:', JSON.stringify(err));
    }
  };

  const handleDelete = (imageId: string, storagePath: string) => {
    setDeleteTarget({ imageId, storagePath });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { imageId, storagePath } = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteImage({ imageId, productId, storagePath }).unwrap();
    } catch {
      // Error handling without toast
    }
  };

  const previewImages: PreviewImage[] = useMemo(
    () => images.map((img) => ({ uri: getProductImageUrl(img.storage_path) })),
    [images],
  );

  const canAdd = images.length < MAX_IMAGES && !uploading && !disabled;

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={[styles.label, { color: appColors.text.secondary }]}>
        {t('admin.productImages')}
      </Text>
      <View style={styles.grid}>
        {images.map((img, index) => {
          const source = {
            uri: getProductImageUrl(img.storage_path, { width: 160, height: 160, quality: 70 }),
            cacheKey: img.id,
          };

          return (
            <View key={img.id} style={styles.thumb}>
              <Pressable onPress={() => setPreviewIndex(index)} style={styles.thumbImage}>
                <Image source={source} style={styles.thumbImage} contentFit="cover" transition={200} />
              </Pressable>
              {index === 0 && (
                <View style={[styles.primaryBadge, { backgroundColor: appColors.brand }]}>
                  <Text style={styles.primaryText}>{t('admin.primaryImage')}</Text>
                </View>
              )}
              {!disabled && (
                <AnimatedPressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(img.id, img.storage_path)}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                </AnimatedPressable>
              )}
            </View>
          );
        })}

        {uploading && (
          <View style={[styles.thumb, styles.addSlot, { borderColor: appColors.fieldBorder }]}>
            <ActivityIndicator size="small" color={appColors.brand} />
          </View>
        )}

        {canAdd && !uploading && (
          <AnimatedPressable style={[styles.thumb, styles.addSlot, { borderColor: appColors.fieldBorder }]} onPress={pickImage}>
            <MaterialCommunityIcons name="plus" size={28} color={appColors.fieldBorder} />
          </AnimatedPressable>
        )}
      </View>
      <ImagePreviewModal
        images={previewImages}
        visible={previewIndex !== null}
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
      />
      <FioriDialog
        visible={deleteTarget !== null}
        onDismiss={() => setDeleteTarget(null)}
        title={t('admin.deleteImage')}
        actions={[
          { label: t('common.cancel'), onPress: () => setDeleteTarget(null), variant: 'text' },
          { label: t('common.delete'), onPress: confirmDelete, variant: 'danger' },
        ]}
      >
        <Text variant="bodyMedium">{t('admin.deleteImageConfirm')}</Text>
      </FioriDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  addSlot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
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
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  primaryText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
