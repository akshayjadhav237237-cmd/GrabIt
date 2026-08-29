import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import {
  PlusIcon,
  ChevronIcon,
  EditIcon,
  TrashIcon,
  BoxIcon,
  CheckIcon,
  AlertIcon,
  TagIcon,
  LocationIcon,
  CameraIcon,
} from '../../components/icons';
import { EmptyListingsIllustration, LoadingIllustration } from '../../components/illustrations';
import theme from '../../theme';
import { api, Product, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchMyProducts = useCallback(async (isPullToRefresh: boolean = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await api.getMyProducts();
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setError(res.error || 'Failed to load your listings.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching your listings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyProducts();
    }, [fetchMyProducts])
  );

  const handleToggleAvailability = async (item: Product) => {
    const productId = item._id || item.id;
    if (!productId) return;

    const currentAvailability = item.availability?.isAvailable !== false;
    const nextAvailability = !currentAvailability;

    setProcessingId(productId);
    try {
      const res = await api.toggleProductAvailability(productId, nextAvailability);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => {
            const pId = p._id || p.id;
            if (pId === productId) {
              return {
                ...p,
                availability: {
                  ...p.availability,
                  isAvailable: nextAvailability,
                },
              };
            }
            return p;
          })
        );
        Alert.alert(
          nextAvailability ? 'Listing Activated' : 'Listing Archived',
          nextAvailability
            ? `"${item.title}" is now active and visible to renters.`
            : `"${item.title}" has been archived and hidden from public search.`
        );
      } else {
        Alert.alert('Update Failed', res.error || 'Failed to update listing availability.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeletePress = async (item: Product) => {
    const productId = item._id || item.id;
    if (!productId) return;

    setProcessingId(productId);
    try {
      const checkRes = await api.checkProductBookings(productId);
      setProcessingId(null);

      if (!checkRes.success) {
        Alert.alert('Error', checkRes.error || 'Failed to verify booking history.');
        return;
      }

      const bookingsCount = checkRes.data?.bookingsCount ?? 0;
      const canHardDelete = checkRes.data?.canHardDelete ?? bookingsCount === 0;

      if (!canHardDelete || bookingsCount > 0) {
        Alert.alert(
          'Cannot Delete Item',
          `This item has ${bookingsCount} rental booking record(s). For safety and dispute records, items with rental history cannot be permanently deleted. You can archive it instead to hide it from search.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Archive Listing',
              onPress: () => handleToggleAvailability(item),
            },
          ]
        );
      } else {
        Alert.alert(
          'Delete Listing',
          `Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                setProcessingId(productId);
                try {
                  const delRes = await api.hardDeleteProduct(productId);
                  if (delRes.success) {
                    setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
                    Alert.alert('Deleted', 'Your listing has been permanently deleted.');
                  } else {
                    Alert.alert('Delete Failed', delRes.error || 'Failed to delete listing.');
                  }
                } catch (delErr: any) {
                  Alert.alert('Error', delErr.message || 'An error occurred while deleting.');
                } finally {
                  setProcessingId(null);
                }
              },
            },
          ]
        );
      }
    } catch (err: any) {
      setProcessingId(null);
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    }
  };

  const handleEditPress = (item: Product) => {
    const productId = item._id || item.id;
    if (!productId) return;

    navigation.navigate('MainTabs', {
      screen: 'AddProduct',
      params: { editProductId: productId },
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const productId = item._id || item.id || '';
    const isAvailable = item.availability?.isAvailable !== false;
    const dailyPrice = item.rentalPrice?.perDay ?? item.dailyRate ?? 0;
    const deposit = item.rentalPrice?.securityDeposit ?? item.securityDeposit ?? 0;
    const rawFirstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
    const firstImage = resolveImageUrl(rawFirstImage);
    const isProcessing = processingId === productId;

    return (
      <View style={styles.listingCard}>
        <View style={styles.cardHeaderRow}>
          {/* Thumbnail */}
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.thumbnailImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <CameraIcon size={24} color={theme.colors.primary} />
            </View>
          )}

          {/* Info Column */}
          <View style={styles.infoColumn}>
            <View style={styles.topBadgeRow}>
              <View style={styles.categoryChip}>
                <TagIcon size={11} color={theme.colors.textSecondary} style={styles.categoryTagIcon} />
                <Text style={styles.categoryChipText}>{item.category || 'Other'}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isAvailable ? styles.statusBadgeActive : styles.statusBadgeArchived,
                ]}
              >
                {isAvailable ? (
                  <CheckIcon size={11} color={theme.colors.primaryDark} strokeWidth={2.5} />
                ) : (
                  <BoxIcon size={11} color={theme.colors.warning} />
                )}
                <Text
                  style={[
                    styles.statusBadgeText,
                    isAvailable ? styles.statusBadgeTextActive : styles.statusBadgeTextArchived,
                  ]}
                >
                  {isAvailable ? 'Active' : 'Archived'}
                </Text>
              </View>
            </View>

            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{formatINR(dailyPrice)}</Text>
              <Text style={styles.pricePeriod}>/day</Text>
              {deposit > 0 && (
                <Text style={styles.depositText}> • {formatINR(deposit)} deposit</Text>
              )}
            </View>

            {item.location?.city ? (
              <View style={styles.locationRow}>
                <LocationIcon size={12} color={theme.colors.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.location.city}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Edit Button */}
          <TouchableScale
            style={styles.actionButtonSecondary}
            onPress={() => handleEditPress(item)}
            disabled={isProcessing}
          >
            <EditIcon size={13} color={theme.colors.textPrimary} />
            <Text style={styles.actionButtonSecondaryText}>Edit</Text>
          </TouchableScale>

          {/* Archive / Unarchive Button */}
          <TouchableScale
            style={[
              styles.actionButtonSecondary,
              isAvailable ? styles.archiveButton : styles.activateButton,
            ]}
            onPress={() => handleToggleAvailability(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            ) : (
              <View style={styles.actionContentRow}>
                {isAvailable ? (
                  <BoxIcon size={13} color={theme.colors.warning} />
                ) : (
                  <CheckIcon size={13} color={theme.colors.primaryDark} />
                )}
                <Text
                  style={[
                    styles.actionButtonSecondaryText,
                    isAvailable ? styles.archiveButtonText : styles.activateButtonText,
                  ]}
                >
                  {isAvailable ? 'Archive' : 'Unarchive'}
                </Text>
              </View>
            )}
          </TouchableScale>

          {/* Delete Button */}
          <TouchableScale
            style={styles.actionButtonDanger}
            onPress={() => handleDeletePress(item)}
            disabled={isProcessing}
          >
            <TrashIcon size={13} color={theme.colors.error} />
            <Text style={styles.actionButtonDangerText}>Delete</Text>
          </TouchableScale>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <EmptyListingsIllustration size={180} />
        <Text style={styles.emptyTitle}>You haven't listed any items yet</Text>
        <Text style={styles.emptySubtitle}>
          Earn extra income by renting out your equipment, cameras, tools, and electronics to verified community members.
        </Text>
        <TouchableScale
          style={styles.emptyActionButton}
          onPress={() =>
            navigation.navigate('MainTabs', {
              screen: 'AddProduct',
            })
          }
        >
          <PlusIcon size={16} color={theme.colors.surface} />
          <Text style={styles.emptyActionText}>List an Item</Text>
        </TouchableScale>
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Top Header Row with Back Button */}
      <View style={styles.headerContainer}>
        <TouchableScale
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <ChevronIcon size={16} color={theme.colors.primary} direction="left" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableScale>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>My Listings</Text>
            <Text style={styles.screenSubtitle}>
              Manage, edit, or archive your listed rental equipment
            </Text>
          </View>
          <TouchableScale
            style={styles.headerAddButton}
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'AddProduct',
              })
            }
          >
            <PlusIcon size={14} color={theme.colors.primaryDark} />
            <Text style={styles.headerAddButtonText}>New</Text>
          </TouchableScale>
        </View>
      </View>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertIcon size={16} color={theme.colors.error} variant="triangle" style={styles.errorIcon} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableScale
            style={styles.retryButton}
            onPress={() => fetchMyProducts()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableScale>
        </View>
      )}

      {/* Content */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingIllustration size={160} />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) => item._id || item.id || `product-${index}`}
          renderItem={renderProductItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchMyProducts(true)}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs / 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  screenTitle: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  headerAddButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
    marginLeft: theme.spacing.xs / 2,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  listingCard: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  thumbnailImage: {
    width: theme.spacing.xxl * 1.6,
    height: theme.spacing.xxl * 1.6,
    ...theme.borderRadius.cardAsymmetric,
    backgroundColor: theme.colors.surfaceSubtle,
    marginRight: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  thumbnailPlaceholder: {
    width: theme.spacing.xxl * 1.6,
    height: theme.spacing.xxl * 1.6,
    ...theme.borderRadius.cardAsymmetric,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  infoColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs / 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  categoryTagIcon: {
    marginRight: theme.spacing.xs / 2,
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
  },
  statusBadgeActive: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  statusBadgeArchived: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.warning,
  },
  statusBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    marginLeft: theme.spacing.xs / 2,
  },
  statusBadgeTextActive: {
    color: theme.colors.primaryDark,
  },
  statusBadgeTextArchived: {
    color: theme.colors.warning,
  },
  listingTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs / 2,
  },
  priceText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  pricePeriod: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textSecondary,
  },
  depositText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textMuted,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs / 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
    marginHorizontal: -theme.spacing.xs / 2,
  },
  actionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs / 2,
  },
  actionButtonSecondaryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs / 2,
  },
  archiveButton: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  archiveButtonText: {
    color: theme.colors.warning,
  },
  activateButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  activateButtonText: {
    color: theme.colors.primaryDark,
  },
  actionButtonDanger: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    marginHorizontal: theme.spacing.xs / 2,
  },
  actionButtonDangerText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs / 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorIcon: {
    marginRight: theme.spacing.xs,
  },
  errorBannerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 1,
  },
  retryButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    marginLeft: theme.spacing.sm,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.md,
  },
  emptyActionText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    marginLeft: theme.spacing.xs,
  },
});

export default MyListingsScreen;
