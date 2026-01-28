import { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from './AnimatedPressable';
import {
  useGetProductImagesQuery,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
} from '../../store/apiSlice';
import { getStoredTokens } from '../../services/supabase';
import { getProductImageUrl, SUPABASE_ANON_KEY } from '../../constants';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { useToast } from './Toast';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / 4;
const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProductImageManagerProps {
  productId: string;
  disabled?: boolean;
}

export function ProductImageManager({ productId, disabled }: ProductImageManagerProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: images = [] } = useGetProductImagesQuery(productId);
  const [uploadImage, { isLoading: uploading }] = useUploadProductImageMutation();
  const [deleteImage] = useDeleteProductImageMutation();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    getStoredTokens().then(({ accessToken: token }) => setAccessToken(token));
  }, []);

  const pickImage = async () => {
    const TAG = '[ImagePicker]';
    console.log(TAG, 'pickImage called — current images count:', images.length);

    if (images.length >= MAX_IMAGES) {
      console.log(TAG, 'ABORT — max images reached');
      showToast({ message: t('admin.maxImagesReached'), type: 'error' });
      return;
    }

    console.log(TAG, 'requesting permissions...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log(TAG, 'permission status:', status);
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload images.');
      return;
    }

    console.log(TAG, 'launching image library...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) {
      console.log(TAG, 'picker cancelled or no asset');
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const fileSize = asset.fileSize || 0;
    console.log(TAG, 'asset selected — uri:', asset.uri);
    console.log(TAG, 'mimeType:', mimeType, 'fileSize:', fileSize, 'fileName:', asset.fileName);
    console.log(TAG, 'asset dimensions:', asset.width, 'x', asset.height);

    if (fileSize > MAX_FILE_SIZE) {
      console.log(TAG, 'ABORT — file too large:', fileSize);
      showToast({ message: t('admin.imageSizeError'), type: 'error' });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      console.log(TAG, 'ABORT — unsupported mime type:', mimeType);
      showToast({ message: t('admin.imageTypeError'), type: 'error' });
      return;
    }

    const uploadParams = {
      productId,
      uri: asset.uri,
      mimeType,
      fileName: asset.fileName || `product-${Date.now()}.jpg`,
    };
    console.log(TAG, 'calling uploadImage mutation with:', JSON.stringify(uploadParams));

    try {
      const result = await uploadImage(uploadParams).unwrap();
      console.log(TAG, 'upload SUCCESS — result:', JSON.stringify(result));
      // Refresh token so new thumbnail gets valid auth headers
      getStoredTokens().then(({ accessToken: t }) => setAccessToken(t));
    } catch (err) {
      console.log(TAG, 'upload FAILED — error:', JSON.stringify(err));
      showToast({ message: t('admin.uploadFailed'), type: 'error' });
    }
  };

  const handleDelete = (imageId: string, storagePath: string) => {
    Alert.alert(
      t('admin.deleteImage'),
      t('admin.deleteImageConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteImage({ imageId, productId, storagePath }).unwrap();
            } catch {
              showToast({ message: t('admin.deleteFailed'), type: 'error' });
            }
          },
        },
      ],
    );
  };

  const canAdd = images.length < MAX_IMAGES && !uploading && !disabled;

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.label}>
        {t('admin.productImages')}
      </Text>
      <View style={styles.grid}>
        {images.map((img, index) => {
          const imgUri = getProductImageUrl(img.storage_path);
          const source = accessToken
            ? {
                uri: imgUri,
                cacheKey: img.id,
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': SUPABASE_ANON_KEY,
                },
              }
            : { uri: imgUri, cacheKey: img.id };

          return (
            <View key={img.id} style={styles.thumb}>
              <Image source={source} style={styles.thumbImage} contentFit="cover" transition={200} />
              {index === 0 && (
                <View style={styles.primaryBadge}>
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
          <View style={[styles.thumb, styles.addSlot]}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        )}

        {canAdd && !uploading && (
          <AnimatedPressable style={[styles.thumb, styles.addSlot]} onPress={pickImage}>
            <MaterialCommunityIcons name="plus" size={28} color={colors.fieldBorder} />
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.text.secondary,
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
  primaryText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
