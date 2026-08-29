import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import {
  CameraIcon,
  ShieldIcon,
  CloseIcon,
  PlusIcon,
  ChevronIcon,
  AlertIcon,
  CheckIcon,
  TagIcon,
} from '../../components/icons';
import theme from '../../theme';
import { api, resolveImageUrl } from '../../services/api';

const CATEGORIES = [
  'Cameras',
  'Drones',
  'Power Tools',
  'Event Equipment',
  'Electronics',
  'Other',
] as const;

type CategoryType = typeof CATEGORIES[number];

export const AddProductScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editProductId = route.params?.editProductId;
  const isEditing = Boolean(editProductId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('Cameras');
  const [dailyRate, setDailyRate] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [city, setCity] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [damageProtectionEnabled, setDamageProtectionEnabled] = useState(true);
  const [damageProtectionFee, setDamageProtectionFee] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Prefill details if editing
  useEffect(() => {
    if (!editProductId) return;

    let isMounted = true;
    const fetchExistingProduct = async () => {
      setIsLoading(true);
      setLoadingStatus('Loading listing details...');
      setErrorMessage(null);

      try {
        const res = await api.getProductById(editProductId);
        if (res.success && res.data && isMounted) {
          const prod = res.data;
          setTitle(prod.title || '');
          setDescription(prod.description || '');

          if (prod.category && CATEGORIES.includes(prod.category as any)) {
            setCategory(prod.category as CategoryType);
          }

          const rate = prod.rentalPrice?.perDay ?? prod.dailyRate;
          if (rate !== undefined && rate !== null) {
            setDailyRate(String(rate));
          }

          const deposit = prod.rentalPrice?.securityDeposit ?? prod.securityDeposit;
          if (deposit !== undefined && deposit !== null) {
            setSecurityDeposit(String(deposit));
          }

          const itemCity = prod.location?.city || prod.city || '';
          setCity(itemCity);

          if (Array.isArray(prod.images)) {
            setSelectedImages(prod.images);
          }

          if (prod.damageProtection) {
            setDamageProtectionEnabled(prod.damageProtection.isAvailable !== false);
            if (prod.damageProtection.fee !== undefined) {
              setDamageProtectionFee(String(prod.damageProtection.fee));
            }
          }
        } else if (isMounted) {
          setErrorMessage(res.error || 'Failed to load product details for editing.');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'An error occurred while loading listing details.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setLoadingStatus(null);
        }
      }
    };

    fetchExistingProduct();

    return () => {
      isMounted = false;
    };
  }, [editProductId]);

  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      return;
    }
    setErrorMessage(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage(
        'Permission to access photo library was denied. Please enable photo permissions to upload listing photos.'
      );
      return;
    }

    const remainingSlots = 5 - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const pickedUris = result.assets
        .map((asset) => asset.uri)
        .filter((uri) => Boolean(uri))
        .slice(0, remainingSlots);
      setSelectedImages((prev) => [...prev, ...pickedUris]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Please enter an item title.');
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setErrorMessage('Please enter a description for your listing.');
      return;
    }

    const rateNumber = parseFloat(dailyRate);
    if (!dailyRate.trim() || isNaN(rateNumber) || rateNumber <= 0) {
      setErrorMessage('Please enter a valid daily rate greater than 0.');
      return;
    }

    let depositNumber = 0;
    if (securityDeposit.trim()) {
      depositNumber = parseFloat(securityDeposit);
      if (isNaN(depositNumber) || depositNumber < 0) {
        setErrorMessage('Security deposit must be a valid non-negative number.');
        return;
      }
    }

    const parsedDamageFee = parseFloat(damageProtectionFee) || 0;
    if (damageProtectionEnabled && (isNaN(parsedDamageFee) || parsedDamageFee < 0)) {
      setErrorMessage('Damage protection fee must be a valid non-negative number.');
      return;
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setErrorMessage('Please enter the city or neighborhood where the item is located.');
      return;
    }

    setIsLoading(true);
    setLoadingStatus(isEditing ? 'Saving changes...' : 'Creating listing...');

    try {
      const isRemoteImage = (img: string) =>
        img.startsWith('http://') ||
        img.startsWith('https://') ||
        img.startsWith('/uploads/') ||
        img.startsWith('uploads/');

      const existingRemoteImages = selectedImages.filter(isRemoteImage);
      const newLocalImages = selectedImages.filter((img) => !isRemoteImage(img));

      const payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        rentalPrice: {
          perDay: rateNumber,
          securityDeposit: depositNumber,
        },
        dailyRate: rateNumber,
        securityDeposit: depositNumber,
        location: {
          city: trimmedCity,
        },
        city: trimmedCity,
        images: existingRemoteImages,
        damageProtection: {
          isAvailable: damageProtectionEnabled,
          fee: damageProtectionEnabled ? parsedDamageFee : 0,
        },
      };

      if (isEditing) {
        const res = await api.updateProduct(editProductId, payload);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to update listing. Please try again.');
          return;
        }

        // Upload any newly picked images
        if (newLocalImages.length > 0) {
          for (let i = 0; i < newLocalImages.length; i++) {
            setLoadingStatus(`Uploading new images (${i + 1}/${newLocalImages.length})...`);
            const uploadRes = await api.uploadProductImage(editProductId, newLocalImages[i]);
            if (!uploadRes.success) {
              console.warn(`[AddProduct] Image upload failed for index ${i}:`, uploadRes.error);
            }
          }
        }

        setSuccessMessage('Listing updated successfully!');
        // Navigate back or to MyListings
        setTimeout(() => {
          navigation.goBack();
        }, 600);
      } else {
        const res = await api.createProduct(payload);

        if (!res.success || !res.data) {
          setErrorMessage(
            res.error || 'Failed to list item. Please check your details and try again.'
          );
          return;
        }

        const createdProduct = (res.data as any)?.product || (res.data as any)?.data || res.data;
        const newProductId = createdProduct?._id || createdProduct?.id;

        if (selectedImages.length > 0 && newProductId) {
          for (let i = 0; i < selectedImages.length; i++) {
            setLoadingStatus(`Uploading images (${i + 1}/${selectedImages.length})...`);
            const uploadRes = await api.uploadProductImage(newProductId, selectedImages[i]);
            if (!uploadRes.success) {
              console.warn(`[AddProduct] Image upload failed for index ${i}:`, uploadRes.error);
            }
          }
        }

        setSuccessMessage('Item listed successfully!');
        setTitle('');
        setDescription('');
        setCategory('Cameras');
        setDailyRate('');
        setSecurityDeposit('');
        setCity('');
        setSelectedImages([]);

        // Navigate to Home screen after successful creation
        navigation.navigate('Home');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving your listing.');
    } finally {
      setIsLoading(false);
      setLoadingStatus(null);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top cancel/back button when editing */}
        {isEditing && (
          <TouchableScale
            style={styles.backNavButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Cancel and go back"
          >
            <ChevronIcon size={16} color={theme.colors.primary} direction="left" />
            <Text style={styles.backNavText}>Cancel & Back</Text>
          </TouchableScale>
        )}

        {/* Screen Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{isEditing ? 'Edit Item' : 'List an Item'}</Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? 'Update your equipment listing details and pricing'
              : 'Rent your equipment to trusted community members'}
          </Text>
        </View>

        {/* Status Banners */}
        {successMessage && (
          <View style={styles.successBanner}>
            <CheckIcon size={18} color={theme.colors.primaryDark} style={styles.bannerIcon} />
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertIcon size={18} color={theme.colors.error} variant="triangle" style={styles.bannerIcon} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* Section 1: Hero Photos Upload Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardHeaderTitleGroup}>
              <Text style={styles.cardHeader}>Equipment Photos</Text>
              <Text style={styles.fieldHelper}>
                Clear photos boost rental requests significantly.
              </Text>
            </View>
            <View style={styles.countBadge}>
              <CameraIcon size={13} color={theme.colors.primaryDark} />
              <Text style={styles.countBadgeText}>
                {selectedImages.length}/5 photos
              </Text>
            </View>
          </View>

          {/* Thumbnail preview grid */}
          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailScrollContent}
              style={styles.thumbnailScrollView}
            >
              {selectedImages.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.thumbnailWrapper}>
                  <Image
                    source={{ uri: resolveImageUrl(uri) || uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <TouchableScale
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                    disabled={isLoading}
                    accessibilityLabel={`Remove photo ${index + 1}`}
                  >
                    <CloseIcon size={12} color={theme.colors.surface} strokeWidth={2.5} />
                  </TouchableScale>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Warm Dashed Dropzone / Upload Action */}
          <TouchableScale
            style={[
              styles.uploadDropzone,
              selectedImages.length >= 5 && styles.uploadDropzoneDisabled,
            ]}
            onPress={pickImages}
            disabled={isLoading || selectedImages.length >= 5}
          >
            <View style={styles.uploadIconCircle}>
              {selectedImages.length >= 5 ? (
                <CheckIcon size={22} color={theme.colors.textMuted} />
              ) : (
                <CameraIcon size={22} color={theme.colors.accent} />
              )}
            </View>
            <Text
              style={[
                styles.uploadTitle,
                selectedImages.length >= 5 && styles.uploadTitleDisabled,
              ]}
            >
              {selectedImages.length >= 5
                ? 'Maximum 5 Photos Reached'
                : selectedImages.length === 0
                ? 'Add Equipment Photos'
                : `+ Add More Photos (${5 - selectedImages.length} remaining)`}
            </Text>
            <Text style={styles.uploadSubtitle}>
              {selectedImages.length >= 5
                ? 'Remove a photo above to upload a new one'
                : 'Select high-resolution JPG or PNG images'}
            </Text>
          </TouchableScale>
        </View>

        {/* Section 2: Item Details */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Item Details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sony Alpha A7 IV Full-Frame Camera"
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detail specifications, accessories included (batteries, cables, lenses), and condition guidelines..."
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Section 3: Category Selection */}
        <View style={styles.card}>
          <View style={styles.categoryHeaderRow}>
            <Text style={styles.cardHeader}>Category *</Text>
            <TagIcon size={16} color={theme.colors.primary} />
          </View>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableScale
                  key={cat}
                  style={[
                    styles.categoryChip,
                    isSelected ? styles.categoryChipSelected : styles.categoryChipUnselected,
                  ]}
                  onPress={() => setCategory(cat)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected
                        ? styles.categoryChipTextSelected
                        : styles.categoryChipTextUnselected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableScale>
              );
            })}
          </View>
        </View>

        {/* Section 4: Pricing & Location */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Pricing & Location</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Daily Rental Rate (₹/day) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              value={dailyRate}
              onChangeText={setDailyRate}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Refundable Security Deposit (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1500 (Optional, defaults to 0)"
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              value={securityDeposit}
              onChangeText={setSecurityDeposit}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>City / Neighborhood *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Indiranagar, Bangalore"
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              value={city}
              onChangeText={setCity}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Section 5: Damage Protection Toggle Card */}
        <View style={styles.protectionCard}>
          <View style={styles.protectionHeaderRow}>
            <View style={styles.protectionIconCircle}>
              <ShieldIcon size={20} color={theme.colors.primary} withCheck />
            </View>
            <View style={styles.protectionTitleGroup}>
              <Text style={styles.protectionTitle}>Grabit Damage Protection</Text>
              <Text style={styles.protectionSubtitle}>
                Offer renters coverage against accidental damage during rental periods
              </Text>
            </View>
            <Switch
              value={damageProtectionEnabled}
              onValueChange={setDamageProtectionEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              thumbColor={theme.colors.surface}
              disabled={isLoading}
            />
          </View>

          {damageProtectionEnabled && (
            <View style={styles.protectionFeeContainer}>
              <Text style={styles.protectionFeeLabel}>Protection Fee (₹ flat fee)</Text>
              <TextInput
                style={styles.input}
                placeholder="0 (Included for free or enter flat fee)"
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
                value={damageProtectionFee}
                onChangeText={setDamageProtectionFee}
                keyboardType="decimal-pad"
                editable={!isLoading}
              />
              <Text style={styles.protectionFeeHint}>
                Set to 0 to provide complimentary protection, or specify a flat fee per rental.
              </Text>
            </View>
          )}
        </View>

        {/* Submit CTA Button */}
        <TouchableScale
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator color={theme.colors.surface} size="small" />
              <Text style={styles.submitButtonText}>
                {loadingStatus || (isEditing ? 'Saving Changes...' : 'Listing Item...')}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonTextRow}>
              {!isEditing && <PlusIcon size={18} color={theme.colors.surface} style={styles.submitButtonIcon} />}
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Save Changes' : 'List Item on Grabit'}
              </Text>
            </View>
          )}
        </TouchableScale>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  backNavText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  bannerIcon: {
    marginRight: theme.spacing.sm,
  },
  successBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primaryDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.error,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  cardHeaderTitleGroup: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  cardHeader: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  fieldHelper: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  textArea: {
    minHeight: theme.spacing.xxl * 2,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs / 2,
  },
  categoryChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    marginHorizontal: theme.spacing.xs / 2,
    marginBottom: theme.spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentDark,
    ...theme.shadows.sm,
  },
  categoryChipUnselected: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
  },
  categoryChipTextSelected: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
  categoryChipTextUnselected: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  countBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
    marginLeft: theme.spacing.xs / 2,
  },
  uploadDropzone: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.regular,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    ...theme.borderRadius.cardAsymmetric,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDropzoneDisabled: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    opacity: theme.opacity.disabled,
  },
  uploadIconCircle: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  uploadTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  uploadTitleDisabled: {
    color: theme.colors.textMuted,
  },
  uploadSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  thumbnailScrollView: {
    marginBottom: theme.spacing.md,
  },
  thumbnailScrollContent: {
    paddingVertical: theme.spacing.xs,
  },
  thumbnailWrapper: {
    width: theme.spacing.xxl * 2,
    height: theme.spacing.xxl * 2,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    position: 'relative',
    backgroundColor: theme.colors.surfaceSubtle,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    ...theme.borderRadius.cardAsymmetric,
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.xs / 2,
    right: theme.spacing.xs / 2,
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  protectionCard: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  protectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  protectionIconCircle: {
    width: theme.spacing.xl + theme.spacing.xs,
    height: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  protectionTitleGroup: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  protectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  protectionSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  protectionFeeContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  protectionFeeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  protectionFeeHint: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  submitButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    marginRight: theme.spacing.xs,
  },
  submitButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
});

export default AddProductScreen;

