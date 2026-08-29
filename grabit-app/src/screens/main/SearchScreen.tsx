import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ListRenderItem,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { AnimatedHeartButton } from '../../components/AnimatedHeartButton';
import { VoiceSearchModal } from '../../components/VoiceSearchModal';
import {
  SearchIcon,
  FilterIcon,
  HeartIcon,
  LocationIcon,
  CloseIcon,
  RefreshIcon,
  PlusIcon,
  CameraIcon,
  BoxIcon,
  StarIcon,
  TagIcon,
  AlertIcon,
  MicIcon,
  DroneIcon,
  ToolIcon,
  SpeakerIcon,
  ElectronicsIcon,
} from '../../components/icons';
import {
  EmptyListingsIllustration,
  EmptySearchIllustration,
  LoadingIllustration,
} from '../../components/illustrations';
import theme from '../../theme';
import { api, Product, GetProductsParams, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.md * 2 - theme.spacing.sm) / 2;

interface CategoryItem {
  id: string;
  label: string;
  sublabel?: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'All', label: 'All Items' },
  { id: 'Cameras', label: 'Cameras' },
  { id: 'Drones', label: 'Drones' },
  { id: 'Power Tools', label: 'Power Tools' },
  { id: 'Event Equipment', label: 'Event & Audio' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Other', label: 'Other Gear' },
];

