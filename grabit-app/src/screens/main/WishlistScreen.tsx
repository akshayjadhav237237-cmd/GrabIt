import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ListRenderItem,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { AnimatedHeartButton } from '../../components/AnimatedHeartButton';
import {
  HeartIcon,
  TrashIcon,
  LocationIcon,
  ChevronIcon,
  TagIcon,
  CameraIcon,
  DroneIcon,
  PowerToolIcon,
  SpeakerIcon,
  LaptopIcon,
  BoxIcon,
} from '../../components/icons';
import {
  EmptyWishlistIllustration,
  LoadingIllustration,
} from '../../components/illustrations';
import theme from '../../theme';
import { api, Product, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';

const renderCategoryIcon = (category?: string, size = 20, color = theme.colors.primaryLight) => {
  switch (category) {
    case 'Cameras':
      return <CameraIcon size={size} color={color} />;
    case 'Drones':
      return <DroneIcon size={size} color={color} />;
    case 'Power Tools':
      return <PowerToolIcon size={size} color={color} />;
    case 'Event Equipment':
      return <SpeakerIcon size={size} color={color} />;
    case 'Electronics':
      return <LaptopIcon size={size} color={color} />;
    case 'Other':
    default:
      return <BoxIcon size={size} color={color} />;
  }
};

export const WishlistScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchWishlist = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await api.getWishlist();
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        const validList = list.filter((item): item is Product => Boolean(item && (item._id || item.id)));
        setWishlistItems(validList);
      } else {
        setError(res.error || 'Failed to load your saved items.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while fetching your wishlist.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [fetchWishlist])
  );

  const handleRefresh = () => {
    fetchWishlist(true);
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    if (!productId || removingId) return;

    const previousItems = [...wishlistItems];
    setWishlistItems((prev) => prev.filter((p) => (p._id || p.id) !== productId));
    setRemovingId(productId);

    try {
      const res = await api.removeFromWishlist(productId);
      if (!res.success) {
        setWishlistItems(previousItems);
      }
    } catch {
      setWishlistItems(previousItems);
    } finally {
      setRemovingId(null);
    }
  };

  const renderProductItem: ListRenderItem<Product> = ({ item }) => {
    const id = item?._id || item?.id || '';
    const dailyPrice = item?.rentalPrice?.perDay ?? item?.dailyRate ?? 0;
    const locationCity = item?.location?.city || item?.city || 'Nearby';
    const rawImages = item?.images || (item as any)?.imageUrls || [];
    const rawFirstImage = Array.isArray(rawImages) && rawImages.length > 0 ? rawImages[0] : null;
    const firstImage = resolveImageUrl(rawFirstImage);
    const isRemovingThis = removingId === id;

    return (
      <TouchableScale
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { productId: id })}
        scaleTo={0.98}
      >
        {/* Product Image / Placeholder Box */}
        <View style={styles.imageBox}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.fallbackBox}>
              {renderCategoryIcon(item?.category, 48, theme.colors.primaryLight)}
            </View>
          )}

          <View style={styles.categoryBadge}>
            <TagIcon size={12} color={theme.colors.primaryDark} style={styles.tagIcon} />
            <Text style={styles.categoryBadgeText}>{item?.category || 'Gear'}</Text>
          </View>

          {/* Remove / Heart Action Button */}
          <AnimatedHeartButton
            style={styles.heartButton}
            isSaved={true}
            onPress={() => handleRemoveFromWishlist(id)}
            disabled={isRemovingThis}
            size={18}
          />
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{item?.category || 'Equipment'}</Text>
            </View>
            <View style={styles.locationRow}>
              <LocationIcon size={12} color={theme.colors.textMuted} />
              <Text style={styles.cityText}>{locationCity}</Text>
            </View>
          </View>

          <Text style={styles.productTitle} numberOfLines={2}>
            {item?.title || 'Listing'}
          </Text>

          <View style={styles.cardFooterRow}>
            <Text style={styles.priceText}>
              {formatINR(dailyPrice)} <Text style={styles.priceUnit}>/ day</Text>
            </Text>

            <TouchableScale
              style={styles.removeAction}
              onPress={() => handleRemoveFromWishlist(id)}
              scaleTo={0.94}
            >
              <TrashIcon size={14} color={theme.colors.error} />
              <Text style={styles.removeActionText}>Remove</Text>
            </TouchableScale>
          </View>
        </View>
      </TouchableScale>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyWishlistIllustration size={180} />
        <Text style={styles.emptyTitle}>No saved items yet</Text>
        <Text style={styles.emptySubtitle}>
          No saved items yet. Tap the heart on any listing to save it here!
        </Text>
        <TouchableScale
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Home')}
          scaleTo={0.96}
        >
          <Text style={styles.emptyButtonText}>Explore Gear</Text>
        </TouchableScale>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableScale
        style={styles.backNavButton}
        onPress={() => navigation.goBack()}
        scaleTo={0.95}
      >
        <ChevronIcon direction="left" size={16} color={theme.colors.primary} />
        <Text style={styles.backNavText}>Back to Profile</Text>
      </TouchableScale>

      <Text style={styles.title}>Saved Wishlist</Text>
      <Text style={styles.subtitle}>
        {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for your next rental
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableScale
            style={styles.retryButton}
            onPress={() => fetchWishlist()}
            scaleTo={0.95}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableScale>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      {isLoading && wishlistItems.length === 0 ? (
        <View style={styles.loaderContainer}>
          <LoadingIllustration size={90} />
          <Text style={styles.loaderText}>Loading saved items...</Text>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item, index) => item?._id || item?.id || `wishlist-${index}`}
          renderItem={renderProductItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  backNavText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loaderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  imageBox: {
    height: 160,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.borderSubtle,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBox: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  categoryBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagIcon: {
    marginRight: 2,
  },
  categoryBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  heartButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardBody: {
    padding: theme.spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  categoryChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
  },
  productTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  priceText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
  },
  priceUnit: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  removeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
  },
  removeActionText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.error,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  emptyTitle: {
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
    paddingHorizontal: theme.spacing.md,
  },
  emptyButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.sm,
  },
  emptyButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
  },
});

export default WishlistScreen;
