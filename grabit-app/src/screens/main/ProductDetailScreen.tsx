import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { AnimatedHeartButton } from '../../components/AnimatedHeartButton';
import {
  CameraIcon,
  ShieldIcon,
  StarIcon,
  LocationIcon,
  HeartIcon,
  AlertIcon,
  ChevronIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
  TagIcon,
  CalendarIcon,
  TrashIcon,
} from '../../components/icons';
import { LoadingIllustration } from '../../components/illustrations';
import { CalendarRangePicker } from '../../components/CalendarRangePicker';
import { RazorpayCheckoutModal, RazorpayOrderData } from '../../components/RazorpayCheckoutModal';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import { api, Product, ProductOwner, BlackoutPeriod, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';

const getTomorrow = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getFutureDate = (baseDate: Date, daysAhead: number): Date => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateDisplay = (date?: Date | null): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

const formatDateISO = (date?: Date | string | null): string => {
  if (!date) return '';
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return date.split('T')[0];
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

const calculateDays = (start?: Date | null, end?: Date | null): number => {
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

export const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const productId = route.params?.productId;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [carouselWidth, setCarouselWidth] = useState<number>(() => {
    const w = Dimensions.get('window')?.width || 360;
    return Math.max(120, w - theme.spacing.md * 2);
  });

  const { user: currentUser } = useAuth();

  // Booking Flow States
  const [isBookingModalVisible, setIsBookingModalVisible] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(() => getTomorrow());
  const [endDate, setEndDate] = useState<Date>(() => getFutureDate(getTomorrow(), 3));
  const [damageProtectionOpted, setDamageProtectionOpted] = useState<boolean>(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Availability & Blackout Dates States
  const [isAvailabilityModalVisible, setIsAvailabilityModalVisible] = useState<boolean>(false);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutPeriod[]>([]);
  const [newBlackoutStart, setNewBlackoutStart] = useState<Date>(() => getTomorrow());
  const [newBlackoutEnd, setNewBlackoutEnd] = useState<Date>(() => getFutureDate(getTomorrow(), 2));
  const [newBlackoutReason, setNewBlackoutReason] = useState<string>('');
  const [isSavingAvailability, setIsSavingAvailability] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Report Listing States
  const [isReportModalVisible, setIsReportModalVisible] = useState<boolean>(false);
  const [selectedReportReason, setSelectedReportReason] = useState<
    'Spam' | 'Inappropriate' | 'Scam/Fraud' | 'Other'
  >('Spam');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Wishlist State
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Instant Payment Flow States
  const [createdBookingForPayment, setCreatedBookingForPayment] = useState<any>(null);
  const [paymentOrderData, setPaymentOrderData] = useState<RazorpayOrderData | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState<boolean>(false);

  const handleToggleWishlist = async () => {
    if (!productId) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      if (nextSaved) {
        await api.addToWishlist(productId);
      } else {
        await api.removeFromWishlist(productId);
      }
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (carouselWidth > 0) {
      const index = Math.round(offsetX / carouselWidth);
      if (index !== activeImageIndex && index >= 0) {
        setActiveImageIndex(index);
      }
    }
  };

  useEffect(() => {
    if (!productId) {
      setError('Product ID was not provided.');
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getProductById(productId);
        if (res.success && res.data) {
          const item = (res.data as any)?.product || (res.data as any)?.data || res.data;
          setProduct(item);
          if (item?.availability?.blackoutDates && Array.isArray(item.availability.blackoutDates)) {
            setBlackoutDates(
              item.availability.blackoutDates
                .filter((b: any) => b && (b.startDate || b.endDate))
                .map((b: any) => ({
                  startDate: typeof b.startDate === 'string' ? b.startDate : formatDateISO(b.startDate),
                  endDate: typeof b.endDate === 'string' ? b.endDate : formatDateISO(b.endDate),
                  reason: b.reason || '',
                }))
            );
          }
        } else {
          setError(res.error || 'Failed to load product details.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching product details.');
      } finally {
        setIsLoading(false);
      }
    };

    const checkWishlistStatus = async () => {
      try {
        const res = await api.getWishlist();
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : [];
          const found = list.some((p) => (p?._id || p?.id) === productId);
          setIsSaved(found);
        }
      } catch {
        // ignore
      }
    };

    fetchProduct();
    checkWishlistStatus();
  }, [productId]);

  const handleAdjustBlackoutStart = (daysDelta: number) => {
    const minStart = new Date();
    minStart.setHours(0, 0, 0, 0);
    const newStart = new Date(newBlackoutStart);
    newStart.setDate(newStart.getDate() + daysDelta);
    if (newStart < minStart) return;
    setNewBlackoutStart(newStart);
    if (newStart >= newBlackoutEnd) {
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + 1);
      setNewBlackoutEnd(newEnd);
    }
  };

  const handleAdjustBlackoutEnd = (daysDelta: number) => {
    const newEnd = new Date(newBlackoutEnd);
    newEnd.setDate(newEnd.getDate() + daysDelta);
    const minEnd = new Date(newBlackoutStart);
    minEnd.setDate(minEnd.getDate() + 1);
    if (newEnd < minEnd) return;
    setNewBlackoutEnd(newEnd);
  };

  const handleAddBlackoutPeriod = () => {
    if (newBlackoutStart.getTime() >= newBlackoutEnd.getTime()) {
      setAvailabilityError('End date must be after start date.');
      return;
    }

    const startMs = newBlackoutStart.getTime();
    const endMs = newBlackoutEnd.getTime();

    const hasOverlap = blackoutDates.some((p) => {
      const pStart = new Date(p.startDate).getTime();
      const pEnd = new Date(p.endDate).getTime();
      return startMs < pEnd && endMs > pStart;
    });

    if (hasOverlap) {
      setAvailabilityError('Selected dates overlap with an existing blackout period.');
      return;
    }

    const newPeriod: BlackoutPeriod = {
      startDate: formatDateISO(newBlackoutStart),
      endDate: formatDateISO(newBlackoutEnd),
      reason: newBlackoutReason.trim() || undefined,
    };

    setBlackoutDates((prev) => [...prev, newPeriod]);
    setNewBlackoutReason('');
    setAvailabilityError(null);
  };

  const handleDeleteBlackoutPeriod = (indexToRemove: number) => {
    setBlackoutDates((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveAvailability = async () => {
    if (!product || !productId) return;
    setIsSavingAvailability(true);
    setAvailabilityError(null);
    try {
      const res = await api.updateProductAvailability(productId, blackoutDates);
      if (res.success) {
        setProduct((prev) =>
          prev
            ? {
                ...prev,
                availability: {
                  isAvailable: prev.availability?.isAvailable ?? true,
                  blackoutDates,
                },
              }
            : null
        );
        setIsAvailabilityModalVisible(false);
        Alert.alert(
          'Availability Saved',
          'Your product blackout dates have been updated successfully.'
        );
      } else {
        setAvailabilityError(res.error || 'Failed to update availability. Please try again.');
      }
    } catch (err: any) {
      setAvailabilityError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleOpenReportModal = () => {
    setSelectedReportReason('Spam');
    setReportDetails('');
    setReportError(null);
    setIsReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!productId) return;
    setIsSubmittingReport(true);
    setReportError(null);
    try {
      const res = await api.createReport({
        targetType: 'product',
        targetId: productId,
        reason: selectedReportReason,
        details: reportDetails.trim() || undefined,
      });

      if (res.success) {
        setIsReportModalVisible(false);
        Alert.alert(
          'Report Submitted',
          'Thank you for reporting. Our safety team will review this listing.'
        );
      } else {
        setReportError(res.error || 'Failed to submit report. Please try again.');
      }
    } catch (err: any) {
      setReportError(err.message || 'An unexpected error occurred while submitting your report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleRequestRent = () => {
    setBookingError(null);
    setIsBookingModalVisible(true);
  };

  const handleDateRangeChange = (startStr: string | null, endStr: string | null) => {
    if (startStr) {
      const parts = startStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
        setStartDate(d);
      } else {
        setStartDate(new Date(startStr));
      }
    } else {
      setStartDate(null as any);
    }

    if (endStr) {
      const parts = endStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
        setEndDate(d);
      } else {
        setEndDate(new Date(endStr));
      }
    } else {
      setEndDate(null as any);
    }

    if (bookingError) {
      setBookingError(null);
    }
  };

  const handleAdjustStartDate = (daysDelta: number) => {
    const minStart = getTomorrow();
    const current = startDate || minStart;
    const newStart = new Date(current);
    newStart.setDate(newStart.getDate() + daysDelta);
    if (newStart < minStart) {
      return;
    }
    setStartDate(newStart);
    if (endDate && newStart >= endDate) {
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + 1);
      setEndDate(newEnd);
    }
  };

  const handleAdjustEndDate = (daysDelta: number) => {
    const minStart = startDate || getTomorrow();
    const current = endDate || getFutureDate(minStart, 1);
    const newEnd = new Date(current);
    newEnd.setDate(newEnd.getDate() + daysDelta);
    const minEnd = new Date(minStart);
    minEnd.setDate(minEnd.getDate() + 1);
    if (newEnd < minEnd) {
      return;
    }
    setEndDate(newEnd);
  };

  const handleSelectPresetDuration = (days: number) => {
    const start = startDate || getTomorrow();
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() + days);
    setEndDate(newEnd);
  };

  const handleConfirmBooking = async () => {
    if (!product || !productId) return;
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setBookingError('Please select both a start date and return date on the calendar.');
      return;
    }
    if (startDate >= endDate) {
      setBookingError('Return date must be strictly after pickup start date.');
      return;
    }

    setIsSubmittingBooking(true);
    setBookingError(null);
    try {
      const res = await api.createBooking({
        productId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        damageProtectionOpted,
      });

      if (res.success && res.data) {
        const createdBooking = res.data;
        setIsBookingModalVisible(false);

        const bookingId = (createdBooking._id || createdBooking.id || '') as string;
        const pricingPayload = createdBooking.pricing || {
          rentalFee,
          platformFee,
          securityDeposit: safeSecurityDeposit,
          damageProtectionFee,
          totalAmount,
        };

        // Booking created successfully. Navigate to PaymentScreen where api.createPaymentOrder(bookingId) is invoked.
        navigation.navigate('Payment', {
          bookingId,
          product: product || createdBooking.product,
          totalDays: createdBooking.totalDays || totalDays,
          pricing: pricingPayload,
          startDate: formatDateISO(startDate),
          endDate: formatDateISO(endDate),
        });
      } else {
        setBookingError(res.error || 'Failed to create booking. Please try again.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'An unexpected error occurred while processing your booking.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setIsPaymentModalVisible(false);
    if (!createdBookingForPayment) return;
    const bId = createdBookingForPayment._id || createdBookingForPayment.id;
    try {
      const verifyRes = await api.verifyPayment(bId, paymentResult);
      if (verifyRes.success) {
        Alert.alert(
          'Booking Activated! 🎉',
          'Your payment was verified successfully and your booking is now active! Happy renting!',
          [
            {
              text: 'View Bookings',
              onPress: () => navigation.navigate('Bookings' as any),
            },
          ]
        );
      } else {
        Alert.alert('Payment Verification Pending', verifyRes.error || 'Please check your Bookings tab.', [
          { text: 'Go to Bookings', onPress: () => navigation.navigate('Bookings' as any) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Payment Notice', err?.message || 'Payment received. Check your Bookings tab for status.', [
        { text: 'OK', onPress: () => navigation.navigate('Bookings' as any) },
      ]);
    }
  };

  const handlePaymentDismiss = () => {
    setIsPaymentModalVisible(false);
    Alert.alert(
      'Booking Saved',
      'Your booking is confirmed! You can complete payment at any time from the Bookings tab.',
      [
        {
          text: 'Go to Bookings',
          onPress: () => navigation.navigate('Bookings' as any),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContainer}>
          <LoadingIllustration size={160} />
          <Text style={styles.loadingText}>Loading item details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !product) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <AlertIcon size={40} color={theme.colors.error} variant="triangle" />
          <Text style={styles.errorTitle}>Listing Unavailable</Text>
          <Text style={styles.errorMessage}>{error || 'Could not find the requested item.'}</Text>
          <TouchableScale
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronIcon size={16} color={theme.colors.surface} direction="left" />
            <Text style={styles.backButtonText}>Back to Listings</Text>
          </TouchableScale>
        </View>
      </ScreenContainer>
    );
  }

  const resolvedCategory = product?.category || (product as any)?.data?.category || '';
  const dailyPrice =
    product?.rentalPrice?.perDay ??
    product?.dailyRate ??
    (product as any)?.data?.rentalPrice?.perDay ??
    0;
  const securityDeposit =
    product?.rentalPrice?.securityDeposit ??
    product?.securityDeposit ??
    (product as any)?.data?.rentalPrice?.securityDeposit ??
    0;
  const resolvedTitle = product?.title || (product as any)?.data?.title || 'Listing';
  const resolvedDescription =
    product?.description || (product as any)?.data?.description || 'No description provided.';
  const city =
    product?.location?.city ||
    product?.city ||
    (product as any)?.data?.location?.city ||
    'Nearby Community';

  const rawImages =
    product?.images ||
    (product as any)?.imageUrls ||
    (product as any)?.data?.images ||
    [];
  const images: string[] = Array.isArray(rawImages) ? rawImages : [];

  const currentUserId = currentUser?.id || (currentUser as any)?._id;
  const ownerObj: ProductOwner | null =
    typeof product?.owner === 'object' && product.owner !== null ? product.owner : null;
  const ownerId =
    ownerObj?._id ||
    ownerObj?.id ||
    (typeof product?.owner === 'string' ? product.owner : undefined);
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);
  const ownerName = ownerObj?.displayName || ownerObj?.name || 'Verified Lender';

  // Safe owner rating resolution (handles number, Mongoose subdocument { average, count }, or fallback)
  const rawOwnerRating =
    typeof ownerObj?.rating === 'number'
      ? ownerObj.rating
      : typeof (ownerObj?.rating as any)?.average === 'number'
      ? (ownerObj?.rating as any).average
      : typeof (product as any)?.ownerRating === 'number'
      ? (product as any).ownerRating
      : 0;
  const ownerRating =
    typeof rawOwnerRating === 'number' && !isNaN(rawOwnerRating) && rawOwnerRating > 0
      ? rawOwnerRating.toFixed(1)
      : '5.0';
  const ownerInitial = (ownerName.charAt(0) || 'U').toUpperCase();

  const isDamageProtectionAvailable = Boolean(
    product?.damageProtection && product.damageProtection.isAvailable
  );
  const damageProtectionFeeAmount = product?.damageProtection?.fee || 0;

  // Live Pricing Calculations with safeguards
  const totalDays = calculateDays(startDate, endDate);
  const safeDailyPrice = typeof dailyPrice === 'number' && !isNaN(dailyPrice) ? dailyPrice : 0;
  const safeSecurityDeposit =
    typeof securityDeposit === 'number' && !isNaN(securityDeposit) ? securityDeposit : 0;
  const safeDamageFee =
    typeof damageProtectionFeeAmount === 'number' && !isNaN(damageProtectionFeeAmount)
      ? damageProtectionFeeAmount
      : 0;
  const rentalFee = safeDailyPrice * totalDays;
  const platformFee = Math.round(rentalFee * 0.15 * 100) / 100;
  const damageProtectionFee =
    damageProtectionOpted && isDamageProtectionAvailable ? safeDamageFee : 0;
  const totalAmount =
    Math.round((rentalFee + platformFee + safeSecurityDeposit + damageProtectionFee) * 100) / 100;

  const windowWidth = Dimensions.get('window')?.width || 360;
  const safeCarouselWidth = Math.max(120, carouselWidth || (windowWidth - theme.spacing.md * 2));

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Navigation & Heart Toggle Row */}
        <View style={styles.topNavRow}>
          <TouchableScale
            style={styles.navBackButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Back to listings"
          >
            <ChevronIcon size={16} color={theme.colors.textPrimary} direction="left" />
            <Text style={styles.navBackText}>Back</Text>
          </TouchableScale>

          <AnimatedHeartButton
            style={styles.headerHeartButton}
            isSaved={isSaved}
            onPress={handleToggleWishlist}
            size={20}
          />
        </View>

        {/* Hero Image Carousel / Fallback box */}
        {images && images.length > 0 ? (
          <View
            style={styles.carouselContainer}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - carouselWidth) > 1) {
                setCarouselWidth(w);
              }
            }}
          >
            <View style={styles.carouselSlideWrapper}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) =>
                  typeof item === 'string' ? `${item}-${index}` : `img-${index}`
                }
                onScroll={handleScroll}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => {
                  const rawUri =
                    typeof item === 'string' ? item : (item as any)?.url || (item as any)?.uri || '';
                  const imgUri = resolveImageUrl(rawUri);
                  return (
                    <View style={[styles.slide, { width: safeCarouselWidth }]}>
                      {imgUri ? (
                        <Image
                          source={{ uri: imgUri }}
                          style={styles.carouselImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.heroBox}>
                          <CameraIcon size={44} color={theme.colors.primaryLight} />
                        </View>
                      )}
                    </View>
                  );
                }}
              />
              <View style={styles.heroCategoryBadge}>
                <TagIcon size={12} color={theme.colors.primaryDark} style={styles.heroBadgeIcon} />
                <Text style={styles.heroCategoryBadgeText}>{resolvedCategory || 'General'}</Text>
              </View>
            </View>

            {/* Custom Terracotta Pagination indicator dots */}
            {images.length > 1 && (
              <View style={styles.paginationContainer}>
                {images.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.paginationDot,
                      index === activeImageIndex
                        ? styles.paginationDotActive
                        : styles.paginationDotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.heroBox}>
            <CameraIcon size={48} color={theme.colors.primaryLight} />
            <View style={styles.heroCategoryBadge}>
              <TagIcon size={12} color={theme.colors.primaryDark} style={styles.heroBadgeIcon} />
              <Text style={styles.heroCategoryBadgeText}>{resolvedCategory || 'General'}</Text>
            </View>
          </View>
        )}

        {/* Title, Location and Rating Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <View style={styles.metaRow}>
            <View style={styles.locationGroup}>
              <LocationIcon size={15} color={theme.colors.textSecondary} />
              <Text style={styles.locationText}>{city}</Text>
            </View>
            <View style={styles.ratingSummaryBadge}>
              <StarIcon size={14} color={theme.colors.warning} filled />
              <Text style={styles.ratingSummaryText}>{ownerRating}</Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.card}>
          <View style={styles.pricingRow}>
            <View style={styles.rateBox}>
              <Text style={styles.pricingLabel}>Daily Rental Rate</Text>
              <View style={styles.priceRow}>
                <Text style={styles.pricePerDay}>{formatINR(dailyPrice)}</Text>
                <Text style={styles.priceUnit}> / day</Text>
              </View>
            </View>
            <View style={styles.depositDivider} />
            <View style={styles.depositBox}>
              <Text style={styles.depositLabel}>Security Deposit</Text>
              <Text style={styles.depositValue}>{formatINR(securityDeposit)}</Text>
              <Text style={styles.depositNote}>(refundable)</Text>
            </View>
          </View>
        </View>

        {/* Damage Protection Card */}
        <View style={styles.protectionCard}>
          <View style={styles.protectionIconCircle}>
            <ShieldIcon size={20} color={theme.colors.primary} withCheck />
          </View>
          <View style={styles.protectionInfo}>
            <View style={styles.protectionBadgeRow}>
              <Text style={styles.protectionTitle}>
                {isDamageProtectionAvailable
                  ? 'Damage Protection Included'
                  : 'Standard Coverage'}
              </Text>
              <View style={styles.shieldBadge}>
                <Text style={styles.shieldBadgeText}>Backed Guarantee</Text>
              </View>
            </View>
            <Text style={styles.protectionDescription}>
              Eligible rentals are covered by Grabit item protection against unexpected accidental damage during rental periods.
            </Text>
          </View>
        </View>

        {/* Full Description Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Description</Text>
          <Text style={styles.descriptionText}>{resolvedDescription}</Text>
        </View>

        {/* Owner Profile Row */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Listed By</Text>
          <TouchableScale
            style={styles.ownerRow}
            onPress={() => {
              const navOwnerId =
                ownerObj?._id ||
                ownerObj?.id ||
                (typeof product.owner === 'string' ? product.owner : undefined);
              if (navOwnerId) {
                (navigation as any).navigate('Profile', { userId: navOwnerId });
              }
            }}
          >
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>{ownerInitial}</Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{ownerName}</Text>
              <View style={styles.ratingRow}>
                <StarIcon size={14} color={theme.colors.warning} filled />
                <Text style={styles.ratingText}>{ownerRating}</Text>
                <Text style={styles.ratingSub}>• Verified Community Member</Text>
              </View>
            </View>
            <ChevronIcon size={18} color={theme.colors.textMuted} direction="right" />
          </TouchableScale>
        </View>

        {/* Action Button: Owner vs Renter */}
        {isOwner ? (
          <TouchableScale
            style={styles.manageAvailabilityButton}
            onPress={() => {
              setAvailabilityError(null);
              setIsAvailabilityModalVisible(true);
            }}
          >
            <CalendarIcon size={18} color={theme.colors.primaryDark} style={styles.buttonActionIcon} />
            <Text style={styles.manageAvailabilityButtonText}>
              Manage Availability & Blackout Dates
            </Text>
          </TouchableScale>
        ) : (
          <TouchableScale
            style={styles.rentButton}
            onPress={handleRequestRent}
          >
            <Text style={styles.rentButtonText}>Instant Book & Pay</Text>
          </TouchableScale>
        )}

        {/* Report Listing Action Row */}
        {!isOwner && (
          <TouchableScale
            style={styles.reportListingButton}
            onPress={handleOpenReportModal}
          >
            <AlertIcon size={15} color={theme.colors.textSecondary} variant="triangle" />
            <Text style={styles.reportListingButtonText}>Report Listing</Text>
          </TouchableScale>
        )}
      </ScrollView>

      {/* Booking Request Modal */}
      <Modal
        visible={isBookingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsBookingModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Instant Booking</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {resolvedTitle}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsBookingModalVisible(false)}
                accessibilityLabel="Close booking modal"
              >
                <CloseIcon size={18} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Rental Dates Selection with Calendar Range Picker */}
              <Text style={styles.modalSectionTitle}>Select Rental Dates</Text>

              <View style={styles.calendarPickerContainer}>
                <CalendarRangePicker
                  startDate={startDate ? formatDateISO(startDate) : null}
                  endDate={endDate ? formatDateISO(endDate) : null}
                  onDateRangeChange={handleDateRangeChange}
                  blackoutDates={blackoutDates}
                  minDate={getTomorrow()}
                />
              </View>

              {/* Damage Protection Toggle */}
              {isDamageProtectionAvailable && (
                <TouchableScale
                  style={[
                    styles.damageToggleCard,
                    damageProtectionOpted && styles.damageToggleCardActive,
                  ]}
                  onPress={() => setDamageProtectionOpted(!damageProtectionOpted)}
                >
                  <View style={[styles.checkbox, damageProtectionOpted && styles.checkboxActive]}>
                    {damageProtectionOpted && (
                      <CheckIcon size={12} color={theme.colors.surface} strokeWidth={3} />
                    )}
                  </View>
                  <View style={styles.damageToggleInfo}>
                    <Text style={styles.damageToggleTitle}>
                      Damage Protection (+{formatINR(damageProtectionFeeAmount)} flat fee)
                    </Text>
                    <Text style={styles.damageToggleDesc}>
                      Covers accidental damages during your rental duration.
                    </Text>
                  </View>
                </TouchableScale>
              )}

              {/* Live Pricing Breakdown */}
              <View style={styles.pricingBreakdownCard}>
                <Text style={styles.breakdownHeaderTitle}>Pricing Breakdown</Text>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Days</Text>
                  <Text style={styles.breakdownValue}>
                    {totalDays} {totalDays === 1 ? 'day' : 'days'}
                  </Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Rental Fee ({formatINR(dailyPrice)} × {totalDays}d)
                  </Text>
                  <Text style={styles.breakdownValue}>{formatINR(rentalFee)}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Platform Service Fee (15%)</Text>
                  <Text style={styles.breakdownValue}>{formatINR(platformFee)}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Refundable Security Deposit</Text>
                  <Text style={styles.breakdownValue}>{formatINR(securityDeposit)}</Text>
                </View>

                {damageProtectionOpted && isDamageProtectionAvailable && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Damage Protection Fee (Flat)</Text>
                    <Text style={styles.breakdownValue}>{formatINR(damageProtectionFee)}</Text>
                  </View>
                )}

                <View style={styles.breakdownDivider} />

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownTotalLabel}>Total Amount</Text>
                  <Text style={styles.breakdownTotalValue}>{formatINR(totalAmount)}</Text>
                </View>
              </View>

              {/* Booking Error Banner */}
              {bookingError && (
                <View style={styles.bookingErrorBanner}>
                  <AlertIcon size={16} color={theme.colors.error} variant="triangle" />
                  <Text style={styles.bookingErrorText}>{bookingError}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <TouchableScale
                style={[
                  styles.confirmBookingButton,
                  (isSubmittingBooking || !startDate || !endDate) && styles.confirmBookingButtonDisabled,
                ]}
                onPress={handleConfirmBooking}
                disabled={isSubmittingBooking || !startDate || !endDate}
              >
                {isSubmittingBooking ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.confirmBookingText}>
                    Instant Book & Pay ({formatINR(totalAmount)})
                  </Text>
                )}
              </TouchableScale>

              <TouchableScale
                style={styles.cancelBookingButton}
                onPress={() => setIsBookingModalVisible(false)}
                disabled={isSubmittingBooking}
              >
                <Text style={styles.cancelBookingText}>Cancel</Text>
              </TouchableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Availability & Blackout Dates Modal */}
      <Modal
        visible={isAvailabilityModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAvailabilityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsAvailabilityModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Manage Availability</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  Set dates when your gear cannot be rented
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsAvailabilityModalVisible(false)}
              >
                <CloseIcon size={18} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Existing Blackout Dates List */}
              <Text style={styles.modalSectionTitle}>Current Blackout Dates</Text>
              {blackoutDates.length === 0 ? (
                <Text style={styles.noBlackoutsText}>
                  No blackout dates set. Your item is available every day.
                </Text>
              ) : (
                <View style={styles.blackoutList}>
                  {blackoutDates.map((period, index) => (
                    <View key={`period-${index}`} style={styles.blackoutItem}>
                      <View style={styles.blackoutInfo}>
                        <View style={styles.blackoutDateRow}>
                          <CalendarIcon size={14} color={theme.colors.primaryDark} />
                          <Text style={styles.blackoutDatesText}>
                            {formatDateISO(period.startDate)} — {formatDateISO(period.endDate)}
                          </Text>
                        </View>
                        {Boolean(period.reason) && (
                          <Text style={styles.blackoutReasonText}>{period.reason}</Text>
                        )}
                      </View>
                      <TouchableScale
                        style={styles.deleteBlackoutButton}
                        onPress={() => handleDeleteBlackoutPeriod(index)}
                      >
                        <TrashIcon size={16} color={theme.colors.error} />
                      </TouchableScale>
                    </View>
                  ))}
                </View>
              )}

              {/* Add New Blackout Range */}
              <Text style={styles.modalSectionTitle}>Add Blackout Range</Text>

              <View style={styles.datesContainer}>
                {/* Start Date */}
                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxLabel}>Start Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDateDisplay(newBlackoutStart)}</Text>
                  <Text style={styles.dateBoxSub}>{formatDateISO(newBlackoutStart)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableScale
                      style={styles.stepperButton}
                      onPress={() => handleAdjustBlackoutStart(-1)}
                    >
                      <Text style={styles.stepperButtonText}>-</Text>
                    </TouchableScale>
                    <TouchableScale
                      style={styles.stepperButton}
                      onPress={() => handleAdjustBlackoutStart(1)}
                    >
                      <Text style={styles.stepperButtonText}>+</Text>
                    </TouchableScale>
                  </View>
                </View>

                {/* End Date */}
                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxLabel}>End Date</Text>
                  <Text style={styles.dateBoxValue}>{formatDateDisplay(newBlackoutEnd)}</Text>
                  <Text style={styles.dateBoxSub}>{formatDateISO(newBlackoutEnd)}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableScale
                      style={styles.stepperButton}
                      onPress={() => handleAdjustBlackoutEnd(-1)}
                    >
                      <Text style={styles.stepperButtonText}>-</Text>
                    </TouchableScale>
                    <TouchableScale
                      style={styles.stepperButton}
                      onPress={() => handleAdjustBlackoutEnd(1)}
                    >
                      <Text style={styles.stepperButtonText}>+</Text>
                    </TouchableScale>
                  </View>
                </View>
              </View>

              {/* Reason Input */}
              <Text style={styles.reasonInputLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.reasonTextInput}
                placeholder="e.g. Maintenance, personal booking"
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
                value={newBlackoutReason}
                onChangeText={setNewBlackoutReason}
              />

              {/* Add Period Button */}
              <TouchableScale
                style={styles.addPeriodButton}
                onPress={handleAddBlackoutPeriod}
              >
                <PlusIcon size={16} color={theme.colors.primary} />
                <Text style={styles.addPeriodButtonText}>Add Blackout Period</Text>
              </TouchableScale>

              {Boolean(availabilityError) && (
                <View style={styles.availabilityErrorBox}>
                  <AlertIcon size={15} color={theme.colors.error} variant="triangle" />
                  <Text style={styles.availabilityErrorText}>{availabilityError}</Text>
                </View>
              )}

              {/* Save Availability Button */}
              <TouchableScale
                style={[
                  styles.saveAvailabilityButton,
                  isSavingAvailability && styles.saveAvailabilityButtonDisabled,
                ]}
                onPress={handleSaveAvailability}
                disabled={isSavingAvailability}
              >
                {isSavingAvailability ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.saveAvailabilityButtonText}>Save Availability</Text>
                )}
              </TouchableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Listing Modal */}
      <Modal
        visible={isReportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsReportModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Report Listing</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {resolvedTitle}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsReportModalVisible(false)}
              >
                <CloseIcon size={18} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>Reason for Report</Text>
              <View style={styles.reportReasonRow}>
                {(['Spam', 'Inappropriate', 'Scam/Fraud', 'Other'] as const).map((reason) => {
                  const isSelected = selectedReportReason === reason;
                  return (
                    <TouchableScale
                      key={reason}
                      style={[styles.reportReasonChip, isSelected && styles.reportReasonChipActive]}
                      onPress={() => setSelectedReportReason(reason)}
                    >
                      <Text style={[styles.reportReasonText, isSelected && styles.reportReasonTextActive]}>
                        {reason}
                      </Text>
                    </TouchableScale>
                  );
                })}
              </View>

              <Text style={styles.reasonInputLabel}>Additional Details (optional)</Text>
              <TextInput
                style={styles.reportDetailsInput}
                placeholder="Provide any details to help our safety team investigate..."
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                numberOfLines={3}
              />

              {Boolean(reportError) && (
                <View style={styles.reportErrorBanner}>
                  <AlertIcon size={15} color={theme.colors.error} variant="triangle" />
                  <Text style={styles.reportErrorText}>{reportError}</Text>
                </View>
              )}

              <TouchableScale
                style={[
                  styles.submitReportButton,
                  isSubmittingReport && styles.submitReportButtonDisabled,
                ]}
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.submitReportButtonText}>Submit Report</Text>
                )}
              </TouchableScale>

              <TouchableScale
                style={styles.cancelReportButton}
                onPress={() => setIsReportModalVisible(false)}
                disabled={isSubmittingReport}
              >
                <Text style={styles.cancelReportButtonText}>Cancel</Text>
              </TouchableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Instant Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        visible={isPaymentModalVisible}
        orderData={paymentOrderData}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentDismiss}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  navBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.badgeAsymmetric,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  navBackText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs / 2,
  },
  headerHeartButton: {
    width: theme.spacing.xl + theme.spacing.xs,
    height: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  carouselContainer: {
    marginBottom: theme.spacing.lg,
  },
  carouselSlideWrapper: {
    height: theme.spacing.xxl * 5,
    ...theme.borderRadius.cardAsymmetric,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    position: 'relative',
    ...theme.shadows.sm,
  },
  slide: {
    height: '100%',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  paginationDot: {
    height: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginHorizontal: theme.spacing.xs / 2,
  },
  paginationDotActive: {
    width: theme.spacing.md,
    backgroundColor: theme.colors.accent,
  },
  paginationDotInactive: {
    width: theme.spacing.xs,
    backgroundColor: theme.colors.border,
  },
  heroBox: {
    height: theme.spacing.xxl * 4,
    backgroundColor: theme.colors.surfaceSubtle,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    position: 'relative',
    ...theme.shadows.sm,
  },
  heroCategoryBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBadgeIcon: {
    marginRight: theme.spacing.xs / 2,
  },
  heroCategoryBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  titleSection: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs / 2,
  },
  ratingSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  ratingSummaryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs / 2,
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
  sectionHeader: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rateBox: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pricePerDay: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.primary,
  },
  priceUnit: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  depositDivider: {
    width: theme.borderWidth.thin,
    height: theme.spacing.xxl,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  depositBox: {
    alignItems: 'flex-end',
  },
  depositLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  depositValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
  },
  depositNote: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  protectionCard: {
    backgroundColor: theme.colors.primarySurface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...theme.shadows.sm,
  },
  protectionIconCircle: {
    width: theme.spacing.xl + theme.spacing.xs,
    height: theme.spacing.xl + theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  protectionInfo: {
    flex: 1,
  },
  protectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs / 2,
  },
  protectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primaryDark,
    flex: 1,
  },
  shieldBadge: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.xs,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
  },
  shieldBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primary,
  },
  protectionDescription: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: theme.spacing.xxl,
    height: theme.spacing.xxl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  ownerAvatarText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primaryDark,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs / 2,
    marginRight: theme.spacing.xs,
  },
  ratingSub: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  rentButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  rentButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
  manageAvailabilityButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.regular,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  buttonActionIcon: {
    marginRight: theme.spacing.xs,
  },
  manageAvailabilityButtonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
  reportListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  reportListingButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    marginLeft: theme.spacing.xs / 2,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    ...theme.borderRadius.buttonAsymmetric,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    marginLeft: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.textPrimary,
    opacity: theme.opacity.disabled,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    maxHeight: '88%',
    ...theme.shadows.lg,
  },
  modalScroll: {
    paddingBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  modalHeaderTitleBox: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.heading,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  dateBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs / 2,
  },
  dateBoxLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  dateBoxValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  dateBoxSub: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  calendarPickerContainer: {
    marginBottom: theme.spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperButton: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.md,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  presetChip: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.xs / 2,
    ...theme.borderRadius.badgeAsymmetric,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentDark,
  },
  presetChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  presetChipTextActive: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
  damageToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  damageToggleCardActive: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  checkbox: {
    width: theme.spacing.lg,
    height: theme.spacing.lg,
    borderRadius: theme.borderRadius.xs,
    borderWidth: theme.borderWidth.regular,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  damageToggleInfo: {
    flex: 1,
  },
  damageToggleTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  damageToggleDesc: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  pricingBreakdownCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  breakdownHeaderTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.xs / 2,
  },
  breakdownLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  breakdownValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  breakdownDivider: {
    height: theme.borderWidth.thin,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  breakdownTotalLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  breakdownTotalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
  },
  bookingErrorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingErrorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
  },
  confirmBookingButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  confirmBookingButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  confirmBookingText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
  cancelBookingButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  cancelBookingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
  },
  noBlackoutsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  blackoutList: {
    marginBottom: theme.spacing.md,
  },
  blackoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...theme.borderRadius.cardAsymmetric,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  blackoutInfo: {
    flex: 1,
  },
  blackoutDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blackoutDatesText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.xs / 2,
  },
  blackoutReasonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  deleteBlackoutButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  reasonInputLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  reasonTextInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  addPeriodButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  addPeriodButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    marginLeft: theme.spacing.xs / 2,
  },
  availabilityErrorBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityErrorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  saveAvailabilityButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  saveAvailabilityButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  saveAvailabilityButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
  reportReasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
    marginHorizontal: -theme.spacing.xs / 2,
  },
  reportReasonChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.badgeAsymmetric,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs / 2,
    marginBottom: theme.spacing.xs,
  },
  reportReasonChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentDark,
  },
  reportReasonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  reportReasonTextActive: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
  reportDetailsInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    minHeight: theme.spacing.xxl * 1.5,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  reportErrorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportErrorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  submitReportButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  submitReportButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  submitReportButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
  },
  cancelReportButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  cancelReportButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
  },
});

export default ProductDetailScreen;

