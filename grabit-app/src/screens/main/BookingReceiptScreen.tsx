import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import theme from '../../theme';
import { AppStackParamList } from '../../navigation/types';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  CheckIcon,
  CalendarIcon,
  CopyIcon,
  ShieldIcon,
  BoxIcon,
  CameraIcon,
  DroneIcon,
  PowerToolIcon,
  SpeakerIcon,
  LaptopIcon,
  UserIcon,
} from '../../components/icons';

type BookingReceiptScreenRouteProp = RouteProp<AppStackParamList, 'BookingReceipt'>;

const renderCategoryIcon = (category?: string, size = 14, color = theme.colors.textSecondary) => {
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

const formatDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const formatShortDateRange = (startDateStr: string, endDateStr: string): string => {
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sFormatted = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eFormatted = e.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${sFormatted} - ${eFormatted}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
};

const formatDateTime = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

export const BookingReceiptScreen: React.FC = () => {
  const route = useRoute<BookingReceiptScreenRouteProp>();
  const navigation = useNavigation<any>();

  const {
    bookingId,
    product,
    totalDays,
    pricing,
    startDate,
    endDate,
    paymentMethod,
    paidAt,
    transactionId,
    booking,
  } = route.params;

  const [copiedReference, setCopiedReference] = useState<boolean>(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  // Pulse animation for success checkmark icon
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.25,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim, pulseOpacity]);

  const imageUrl = resolveImageUrl(product?.images?.[0]);

  const ownerName =
    (typeof product?.owner === 'object' && (product.owner?.displayName || product.owner?.name)) ||
    (typeof booking?.owner === 'object' && (booking.owner?.displayName || booking.owner?.name)) ||
    'Verified Owner';

  const bookingRefId = bookingId ? `GRB-${bookingId.substring(Math.max(0, bookingId.length - 8)).toUpperCase()}` : 'GRB-RENTAL';

  const handleCopyId = () => {
    // Attempt web clipboard copy if available
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(bookingId || bookingRefId);
      }
    } catch {
      // Ignore clipboard write failures on non-web environments
    }

    setCopiedReference(true);
    setTimeout(() => {
      setCopiedReference(false);
    }, 2500);
  };

  const handleGoToBookings = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: { screen: 'Bookings' },
        },
      ],
    });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: { screen: 'Home' },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Pulse Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.pulseContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.checkmarkCircle}>
              <CheckIcon size={34} color={theme.colors.surface} strokeWidth={3} />
            </View>
          </View>

          <Text style={styles.successTitle}>Booking Confirmed & Paid!</Text>
          <Text style={styles.successSubtitle}>
            Your rental reservation has been confirmed and payment has been secured.
          </Text>
        </View>

        {/* Highlighted Pickup Notice Card */}
        <View style={styles.pickupNoticeCard}>
          <View style={styles.pickupIconContainer}>
            <CalendarIcon size={20} color={theme.colors.primaryDark} />
          </View>
          <View style={styles.pickupNoticeTextContainer}>
            <Text style={styles.pickupNoticeLabel}>Pickup Starts</Text>
            <Text style={styles.pickupNoticeDate}>
              Your rental starts on {formatDate(startDate)}
            </Text>
            <Text style={styles.pickupNoticeSubtext}>
              Coordinate pickup time and handoff location with the owner via chat.
            </Text>
          </View>
        </View>

        {/* Product Details Card */}
        <View style={styles.card}>
          <View style={styles.productRow}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productThumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.productThumbnailFallback}>
                {renderCategoryIcon(product?.category, 28, theme.colors.primaryLight)}
              </View>
            )}

            <View style={styles.productInfo}>
              <View style={styles.categoryBadge}>
                {renderCategoryIcon(product?.category, 11, theme.colors.primaryDark)}
                <Text style={styles.categoryBadgeText}>{product?.category || 'Item'}</Text>
              </View>

              <Text style={styles.productTitle} numberOfLines={2}>
                {product?.title || 'Grabit Rental Item'}
              </Text>

              <View style={styles.ownerRow}>
                <UserIcon size={12} color={theme.colors.textSecondary} />
                <Text style={styles.ownerText}>Owner: {ownerName}</Text>
              </View>

              <View style={styles.durationRow}>
                <CalendarIcon size={12} color={theme.colors.textSecondary} />
                <Text style={styles.durationText}>
                  {formatShortDateRange(startDate, endDate)} ({totalDays} day{totalDays > 1 ? 's' : ''})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Itemized Receipt Card */}
        <View style={styles.card}>
          <View style={styles.receiptHeaderRow}>
            <Text style={styles.cardSectionTitle}>Payment Receipt</Text>
            <View style={styles.paidBadge}>
              <CheckIcon size={11} color={theme.colors.success} />
              <Text style={styles.paidBadgeText}>Paid</Text>
            </View>
          </View>

          {/* Line items */}
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>
              Rental Fee ({totalDays} day{totalDays > 1 ? 's' : ''})
            </Text>
            <Text style={styles.receiptValue}>
              ₹{(pricing?.rentalFee ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Platform Service Fee</Text>
            <Text style={styles.receiptValue}>
              ₹{(pricing?.platformFee ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Security Deposit (Refundable)</Text>
            <Text style={styles.receiptValue}>
              ₹{(pricing?.securityDeposit ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {(pricing?.damageProtectionFee ?? 0) > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Damage Protection Fee</Text>
              <Text style={styles.receiptValue}>
                ₹{(pricing?.damageProtectionFee ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Total Paid Row */}
          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>Total Paid</Text>
            <Text style={styles.receiptTotalValue}>
              ₹{(pricing?.totalAmount ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Metadata details */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment Method</Text>
            <Text style={styles.metaValue}>
              {paymentMethod === 'wallet' ? 'Grabit Wallet' : 'Razorpay (Cards/UPI)'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date & Time</Text>
            <Text style={styles.metaValue}>{formatDateTime(paidAt || new Date())}</Text>
          </View>

          {transactionId && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Transaction ID</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {transactionId}
              </Text>
            </View>
          )}
        </View>

        {/* Copyable Reference ID Card */}
        <View style={styles.card}>
          <Text style={styles.referenceLabel}>Booking Reference ID</Text>
          <View style={styles.referenceChipRow}>
            <View style={styles.referenceChip}>
              <Text style={styles.referenceChipText} numberOfLines={1}>
                {bookingId || bookingRefId}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.copyButton,
                copiedReference && styles.copyButtonSuccess,
              ]}
              onPress={handleCopyId}
              activeOpacity={theme.opacity.active}
              accessibilityRole="button"
              accessibilityLabel="Copy reference ID"
            >
              {copiedReference ? (
                <>
                  <CheckIcon size={14} color={theme.colors.surface} />
                  <Text style={styles.copyButtonTextSuccess}>Copied!</Text>
                </>
              ) : (
                <>
                  <CopyIcon size={14} color={theme.colors.primaryDark} />
                  <Text style={styles.copyButtonText}>Copy ID</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Escrow Guarantee Footer Note */}
        <View style={styles.guaranteeRow}>
          <ShieldIcon size={16} color={theme.colors.textSecondary} />
          <Text style={styles.guaranteeText}>
            Protected by Grabit Escrow &amp; Return Guarantee. Refundable deposits are returned upon
            safe item return.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGoToBookings}
          activeOpacity={theme.opacity.active}
          accessibilityRole="button"
          accessibilityLabel="View in My Bookings"
        >
          <Text style={styles.primaryButtonText}>View in My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGoHome}
          activeOpacity={theme.opacity.active}
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  pulseContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
  },
  checkmarkCircle: {
    width: 62,
    height: 62,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadows.md.shadowColor,
    shadowOffset: theme.shadows.md.shadowOffset,
    shadowOpacity: theme.shadows.md.shadowOpacity,
    shadowRadius: theme.shadows.md.shadowRadius,
    elevation: theme.shadows.md.elevation,
  },
  successTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  successSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  pickupNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
  },
  pickupIconContainer: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  pickupNoticeTextContainer: {
    flex: 1,
  },
  pickupNoticeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pickupNoticeDate: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.xs / 2,
  },
  pickupNoticeSubtext: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    shadowColor: theme.shadows.sm.shadowColor,
    shadowOffset: theme.shadows.sm.shadowOffset,
    shadowOpacity: theme.shadows.sm.shadowOpacity,
    shadowRadius: theme.shadows.sm.shadowRadius,
    elevation: theme.shadows.sm.elevation,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productThumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productThumbnailFallback: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs / 2,
    gap: theme.spacing.xs / 2,
  },
  categoryBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  productTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
    marginBottom: theme.spacing.xs / 2,
  },
  ownerText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  durationText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
    gap: theme.spacing.xs / 2,
  },
  paidBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.success,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  receiptLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  receiptValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  divider: {
    height: theme.borderWidth.thin,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.md,
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptTotalLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  receiptTotalValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  referenceLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  referenceChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  referenceChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  referenceChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.mono,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
    gap: theme.spacing.xs,
  },
  copyButtonSuccess: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  copyButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  copyButtonTextSuccess: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.surface,
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  guaranteeText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  bottomBar: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
    shadowColor: theme.shadows.lg.shadowColor,
    shadowOffset: theme.shadows.lg.shadowOffset,
    shadowOpacity: theme.shadows.lg.shadowOpacity,
    shadowRadius: theme.shadows.lg.shadowRadius,
    elevation: theme.shadows.lg.elevation,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.surface,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
});

export default BookingReceiptScreen;
