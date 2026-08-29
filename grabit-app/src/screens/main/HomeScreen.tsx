import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { AnimatedHeartButton } from '../../components/AnimatedHeartButton';
import { VoiceSearchModal } from '../../components/VoiceSearchModal';
import {
  SearchIcon,
  HeartIcon,
  LocationIcon,
  ChevronIcon,
  PlusIcon,
  CameraIcon,
  BoxIcon,
  StarIcon,
  AlertIcon,
  MicIcon,
  DroneIcon,
  ToolIcon,
  SpeakerIcon,
  ElectronicsIcon,
} from '../../components/icons';
import {
  EmptyListingsIllustration,
  LoadingIllustration,
} from '../../components/illustrations';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import { api, Product, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - theme.spacing.md * 2;
const CARD_WIDTH = Math.min(220, SCREEN_WIDTH * 0.6);

interface CategoryItem {
  name: string;
  label: string;
  IconComponent: React.FC<any>;
}

const CATEGORIES: CategoryItem[] = [
  { name: 'Cameras', label: 'Cameras', IconComponent: CameraIcon },
  { name: 'Drones', label: 'Drones', IconComponent: DroneIcon },
  { name: 'Power Tools', label: 'Power Tools', IconComponent: ToolIcon },
  { name: 'Event Equipment', label: 'Event & AV', IconComponent: SpeakerIcon },
  { name: 'Electronics', label: 'Electronics', IconComponent: ElectronicsIcon },
  { name: 'Other', label: 'Other Gear', IconComponent: BoxIcon },
];

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [featured, setFeatured] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [popularPicks, setPopularPicks] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState<boolean>(false);

  const carouselRef = useRef<FlatList<Product>>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const activeIndexRef = useRef<number>(0);
  activeIndexRef.current = activeBannerIndex;

  const displayName = user?.displayName || user?.name || 'Neighbor';

  const handleVoiceSearchResult = (query: string) => {
    navigation.navigate('Search', { search: query });
  };

  const stopBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) {
      clearInterval(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const startBannerTimer = useCallback(() => {
    stopBannerTimer();
    if (featured.length <= 1) return;

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    bannerTimerRef.current = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % featured.length;
      setActiveBannerIndex(nextIndex);
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      try {
        carouselRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      } catch {
        carouselRef.current?.scrollToOffset({
          offset: nextIndex * CAROUSEL_WIDTH,
          animated: true,
        });
      }
    }, 4000);
  }, [featured.length, progressAnim, stopBannerTimer]);

  const fetchHomeFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch newest listings (used for Featured Carousel & Recommended)
      const resNewest = await api.getProducts({ sort: 'newest', limit: 12 });
      let listNewest: Product[] = [];
      if (resNewest.success && resNewest.data) {
        if (Array.isArray(resNewest.data)) {
          listNewest = resNewest.data;
        } else if (Array.isArray((resNewest.data as any).products)) {
          listNewest = (resNewest.data as any).products;
        } else if (Array.isArray((resNewest.data as any).data)) {
          listNewest = (resNewest.data as any).data;
        }
      }

      // Fetch popular/value picks (sorted by price_asc as proxy)
      const resPopular = await api.getProducts({ sort: 'price_asc', limit: 10 });
      let listPopular: Product[] = [];
      if (resPopular.success && resPopular.data) {
        if (Array.isArray(resPopular.data)) {
          listPopular = resPopular.data;
        } else if (Array.isArray((resPopular.data as any).products)) {
          listPopular = (resPopular.data as any).products;
        } else if (Array.isArray((resPopular.data as any).data)) {
          listPopular = (resPopular.data as any).data;
        }
      }

      setFeatured(listNewest.slice(0, 5));
      setRecommended(listNewest.slice(0, 8));
      setPopularPicks(listPopular.slice(0, 8));
    } catch (err: any) {
      setError(err?.message || 'Unable to load items.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchWishlistIds = useCallback(async () => {
    try {
      const res = await api.getWishlist();
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        const ids = new Set<string>(
          list.map((p) => p?._id || p?.id).filter(Boolean) as string[]
        );
        setWishlistIds(ids);
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHomeFeed();
      fetchWishlistIds();
      startBannerTimer();
      return () => {
        stopBannerTimer();
      };
    }, [fetchHomeFeed, fetchWishlistIds, startBannerTimer, stopBannerTimer])
  );

  useEffect(() => {
    if (featured.length > 1) {
      startBannerTimer();
    }
    return () => {
      stopBannerTimer();
    };
  }, [featured.length, startBannerTimer, stopBannerTimer]);

  const handleRefresh = () => {
    fetchHomeFeed(true);
    fetchWishlistIds();
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!productId) return;
    const isSaved = wishlistIds.has(productId);
    const nextSet = new Set(wishlistIds);
    if (isSaved) {
      nextSet.delete(productId);
    } else {
      nextSet.add(productId);
    }
    setWishlistIds(nextSet);

    try {
      if (isSaved) {
        await api.removeFromWishlist(productId);
      } else {
        await api.addToWishlist(productId);
      }
    } catch {
      setWishlistIds(wishlistIds);
    }
  };

  const handleNavigateToCategory = (catName: string) => {
    navigation.navigate('Search', { category: catName });
  };

  const handleNavigateToSearch = () => {
    navigation.navigate('Search');
  };

  const handleBannerScrollBeginDrag = () => {
    stopBannerTimer();
  };

  const handleBannerMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CAROUSEL_WIDTH);
    const safeIndex = Math.max(0, Math.min(index, featured.length - 1));
    setActiveBannerIndex(safeIndex);
    startBannerTimer();
  };

  const hasAnyProducts =
    featured.length > 0 || recommended.length > 0 || popularPicks.length > 0;

  const renderBannerItem = ({ item }: { item: Product }) => {
    const id = item._id || item.id || '';
    const dailyPrice = item.rentalPrice?.perDay ?? item.dailyRate ?? 0;
    const isSaved = wishlistIds.has(id);
    const firstImageUrl = resolveImageUrl(item.images?.[0]);
    const hasImage = Boolean(firstImageUrl);

    return (
      <TouchableScale
        key={id}
        style={[styles.bannerCard, { width: CAROUSEL_WIDTH }]}
        onPress={() => navigation.navigate('ProductDetail', { productId: id, initialProduct: item })}
        scaleTo={0.98}
      >
        <View style={styles.bannerContentContainer}>
          <View style={styles.bannerInfoCol}>
            <View style={styles.bannerBadge}>
              <StarIcon size={10} color={theme.colors.accentDark} filled />
              <Text style={styles.bannerBadgeText}>FEATURED GEAR</Text>
            </View>

            <Text style={styles.bannerTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.bannerPriceRow}>
              <Text style={styles.bannerPriceText}>{formatINR(dailyPrice)}</Text>
              <Text style={styles.bannerPriceUnit}> / day</Text>
            </View>

            <View style={styles.bannerCtaButton}>
              <Text style={styles.bannerCtaText}>Rent Now</Text>
              <ChevronIcon size={12} color={theme.colors.surface} />
            </View>
          </View>

          <View style={styles.bannerImageBox}>
            {hasImage ? (
              <Image
                source={{ uri: firstImageUrl! }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.bannerFallbackBox}>
                <BoxIcon size={40} color={theme.colors.primaryLight} />
              </View>
            )}
            <AnimatedHeartButton
              style={styles.bannerHeart}
              isSaved={isSaved}
              onPress={() => handleToggleWishlist(id)}
              size={16}
            />
          </View>
        </View>
      </TouchableScale>
    );
  };

  const renderHorizontalProductCard = (item: Product) => {
    const id = item._id || item.id || '';
    const dailyPrice = item.rentalPrice?.perDay ?? item.dailyRate ?? 0;
    const locationCity = item.location?.city || item.city || 'Nearby';
    const isSaved = wishlistIds.has(id);
    const firstImageUrl = resolveImageUrl(item.images?.[0]);
    const hasImage = Boolean(firstImageUrl);

    return (
      <TouchableScale
        key={id}
        style={styles.horizontalCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: id, initialProduct: item })}
        scaleTo={0.96}
      >
        <View style={styles.horizontalCardImageBox}>
          {hasImage ? (
            <Image
              source={{ uri: firstImageUrl! }}
              style={styles.horizontalCardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fallbackBox}>
              <BoxIcon size={32} color={theme.colors.primaryLight} />
            </View>
          )}

          <View style={styles.cardCategoryBadge}>
            <Text style={styles.cardCategoryBadgeText}>
              {item.category || 'Gear'}
            </Text>
          </View>

          <AnimatedHeartButton
            style={styles.cardHeart}
            isSaved={isSaved}
            onPress={() => handleToggleWishlist(id)}
            size={16}
          />
        </View>

        <View style={styles.horizontalCardBody}>
          <Text style={styles.horizontalCardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.horizontalLocationRow}>
            <LocationIcon size={12} color={theme.colors.textMuted} />
            <Text style={styles.horizontalLocationText}>{locationCity}</Text>
          </View>

          <View style={styles.horizontalPriceRow}>
            <Text style={styles.horizontalPriceText}>
              {formatINR(dailyPrice)} <Text style={styles.horizontalPriceUnit}>/ day</Text>
            </Text>
          </View>
        </View>
      </TouchableScale>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Top Header Greeting & Location */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingText}>Hello, {displayName} 👋</Text>
            <Text style={styles.taglineText}>Why own it, when you can Grabit?</Text>
          </View>
          <View style={styles.locationChip}>
            <LocationIcon size={14} color={theme.colors.primaryDark} />
            <Text style={styles.locationChipText}>Neighborhood Hub</Text>
          </View>
        </View>

        {/* Tap-to-Search Banner Button */}
        <TouchableScale
          style={styles.searchShortcutBar}
          onPress={handleNavigateToSearch}
          scaleTo={0.98}
        >
          <SearchIcon
            size={20}
            color={theme.colors.primary}
            style={styles.searchShortcutIcon}
          />
          <Text style={styles.searchShortcutPlaceholder}>
            Search cameras, power tools, drones...
          </Text>
          <TouchableScale
            style={styles.searchShortcutMicButton}
            onPress={() => setIsVoiceModalVisible(true)}
            scaleTo={0.88}
          >
            <MicIcon size={18} color={theme.colors.primary} />
          </TouchableScale>
          <View style={styles.searchShortcutFilterPill}>
            <Text style={styles.searchShortcutFilterText}>Browse</Text>
          </View>
        </TouchableScale>

        {/* Module 1: Auto-sliding Featured Carousel Banner with Progress Bars */}
        {featured.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={carouselRef}
              data={featured}
              renderItem={renderBannerItem}
              keyExtractor={(item, index) => item._id || item.id || `banner-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScrollBeginDrag={handleBannerScrollBeginDrag}
              onMomentumScrollEnd={handleBannerMomentumScrollEnd}
              getItemLayout={(_data, index) => ({
                length: CAROUSEL_WIDTH,
                offset: CAROUSEL_WIDTH * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                carouselRef.current?.scrollToOffset({
                  offset: info.index * CAROUSEL_WIDTH,
                  animated: true,
                });
              }}
            />

            {/* Instagram Stories-style Progress Bar Segments */}
            {featured.length > 1 && (
              <View style={styles.progressBarContainer}>
                {featured.map((_, i) => {
                  let segmentWidth: any;
                  if (i < activeBannerIndex) {
                    segmentWidth = '100%';
                  } else if (i === activeBannerIndex) {
                    segmentWidth = progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    });
                  } else {
                    segmentWidth = '0%';
                  }

                  return (
                    <View key={`progress-${i}`} style={styles.progressTrack}>
                      <Animated.View
                        style={[
                          styles.progressFill,
                          { width: segmentWidth },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Module 4: Category Row (Flipkart Reference Style) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableScale
              onPress={() => navigation.navigate('Search')}
              scaleTo={0.94}
            >
              <Text style={styles.seeAllText}>See all →</Text>
            </TouchableScale>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const IconComp = cat.IconComponent;
              return (
                <TouchableScale
                  key={cat.name}
                  style={styles.categoryItem}
                  onPress={() => handleNavigateToCategory(cat.name)}
                  scaleTo={0.92}
                >
                  <View style={styles.categoryIconContainer}>
                    <IconComp size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </TouchableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* Error Notification */}
        {error && (
          <View style={styles.errorCard}>
            <AlertIcon size={18} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading State */}
        {isLoading && !hasAnyProducts ? (
          <View style={styles.loaderBox}>
            <LoadingIllustration size={120} />
            <Text style={styles.loaderSubtext}>Loading local gear...</Text>
          </View>
        ) : !hasAnyProducts ? (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <EmptyListingsIllustration size={180} />
            <Text style={styles.emptyTitle}>No gear listed in your community yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the pioneer in your neighborhood! List your unused camera, drone, or tools to start earning today.
            </Text>
            <TouchableScale
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddProduct')}
              scaleTo={0.96}
            >
              <PlusIcon size={18} color={theme.colors.surface} />
              <Text style={styles.emptyButtonText}>List Your First Item</Text>
            </TouchableScale>
          </View>
        ) : (
          <>
            {/* Module 8: Recommended for you */}
            {/* Recommendation engine UI placeholder — swap data source when real ML recommendation logic exists */}
            {recommended.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Recommended for you</Text>
                    <Text style={styles.sectionSubtitle}>
                      Top picks curated for your upcoming projects
                    </Text>
                  </View>
                  <TouchableScale
                    onPress={() => navigation.navigate('Search', { sort: 'newest' })}
                    scaleTo={0.94}
                  >
                    <Text style={styles.seeAllText}>View all</Text>
                  </TouchableScale>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardsScroll}
                >
                  {recommended.map(renderHorizontalProductCard)}
                </ScrollView>
              </View>
            )}

            {/* Module 8: Popular Picks */}
            {popularPicks.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Popular Picks</Text>
                    <Text style={styles.sectionSubtitle}>
                      Frequently rented gear with top value rates
                    </Text>
                  </View>
                  <TouchableScale
                    onPress={() => navigation.navigate('Search', { sort: 'price_asc' })}
                    scaleTo={0.94}
                  >
                    <Text style={styles.seeAllText}>View all</Text>
                  </TouchableScale>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCardsScroll}
                >
                  {popularPicks.map(renderHorizontalProductCard)}
                </ScrollView>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Voice Search Modal */}
      <VoiceSearchModal
        visible={isVoiceModalVisible}
        onClose={() => setIsVoiceModalVisible(false)}
        onQueryResult={handleVoiceSearchResult}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  greetingText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.primary,
  },
  taglineText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: 4,
  },
  locationChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
  },
  searchShortcutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  searchShortcutIcon: {
    marginRight: theme.spacing.sm,
  },
  searchShortcutPlaceholder: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textMuted,
  },
  searchShortcutMicButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchShortcutFilterPill: {
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  searchShortcutFilterText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  carouselContainer: {
    marginBottom: theme.spacing.lg,
  },
  bannerCard: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
    ...theme.shadows.md,
    padding: theme.spacing.md,
  },
  bannerContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 125,
  },
  bannerInfoCol: {
    flex: 1,
    paddingRight: theme.spacing.sm,
    justifyContent: 'space-between',
    height: '100%',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accentTint,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: 4,
  },
  bannerBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accentDark,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.md,
  },
  bannerPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bannerPriceText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  bannerPriceUnit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  bannerCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  bannerCtaText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.surface,
  },
  bannerImageBox: {
    width: 110,
    height: 110,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerHeart: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accent,
  },
  categoriesScrollContent: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  categoryLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  horizontalCardsScroll: {
    gap: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  horizontalCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  horizontalCardImageBox: {
    height: 120,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  horizontalCardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  cardCategoryBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
  },
  cardHeart: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  horizontalCardBody: {
    padding: theme.spacing.sm,
  },
  horizontalCardTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  horizontalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  horizontalLocationText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  horizontalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  horizontalPriceText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  horizontalPriceUnit: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  loaderBox: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderSubtext: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: theme.typography.lineHeight.sm,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
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
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
  },
});

export default HomeScreen;