const CATEGORY_NAMES = [
  'All',
  'Cameras',
  'Drones',
  'Power Tools',
  'Event Equipment',
  'Electronics',
  'Other',
];

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>(route.params?.search || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(route.params?.category || 'All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Input Focus State
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Voice Search Modal State
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState<boolean>(false);

  // Filter Modal States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState<boolean>(false);
  const [tempCategory, setTempCategory] = useState<string>('All');
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [tempSortOption, setTempSortOption] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Handle incoming route params (e.g. from Home category chips)
  useEffect(() => {
    if (route.params?.category && route.params.category !== selectedCategory) {
      setSelectedCategory(route.params.category);
    }
    if (route.params?.search !== undefined && route.params.search !== searchQuery) {
      setSearchQuery(route.params.search);
    }
  }, [route.params?.category, route.params?.search]);

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    Boolean(minPrice.trim()) ||
    Boolean(maxPrice.trim()) ||
    sortOption !== 'newest';

  const isSearchOrFilterActive =
    hasActiveFilters || Boolean(searchQuery.trim());

  const fetchProducts = useCallback(
    async (
      isRefresh = false,
      overrideFilters?: {
        search?: string;
        category?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: 'newest' | 'price_asc' | 'price_desc';
      }
    ) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const qSearch =
        overrideFilters?.search !== undefined ? overrideFilters.search : searchQuery;
      const qCategory =
        overrideFilters?.category !== undefined ? overrideFilters.category : selectedCategory;
      const qMin =
        overrideFilters?.minPrice !== undefined ? overrideFilters.minPrice : minPrice;
      const qMax =
        overrideFilters?.maxPrice !== undefined ? overrideFilters.maxPrice : maxPrice;
      const qSort =
        overrideFilters?.sort !== undefined ? overrideFilters.sort : sortOption;

      const params: GetProductsParams = {};
      if (qSearch.trim()) params.search = qSearch.trim();
      if (qCategory && qCategory !== 'All') params.category = qCategory;
      if (qMin.trim() && !isNaN(Number(qMin))) params.minPrice = Number(qMin);
      if (qMax.trim() && !isNaN(Number(qMax))) params.maxPrice = Number(qMax);
      if (qSort) params.sort = qSort;

      try {
        const res = await api.getProducts(params);
        if (res.success && res.data) {
          let list: Product[] = [];
          if (Array.isArray(res.data)) {
            list = res.data;
          } else if (Array.isArray((res.data as any).products)) {
            list = (res.data as any).products;
          } else if (Array.isArray((res.data as any).data)) {
            list = (res.data as any).data;
          }
          setProducts(list);
        } else {
          setError(res.error || 'Failed to load listings');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching listings');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchQuery, selectedCategory, minPrice, maxPrice, sortOption]
  );

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
      fetchProducts();
      fetchWishlistIds();
    }, [fetchProducts, fetchWishlistIds])
  );

  const handleRefresh = () => {
    fetchProducts(true);
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

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    fetchProducts(false, { category: catId });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchProducts(false, { search: '' });
  };

  const handleVoiceSearchResult = (query: string) => {
    setSearchQuery(query);
    fetchProducts(false, { search: query });
  };

  const handleOpenFilterModal = () => {
    setTempCategory(selectedCategory);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempSortOption(sortOption);
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    setSelectedCategory(tempCategory);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setSortOption(tempSortOption);
    setIsFilterModalVisible(false);
    fetchProducts(false, {
      category: tempCategory,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
      sort: tempSortOption,
    });
  };

  const handleResetFilters = () => {
    setTempCategory('All');
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempSortOption('newest');
    setSelectedCategory('All');
    setMinPrice('');
    setMaxPrice('');
    setSortOption('newest');
    setSearchQuery('');
    setIsFilterModalVisible(false);
    fetchProducts(false, {
      category: 'All',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      search: '',
    });
  };

  const renderCategoryIcon = (categoryId: string, size = 20, color = theme.colors.primary) => {
    switch (categoryId) {
      case 'Cameras':
        return <CameraIcon size={size} color={color} />;
      case 'Drones':
        return <DroneIcon size={size} color={color} />;
      case 'Power Tools':
        return <ToolIcon size={size} color={color} />;
      case 'Event Equipment':
        return <SpeakerIcon size={size} color={color} />;
      case 'Electronics':
        return <ElectronicsIcon size={size} color={color} />;
      case 'All':
        return <SearchIcon size={size} color={color} />;
      default:
        return <BoxIcon size={size} color={color} />;
    }
  };

  const renderProductItem: ListRenderItem<Product> = ({ item }) => {
    const id = item._id || item.id || '';
    const dailyPrice = item.rentalPrice?.perDay ?? item.dailyRate ?? 0;
    const locationCity = item.location?.city || item.city || 'Nearby';
    const isSaved = wishlistIds.has(id);
    const firstImageUrl = resolveImageUrl(item.images?.[0]);
    const hasImage = Boolean(firstImageUrl);

    return (
      <TouchableScale
        style={styles.gridCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: id, initialProduct: item })}
        scaleTo={0.97}
      >
        {/* Compact Card Image Container */}
        <View style={styles.imageContainer}>
          {hasImage ? (
            <Image
              source={{ uri: firstImageUrl! }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fallbackCategoryBadge}>
              {renderCategoryIcon(item.category, 32, theme.colors.primaryLight)}
            </View>
          )}

          {/* Category Pill Overlay */}
          <View style={styles.imageCategoryBadge}>
            <Text style={styles.imageCategoryBadgeText} numberOfLines={1}>
              {item.category || 'Gear'}
            </Text>
          </View>

          {/* Heart Wishlist Toggle Button */}
          <AnimatedHeartButton
            style={styles.cardHeartButton}
            isSaved={isSaved}
            onPress={() => handleToggleWishlist(id)}
            size={15}
          />
        </View>

        {/* Compact Card Content Body */}
        <View style={styles.cardBody}>
          {/* Location Line */}
          <View style={styles.locationRow}>
            <LocationIcon size={11} color={theme.colors.textMuted} />
            <Text style={styles.cityText} numberOfLines={1}>
              {locationCity}
            </Text>
          </View>

          {/* 2-Line Product Title */}
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Price and Rent CTA Row */}
          <View style={styles.cardBottomRow}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceText}>
                {formatINR(dailyPrice)}
                <Text style={styles.priceUnit}>/day</Text>
              </Text>
            </View>

            <TouchableScale
              style={styles.rentButton}
              onPress={() => navigation.navigate('ProductDetail', { productId: id, initialProduct: item })}
              scaleTo={0.92}
            >
              <Text style={styles.rentButtonText}>Rent</Text>
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

    if (isSearchOrFilterActive) {
      return (
        <View style={styles.emptyContainer}>
          <EmptySearchIllustration size={150} />
          <Text style={styles.emptyTitle}>No matching listings found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find gear matching your current filters or search query. Try broadening your criteria.
          </Text>
          <TouchableScale
            style={styles.emptyActionButton}
            onPress={handleResetFilters}
            scaleTo={0.96}
          >
            <RefreshIcon size={16} color={theme.colors.surface} />
            <Text style={styles.emptyActionButtonText}>Reset All Filters</Text>
          </TouchableScale>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyListingsIllustration size={150} />
        <Text style={styles.emptyTitle}>No listings in your area yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first in your community to list equipment and start earning passive income!
        </Text>
        <TouchableScale
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('AddProduct')}
          scaleTo={0.96}
        >
          <PlusIcon size={16} color={theme.colors.surface} />
          <Text style={styles.emptyActionButtonText}>List an Item</Text>
        </TouchableScale>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Brand & Section Title */}
      <View style={styles.brandTitleRow}>
        <View>
          <View style={styles.headerTag}>
            <Text style={styles.headerTagText}>Community Catalog</Text>
          </View>
          <Text style={styles.title}>Search & Filter</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Find gear, tools, and electronics across our community.
      </Text>

      {/* Flipkart-Style Category Filter Chips */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScrollView}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableScale
                key={cat.id}
                style={styles.flipkartCategoryItem}
                onPress={() => handleSelectCategory(cat.id)}
                scaleTo={0.93}
              >
                <View
                  style={[
                    styles.flipkartIconBox,
                    isSelected && styles.flipkartIconBoxActive,
                  ]}
                >
                  {renderCategoryIcon(
                    cat.id,
                    22,
                    isSelected ? theme.colors.surface : theme.colors.primary
                  )}
                  {isSelected && <View style={styles.activeCheckDot} />}
                </View>
                <Text
                  style={[
                    styles.flipkartCategoryLabel,
                    isSelected && styles.flipkartCategoryLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Filter Indicators Bar */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersRow}>
          {selectedCategory !== 'All' && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>{selectedCategory}</Text>
              <TouchableScale
                onPress={() => handleSelectCategory('All')}
                scaleTo={0.88}
                style={styles.activeFilterCloseIcon}
              >
                <CloseIcon size={12} color={theme.colors.primaryDark} />
              </TouchableScale>
            </View>
          )}
          {Boolean(minPrice || maxPrice) && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>
                ₹{minPrice || '0'} - ₹{maxPrice || '∞'}/day
              </Text>
              <TouchableScale
                onPress={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  fetchProducts(false, { minPrice: '', maxPrice: '' });
                }}
                scaleTo={0.88}
                style={styles.activeFilterCloseIcon}
              >
                <CloseIcon size={12} color={theme.colors.primaryDark} />
              </TouchableScale>
            </View>
          )}
          {sortOption !== 'newest' && (
            <View style={styles.activeFilterPill}>
              <Text style={styles.activeFilterPillText}>
                {sortOption === 'price_asc' ? 'Price: Low to High' : 'Price: High to Low'}
              </Text>
              <TouchableScale
                onPress={() => {
                  setSortOption('newest');
                  fetchProducts(false, { sort: 'newest' });
                }}
                scaleTo={0.88}
                style={styles.activeFilterCloseIcon}
              >
                <CloseIcon size={12} color={theme.colors.primaryDark} />
              </TouchableScale>
            </View>
          )}
          <TouchableScale
            onPress={handleResetFilters}
            scaleTo={0.92}
            style={styles.clearFiltersPill}
          >
            <Text style={styles.clearFiltersPillText}>Clear All</Text>
          </TouchableScale>
        </View>
      )}

      {/* Error Alert */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertIcon size={18} color={theme.colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableScale
            style={styles.retryButton}
            onPress={() => fetchProducts()}
            scaleTo={0.92}
          >
            <RefreshIcon size={14} color={theme.colors.surface} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableScale>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      {/* Search & Filter Top Bar */}
      <View style={styles.searchBarRow}>
        <View style={[styles.searchInputContainer, isSearchFocused && styles.searchInputContainerFocused]}>
          <SearchIcon size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cameras, tools, drones..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            underlineColorAndroid="transparent"
            returnKeyType="search"
            onSubmitEditing={() => fetchProducts(false)}
          />

          {Boolean(searchQuery) && (
            <TouchableScale
              style={styles.clearSearchButton}
              onPress={handleClearSearch}
              scaleTo={0.88}
            >
              <CloseIcon size={16} color={theme.colors.textMuted} />
            </TouchableScale>
          )}

          {/* Voice Search Button */}
          <TouchableScale
            style={styles.micButton}
            onPress={() => setIsVoiceModalVisible(true)}
            scaleTo={0.88}
          >
            <MicIcon size={18} color={theme.colors.primary} />
          </TouchableScale>
        </View>

        {/* Filter Toggle Button */}
        <TouchableScale
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={handleOpenFilterModal}
          scaleTo={0.92}
        >
          <FilterIcon
            size={20}
            color={hasActiveFilters ? theme.colors.surface : theme.colors.textPrimary}
          />
          {hasActiveFilters && <View style={styles.filterBadgeDot} />}
        </TouchableScale>
      </View>

      {/* Main Grid Content Area */}
      {isLoading && products.length === 0 ? (
        <View style={styles.loaderContainer}>
          <LoadingIllustration size={160} />
          <Text style={styles.loaderText}>Discovering community gear...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          keyExtractor={(item, index) => item._id || item.id || `product-${index}`}
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

      {/* Voice Search Modal */}
      <VoiceSearchModal
        visible={isVoiceModalVisible}
        onClose={() => setIsVoiceModalVisible(false)}
        onQueryResult={handleVoiceSearchResult}
      />

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsFilterModalVisible(false)}
            scaleTo={1}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filters & Sort</Text>
                <Text style={styles.modalSubtitle}>Narrow down items to your needs</Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsFilterModalVisible(false)}
                scaleTo={0.88}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Category Chips Selector */}
              <Text style={styles.modalSectionTitle}>Category</Text>
              <View style={styles.modalCategoryChipsRow}>
                {CATEGORY_NAMES.map((cat) => {
                  const isSelected = tempCategory === cat;
                  return (
                    <TouchableScale
                      key={cat}
                      style={[
                        styles.categoryChipOption,
                        isSelected && styles.categoryChipOptionActive,
                      ]}
                      onPress={() => setTempCategory(cat)}
                      scaleTo={0.95}
                    >
                      <Text
                        style={[
                          styles.categoryChipOptionText,
                          isSelected && styles.categoryChipOptionTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableScale>
                  );
                })}
              </View>

              {/* Min & Max Price Inputs (₹/day) */}
              <Text style={styles.modalSectionTitle}>Daily Rate Range (₹/day)</Text>
              <View style={styles.priceInputsRow}>
                <View style={styles.priceInputBox}>
                  <Text style={styles.priceInputPrefix}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    underlineColorAndroid="transparent"
                    value={tempMinPrice}
                    onChangeText={setTempMinPrice}
                  />
                </View>
                <Text style={styles.priceDash}>—</Text>
                <View style={styles.priceInputBox}>
                  <Text style={styles.priceInputPrefix}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    underlineColorAndroid="transparent"
                    value={tempMaxPrice}
                    onChangeText={setTempMaxPrice}
                  />
                </View>
              </View>

              {/* Sorting Options */}
              <Text style={styles.modalSectionTitle}>Sort By</Text>
              <View style={styles.sortOptionsContainer}>
                {[
                  { key: 'newest', label: 'Newest Additions' },
                  { key: 'price_asc', label: 'Price: Low to High' },
                  { key: 'price_desc', label: 'Price: High to Low' },
                ].map((opt) => {
                  const isSelected = tempSortOption === opt.key;
                  return (
                    <TouchableScale
                      key={opt.key}
                      style={[
                        styles.sortOptionRow,
                        isSelected && styles.sortOptionRowActive,
                      ]}
                      onPress={() => setTempSortOption(opt.key as any)}
                      scaleTo={0.97}
                    >
                      <View style={styles.sortRadioCircle}>
                        {isSelected && <View style={styles.sortRadioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.sortOptionLabel,
                          isSelected && styles.sortOptionLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableScale>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableScale
                style={styles.modalResetButton}
                onPress={handleResetFilters}
                scaleTo={0.95}
              >
                <Text style={styles.modalResetButtonText}>Reset All</Text>
              </TouchableScale>

              <TouchableScale
                style={styles.modalApplyButton}
                onPress={handleApplyFilters}
                scaleTo={0.95}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </TouchableScale>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    ...theme.shadows.sm,
  },
  searchInputContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.sm,
    height: '100%',
    padding: 0,
  },
  clearSearchButton: {
    padding: theme.spacing.xs,
  },
  micButton: {
    padding: theme.spacing.xs,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterBadgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  imageContainer: {
    height: 130,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.borderSubtle,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  fallbackCategoryBadge: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  imageCategoryBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: 2,
    paddingHorizontal: 6,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    maxWidth: CARD_WIDTH - 44,
  },
  imageCategoryBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
  },
  cardHeartButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardBody: {
    padding: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  cityText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 1,
  },
  productTitle: {
    fontSize: theme.typography.fontSize.xs + 1,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: 17,
    color: theme.colors.textPrimary,
    minHeight: 34,
    marginBottom: theme.spacing.xs,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  priceColumn: {
    flex: 1,
  },
  priceText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textSecondary,
  },
  rentButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
  },
  rentButtonText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.surface,
  },
  headerContainer: {
    marginBottom: theme.spacing.sm,
  },
  brandTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  headerTag: {
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    ...theme.borderRadius.badgeAsymmetric,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs / 2,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  headerTagText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  categoriesSection: {
    marginBottom: theme.spacing.md,
  },
  categoryScrollView: {
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  categoryScrollContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  flipkartCategoryItem: {
    alignItems: 'center',
    width: 68,
  },
  flipkartIconBox: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
    ...theme.shadows.sm,
  },
  flipkartIconBoxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
    ...theme.shadows.md,
  },
  activeCheckDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
  },
  flipkartCategoryLabel: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  flipkartCategoryLabelActive: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: theme.spacing.xs / 2,
  },
  activeFilterPillText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  activeFilterCloseIcon: {
    padding: 2,
  },
  clearFiltersPill: {
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
  },
  clearFiltersPillText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  errorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs / 2,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loaderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
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
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.sm,
  },
  emptyActionButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.backdrop,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    borderTopWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    maxHeight: '85%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.borderSubtle,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalScroll: {
    paddingBottom: theme.spacing.lg,
  },
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  modalCategoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  categoryChipOption: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  categoryChipOptionActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  categoryChipOptionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  categoryChipOptionTextActive: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  priceInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  priceInputPrefix: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.bold,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  priceDash: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSize.md,
  },
  sortOptionsContainer: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: theme.spacing.sm,
  },
  sortOptionRowActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  sortRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRadioInner: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  sortOptionLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sortOptionLabelActive: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  modalResetButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalApplyButton: {
    flex: 2,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  modalApplyButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default SearchScreen;
