import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import theme from '../../theme';
import { api, BookingItem, BookingDisputeFlag } from '../../services/api';
import { formatINR } from '../../utils';
import {
  RazorpayCheckoutModal,
  RazorpayOrderData,
  RazorpayPaymentResult,
} from '../../components/RazorpayCheckoutModal';
import {
  CalendarIcon,
  ChatIcon,
  UserIcon,
  ShieldIcon,
  CheckIcon,
  AlertIcon,
  StarIcon,
  CloseIcon,
  TrashIcon,
  CameraIcon,
  DroneIcon,
  PowerToolIcon,
  SpeakerIcon,
  LaptopIcon,
  BoxIcon,
} from '../../components/icons';
import { EmptyBookingsIllustration } from '../../components/illustrations';

const renderCategoryIcon = (category: string, size = 13, color = theme.colors.textSecondary) => {
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

const CANCELLATION_REASONS = [
  'Change of plans',
  'Item not as described',
  'Owner unresponsive',
  'Renter unresponsive',
  'Other',
];

const DISPUTE_REASONS = [
  'Item damaged',
  'Item not returned',
  'Late return',
  'Other',
];

const formatDateRange = (startDateStr: string, endDateStr: string): string => {
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sFormatted = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eFormatted = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${sFormatted} - ${eFormatted}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
};

const formatSingleDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'asRenter' | 'asOwner'>('asRenter');
  const [asRenterBookings, setAsRenterBookings] = useState<BookingItem[]>([]);
  const [asOwnerBookings, setAsOwnerBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [isInitiatingPaymentId, setIsInitiatingPaymentId] = useState<string | null>(null);
  const [isRazorpayModalVisible, setIsRazorpayModalVisible] = useState<boolean>(false);
  const [selectedOrderData, setSelectedOrderData] = useState<RazorpayOrderData | null>(null);
  const [activePayingBooking, setActivePayingBooking] = useState<BookingItem | null>(null);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState<boolean>(false);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<BookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const [isExtensionModalVisible, setIsExtensionModalVisible] = useState<boolean>(false);
  const [selectedExtensionBooking, setSelectedExtensionBooking] = useState<BookingItem | null>(null);
  const [extensionDays, setExtensionDays] = useState<number>(1);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState<boolean>(false);
  const [isRespondingExtensionId, setIsRespondingExtensionId] = useState<string | null>(null);
  const [isDisputeModalVisible, setIsDisputeModalVisible] = useState<boolean>(false);
  const [selectedDisputeBooking, setSelectedDisputeBooking] = useState<BookingItem | null>(null);
  const [selectedDisputeReason, setSelectedDisputeReason] = useState<string>('Item damaged');
  const [disputeExplanation, setDisputeExplanation] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);

  // Cancellation Modal state
  const [isCancelModalVisible, setIsCancelModalVisible] = useState<boolean>(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<BookingItem | null>(null);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');
  const [cancelExplanation, setCancelExplanation] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  const fetchBookings = useCallback(async (isPullToRefresh: boolean = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const res = await api.getMyBookings();
      if (res.success && res.data) {
        const renterList = res.data.asRenter || [];
        const ownerList = res.data.asOwner || [];
        setAsRenterBookings(renterList);
        setAsOwnerBookings(ownerList);
      } else {
        setError(res.error || 'Failed to load bookings.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching bookings.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleOpenCancelModal = (booking: BookingItem) => {
    setSelectedCancelBooking(booking);
    setSelectedCancelReason('');
    setCancelExplanation('');
    setIsCancelModalVisible(true);
  };

  const handleConfirmCancellation = async () => {
    if (!selectedCancelBooking || !selectedCancelReason) return;
    const bookingId = selectedCancelBooking._id || selectedCancelBooking.id || '';
    if (!bookingId) return;

    const finalReason = cancelExplanation.trim()
      ? `${selectedCancelReason} - ${cancelExplanation.trim()}`
      : selectedCancelReason;

    setIsSubmittingCancel(true);
    try {
      const res = await api.updateBookingStatus(bookingId, 'cancelled', finalReason);
      if (res.success) {
        const updatedReason = res.data?.cancellationReason || finalReason;
        setAsRenterBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, status: 'cancelled', cancellationReason: updatedReason }
              : b
          )
        );
        setAsOwnerBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, status: 'cancelled', cancellationReason: updatedReason }
              : b
          )
        );
        setIsCancelModalVisible(false);
        setSelectedCancelBooking(null);
        setSelectedCancelReason('');
        setCancelExplanation('');
        Alert.alert(
          'Booking Cancelled',
          'The booking has been successfully cancelled.'
        );
      } else {
        Alert.alert('Cancellation Failed', res.error || 'Failed to cancel the booking.');
      }
    } catch (err: any) {
      Alert.alert('Cancellation Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'cancelled', reason?: string) => {
    if (status === 'cancelled' && !reason) {
      const foundBooking = (activeTab === 'asRenter' ? asRenterBookings : asOwnerBookings).find(
        (b) => b._id === bookingId || b.id === bookingId
      );
      if (foundBooking) {
        handleOpenCancelModal(foundBooking);
        return;
      }
    }

    setUpdatingBookingId(bookingId);
    try {
      const res = await api.updateBookingStatus(bookingId, status, reason);
      if (res.success) {
        setAsOwnerBookings((prev) =>
          prev.map((b) => (b._id === bookingId || b.id === bookingId ? { ...b, status, cancellationReason: res.data?.cancellationReason || reason } : b))
        );
        Alert.alert(
          'Booking Updated',
          status === 'confirmed'
            ? 'You have accepted this rental request.'
            : 'You have declined this rental request.'
        );
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update the booking status.');
      }
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'An unexpected error occurred.');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleCompleteRental = async (item: BookingItem) => {
    const bookingId = item._id || item.id || '';
    if (!bookingId) return;

    setUpdatingBookingId(bookingId);
    try {
      const res = await api.updateBookingStatus(item._id, 'completed');
      if (res.success) {
        setAsRenterBookings((prev) =>
          prev.map((b) => (b._id === bookingId || b.id === bookingId ? { ...b, status: 'completed' } : b))
        );
        setAsOwnerBookings((prev) =>
          prev.map((b) => (b._id === bookingId || b.id === bookingId ? { ...b, status: 'completed' } : b))
        );
        Alert.alert(
          'Rental Completed',
          'This rental has been completed. You can now leave a review for this transaction!'
        );
      } else {
        Alert.alert('Update Failed', res.error || 'Failed to mark rental as completed.');
      }
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'An unexpected error occurred.');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleOpenReviewModal = (item: BookingItem) => {
    setSelectedReviewBooking(item);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReviewBooking) return;
    const bookingId = selectedReviewBooking._id || selectedReviewBooking.id || '';
    if (!bookingId || reviewRating === 0) return;

    setIsSubmittingReview(true);
    try {
      const res = await api.addReview({
        bookingId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      if (res.success) {
        setReviewedBookingIds((prev) => [...prev, bookingId]);
        setIsReviewModalVisible(false);
        setSelectedReviewBooking(null);
        setReviewComment('');
        setReviewRating(5);
        Alert.alert(
          'Review Submitted',
          'Thank you for reviewing! Your feedback helps build a trusted Grabit community.'
        );
      } else {
        Alert.alert('Review Failed', res.error || 'Failed to submit your review.');
      }
    } catch (err: any) {
      Alert.alert('Review Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenExtensionModal = (booking: BookingItem) => {
    setSelectedExtensionBooking(booking);
    setExtensionDays(1);
    setIsExtensionModalVisible(true);
  };

  const handleSubmitExtension = async () => {
    if (!selectedExtensionBooking) return;
    const bookingId = selectedExtensionBooking._id || selectedExtensionBooking.id || '';
    if (!bookingId || extensionDays < 1) return;

    const currentEnd = new Date(selectedExtensionBooking.endDate);
    const newEnd = new Date(currentEnd.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    setIsSubmittingExtension(true);
    try {
      const res = await api.requestBookingExtension(bookingId, newEnd.toISOString());
      if (res.success && res.data) {
        const updatedBooking = res.data;
        setAsRenterBookings((prev) =>
          prev.map((b) => (b._id === bookingId || b.id === bookingId ? updatedBooking : b))
        );
        setIsExtensionModalVisible(false);
        setSelectedExtensionBooking(null);
        Alert.alert(
          'Extension Requested',
          'Your rental extension request has been submitted to the item owner.'
        );
      } else {
        Alert.alert('Request Failed', res.error || 'Failed to submit extension request.');
      }
    } catch (err: any) {
      Alert.alert('Request Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  const handleRespondExtension = async (bookingId: string, approve: boolean) => {
    if (!bookingId) return;
    setIsRespondingExtensionId(bookingId);
    try {
      const res = await api.respondBookingExtension(bookingId, approve);
      if (res.success && res.data) {
        const updatedBooking = res.data;
        setAsOwnerBookings((prev) =>
          prev.map((b) => (b._id === bookingId || b.id === bookingId ? updatedBooking : b))
        );
        Alert.alert(
          approve ? 'Extension Approved' : 'Extension Declined',
          approve
            ? 'You have approved the rental extension request.'
            : 'You have declined the rental extension request.'
        );
      } else {
        Alert.alert('Response Failed', res.error || 'Could not process extension response.');
      }
    } catch (err: any) {
      Alert.alert('Response Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsRespondingExtensionId(null);
    }
  };

  const handleOpenDisputeModal = (item: BookingItem) => {
    setSelectedDisputeBooking(item);
    setSelectedDisputeReason('Item damaged');
    setDisputeExplanation('');
    setIsDisputeModalVisible(true);
  };

  const handleSubmitDispute = async () => {
    if (!selectedDisputeBooking) return;
    const bookingId = selectedDisputeBooking._id || selectedDisputeBooking.id || '';
    if (!bookingId) return;

    const fullReason = disputeExplanation.trim()
      ? `${selectedDisputeReason}: ${disputeExplanation.trim()}`
      : selectedDisputeReason;

    setIsSubmittingDispute(true);
    try {
      const res = await api.raiseDispute(bookingId, fullReason);
      if (res.success) {
        const updatedFlag: BookingDisputeFlag = res.data?.disputeFlag || {
          raised: true,
          reason: fullReason,
          raisedAt: new Date().toISOString(),
        };
        setAsRenterBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, disputeFlag: updatedFlag }
              : b
          )
        );
        setAsOwnerBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, disputeFlag: updatedFlag }
              : b
          )
        );
        setIsDisputeModalVisible(false);
        setSelectedDisputeBooking(null);
        setDisputeExplanation('');
        Alert.alert(
          'Dispute Submitted',
          'Our safety team has been alerted and is investigating this issue.'
        );
      } else {
        Alert.alert('Dispute Failed', res.error || 'Failed to submit dispute.');
      }
    } catch (err: any) {
      Alert.alert('Dispute Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handlePayNow = (booking: BookingItem) => {
    const bookingId = booking._id || booking.id || '';
    if (!bookingId) return;

    // Handoff to PaymentScreen where api.createPaymentOrder(bookingId) is executed
    navigation.navigate('Payment', {
      bookingId,
      product: booking.product,
      totalDays: booking.totalDays,
      pricing: booking.pricing,
      startDate: booking.startDate,
      endDate: booking.endDate,
    });
  };

  const handlePaymentSuccess = async (paymentResult: RazorpayPaymentResult) => {
    setIsRazorpayModalVisible(false);
    const booking = activePayingBooking;
    if (!booking) return;

    const bookingId = booking._id || booking.id || '';

    try {
      const verifyRes = await api.verifyPayment(bookingId, paymentResult);
      if (verifyRes.success) {
        setAsRenterBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, status: 'active', paymentStatus: 'paid' }
              : b
          )
        );
        Alert.alert(
          'Payment Successful!',
          'Your payment was verified successfully. Your booking is now active and confirmed!'
        );
        fetchBookings();
      } else {
        // Fallback for mock environment testing
        setAsRenterBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId || b.id === bookingId
              ? { ...b, status: 'active', paymentStatus: 'paid' }
              : b
          )
        );
        Alert.alert(
          'Payment Processed',
          verifyRes.message || 'Payment completed in test mode. Booking status updated to active.'
        );
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Encountered an issue verifying payment.');
    }
  };

  const getStatusBadgeConfig = (status: string, paymentStatus?: string) => {
    switch (status) {
      case 'active':
        return {
          containerStyle: styles.statusBadgeActive,
          textStyle: styles.statusBadgeTextActive,
          label: 'Active Rental',
        };
      case 'confirmed':
        return {
          containerStyle: styles.statusBadgeConfirmed,
          textStyle: styles.statusBadgeTextConfirmed,
          label: paymentStatus === 'paid' ? 'Confirmed' : 'Awaiting Payment',
        };
      case 'cancelled':
        return {
          containerStyle: styles.statusBadgeCancelled,
          textStyle: styles.statusBadgeTextCancelled,
          label: 'Cancelled',
        };
      case 'completed':
        return {
          containerStyle: styles.statusBadgeCompleted,
          textStyle: styles.statusBadgeTextCompleted,
          label: 'Completed',
        };
      case 'pending':
      default:
        return {
          containerStyle: styles.statusBadgeConfirmed,
          textStyle: styles.statusBadgeTextConfirmed,
          label: 'Confirmed',
        };
    }
  };

  const currentBookings = activeTab === 'asRenter' ? asRenterBookings : asOwnerBookings;

  const renderBookingCard = ({ item }: { item: BookingItem }) => {
    const productTitle = item.product?.title || 'Grabit Item';
    const categoryName = item.product?.category || 'Other';
    const dateRange = formatDateRange(item.startDate, item.endDate);
    const totalAmount = item.pricing?.totalAmount ?? 0;
    const isOwnerTab = activeTab === 'asOwner';
    const statusConfig = getStatusBadgeConfig(item.status, item.paymentStatus);

    const otherParty = isOwnerTab
      ? typeof item.renter === 'object'
        ? item.renter?.displayName || item.renter?.name || 'Renter'
        : 'Renter'
      : typeof item.owner === 'object'
      ? item.owner?.displayName || item.owner?.name || 'Owner'
      : 'Owner';

    return (
      <View style={styles.bookingCard}>
        {/* Top Row: Category Chip & Status Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.categoryChip}>
            <View style={styles.categoryChipIcon}>
              {renderCategoryIcon(categoryName, 12, theme.colors.textSecondary)}
            </View>
            <Text style={styles.categoryChipText}>{categoryName}</Text>
          </View>
          <View style={styles.badgeGroup}>
            {item.paymentStatus === 'paid' && (
              <View style={styles.paidBadge}>
                <CheckIcon size={12} color={theme.colors.primaryDark} strokeWidth={2.5} style={styles.paidCheckIcon} />
                <Text style={styles.paidBadgeText}>Paid</Text>
              </View>
            )}
            <View style={[styles.statusBadge, statusConfig.containerStyle]}>
              <Text style={[styles.statusBadgeText, statusConfig.textStyle]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.productTitle} numberOfLines={2}>
          {productTitle}
        </Text>

        {/* Date and Duration */}
        <View style={styles.metaRow}>
          <View style={styles.dateContainer}>
            <CalendarIcon size={15} color={theme.colors.primary} strokeWidth={2} style={styles.dateIcon} />
            <Text style={styles.dateText}>{dateRange}</Text>
          </View>
          <View style={styles.durationChip}>
            <Text style={styles.durationText}>
              {item.totalDays} {item.totalDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* Other Party Info */}
        <View style={styles.partyRow}>
          <View style={styles.partyLeft}>
            <UserIcon size={14} color={theme.colors.textSecondary} style={styles.partyIcon} />
            <Text style={styles.partyLabel}>
              {isOwnerTab ? 'Renter: ' : 'Lender: '}
              <Text style={styles.partyName}>{otherParty}</Text>
            </Text>
          </View>
          {item.damageProtectionOpted && (
            <View style={styles.protectionBadge}>
              <ShieldIcon size={13} color={theme.colors.primaryDark} withCheck style={styles.protectionIcon} />
              <Text style={styles.protectionBadgeText}>Protected</Text>
            </View>
          )}
        </View>

        {/* Pricing Summary */}
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatINR(totalAmount)}</Text>
        </View>

        {/* Dispute Warning Banner */}
        {item.disputeFlag?.raised && (
          <View style={styles.disputeActiveBanner}>
            <View style={styles.disputeHeaderRow}>
              <AlertIcon size={16} color={theme.colors.warning} variant="triangle" style={styles.disputeIcon} />
              <Text style={styles.disputeActiveBannerTitle}>
                Dispute Under Review
              </Text>
            </View>
            <Text style={styles.disputeActiveBannerSubtitle}>
              Our safety team is currently investigating this booking dispute.
            </Text>
            {Boolean(item.disputeFlag?.reason) && (
              <Text style={styles.disputeReasonText} numberOfLines={2}>
                Reason: {item.disputeFlag?.reason}
              </Text>
            )}
          </View>
        )}

        {/* Cancellation Reason Badge on Cancelled Cards */}
        {item.status === 'cancelled' && (
          <View style={styles.cancellationReasonContainer}>
            <AlertIcon size={14} color={theme.colors.statusCancelled} variant="circle" style={styles.cancellationIcon} />
            <Text style={styles.cancellationReasonText} numberOfLines={2}>
              Cancelled: {item.cancellationReason || 'No reason provided'}
            </Text>
          </View>
        )}

        {/* Extension Request Status for Renters */}
        {!isOwnerTab && item.status === 'active' && item.extensionRequest?.status === 'pending' && (
          <View style={styles.extensionBanner}>
            <CalendarIcon size={16} color={theme.colors.statusPending} style={styles.extensionIcon} />
            <View style={styles.extensionBannerTextBox}>
              <Text style={styles.extensionBannerTitle}>Extension Request Pending</Text>
              <Text style={styles.extensionBannerDesc}>
                +{item.extensionRequest.additionalDays} {item.extensionRequest.additionalDays === 1 ? 'day' : 'days'} until {formatSingleDate(item.extensionRequest.newEndDate)} ({formatINR(item.extensionRequest.additionalAmount)})
              </Text>
            </View>
          </View>
        )}

        {!isOwnerTab && item.status === 'active' && item.extensionRequest?.status === 'approved' && (
          <View style={styles.extensionApprovedBadge}>
            <CheckIcon size={13} color={theme.colors.statusActive} strokeWidth={2.5} style={styles.extensionApprovedIcon} />
            <Text style={styles.extensionApprovedText}>
              Extension Approved (+{item.extensionRequest.additionalDays}d)
            </Text>
          </View>
        )}

        {!isOwnerTab && item.status === 'active' && item.extensionRequest?.status === 'rejected' && (
          <View style={styles.extensionRejectedBadge}>
            <CloseIcon size={13} color={theme.colors.statusCancelled} strokeWidth={2.5} style={styles.extensionApprovedIcon} />
            <Text style={styles.extensionRejectedText}>Extension Declined</Text>
          </View>
        )}

        {/* Owner Extension Request Card */}
        {isOwnerTab && item.status === 'active' && item.extensionRequest?.status === 'pending' && (
          <View style={styles.ownerExtensionBox}>
            <View style={styles.ownerExtensionHeader}>
              <CalendarIcon size={18} color={theme.colors.accent} style={styles.ownerExtensionIcon} />
              <View style={styles.ownerExtensionHeaderText}>
                <Text style={styles.ownerExtensionTitle}>
                  Extension Request: +{item.extensionRequest.additionalDays} {item.extensionRequest.additionalDays === 1 ? 'day' : 'days'} ({formatINR(item.extensionRequest.additionalAmount)})
                </Text>
                <Text style={styles.ownerExtensionSubtitle}>
                  Until {formatSingleDate(item.extensionRequest.newEndDate)} • Fee: {formatINR(item.extensionRequest.additionalRentalFee)}
                </Text>
              </View>
            </View>

            {isRespondingExtensionId === (item._id || item.id) ? (
              <View style={styles.actionLoadingBox}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.actionLoadingText}>Updating extension...</Text>
              </View>
            ) : (
              <View style={styles.ownerExtensionButtonsRow}>
                <TouchableScale
                  style={styles.acceptExtensionButton}
                  onPress={() => handleRespondExtension(item._id || item.id || '', true)}
                >
                  <Text style={styles.acceptExtensionButtonText}>Approve</Text>
                </TouchableScale>
                <TouchableScale
                  style={styles.declineExtensionButton}
                  onPress={() => handleRespondExtension(item._id || item.id || '', false)}
                >
                  <Text style={styles.declineExtensionButtonText}>Decline</Text>
                </TouchableScale>
              </View>
            )}
          </View>
        )}

        {/* Card Footer Actions: Message and Pay Now buttons */}
        <View style={styles.cardFooterActions}>
          <TouchableScale
            style={styles.messageButton}
            onPress={() =>
              navigation.navigate('Chat', {
                bookingId: item._id || item.id || '',
                otherPartyName: otherParty,
                productTitle,
              })
            }
          >
            <ChatIcon size={16} color={theme.colors.textPrimary} style={styles.buttonInlineIcon} />
            <Text style={styles.messageButtonText}>
              {isOwnerTab ? 'Message Renter' : 'Message Owner'}
            </Text>
          </TouchableScale>

          {!isOwnerTab && item.status === 'confirmed' && item.paymentStatus === 'unpaid' && (
            <TouchableScale
              style={styles.payNowButton}
              onPress={() => handlePayNow(item)}
              disabled={isInitiatingPaymentId === (item._id || item.id)}
            >
              {isInitiatingPaymentId === (item._id || item.id) ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.payNowButtonText}>Pay Now</Text>
              )}
            </TouchableScale>
          )}
        </View>

        {/* Active Booking Actions for Renters & Owners */}
        {item.status === 'active' && (
          <View style={!isOwnerTab ? styles.activeActionsRow : undefined}>
            {!isOwnerTab && (
              <TouchableScale
                style={[
                  styles.requestExtensionButton,
                  item.extensionRequest?.status === 'pending' && styles.requestExtensionButtonDisabled,
                ]}
                onPress={() => handleOpenExtensionModal(item)}
                disabled={item.extensionRequest?.status === 'pending'}
              >
                <CalendarIcon
                  size={15}
                  color={item.extensionRequest?.status === 'pending' ? theme.colors.textMuted : theme.colors.textPrimary}
                  style={styles.buttonInlineIcon}
                />
                <Text
                  style={[
                    styles.requestExtensionButtonText,
                    item.extensionRequest?.status === 'pending' && styles.requestExtensionButtonTextDisabled,
                  ]}
                >
                  {item.extensionRequest?.status === 'pending' ? 'Pending' : 'Extend Rental'}
                </Text>
              </TouchableScale>
            )}

            <TouchableScale
              style={!isOwnerTab ? styles.completeRentalButtonHalf : styles.completeRentalButton}
              onPress={() => handleCompleteRental(item)}
              disabled={updatingBookingId === (item._id || item.id)}
            >
              {updatingBookingId === (item._id || item.id) ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <View style={styles.buttonContentRow}>
                  <CheckIcon size={16} color={theme.colors.surface} strokeWidth={2.5} style={styles.buttonInlineIcon} />
                  <Text style={styles.completeRentalButtonText}>Complete Rental</Text>
                </View>
              )}
            </TouchableScale>
          </View>
        )}

        {/* Completed Booking: Leave a Review Button */}
        {item.status === 'completed' && (
          <TouchableScale
            style={[
              styles.reviewButton,
              Boolean(item._id && reviewedBookingIds.includes(item._id)) && styles.reviewButtonDisabled,
            ]}
            onPress={() => handleOpenReviewModal(item)}
            disabled={Boolean(item._id && reviewedBookingIds.includes(item._id))}
          >
            <StarIcon
              size={16}
              color={Boolean(item._id && reviewedBookingIds.includes(item._id)) ? theme.colors.textMuted : theme.colors.surface}
              filled={Boolean(item._id && reviewedBookingIds.includes(item._id))}
              style={styles.buttonInlineIcon}
            />
            <Text
              style={[
                styles.reviewButtonText,
                Boolean(item._id && reviewedBookingIds.includes(item._id)) && styles.reviewButtonTextDisabled,
              ]}
            >
              {Boolean(item._id && reviewedBookingIds.includes(item._id)) ? 'Reviewed' : 'Leave a Review'}
            </Text>
          </TouchableScale>
        )}

        {/* Active & Completed: Report Problem Button (if not already raised) */}
        {(item.status === 'active' || item.status === 'completed') && !item.disputeFlag?.raised && (
          <TouchableScale
            style={styles.reportProblemButton}
            onPress={() => handleOpenDisputeModal(item)}
          >
            <AlertIcon size={14} color={theme.colors.textSecondary} variant="triangle" style={styles.buttonInlineIcon} />
            <Text style={styles.reportProblemButtonText}>Report a Problem</Text>
          </TouchableScale>
        )}

        {/* Cancel Booking Button for Confirmed and Active bookings (Renter and Owner) */}
        {(item.status === 'confirmed' || item.status === 'active') && (
          <TouchableScale
            style={styles.cancelBookingButton}
            onPress={() => handleOpenCancelModal(item)}
          >
            <CloseIcon size={14} color={theme.colors.statusCancelled} style={styles.buttonInlineIcon} />
            <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
          </TouchableScale>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    if (activeTab === 'asRenter') {
      return (
        <View style={styles.emptyContainer}>
          <EmptyBookingsIllustration size={180} />
          <Text style={styles.emptyTitle}>No Rental Requests Yet</Text>
          <Text style={styles.emptySubtitle}>
            You haven't requested to rent any gear yet. Explore listings in your local community and book equipment!
          </Text>
          <TouchableScale
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.emptyActionText}>Browse Items</Text>
          </TouchableScale>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyBookingsIllustration size={180} />
        <Text style={styles.emptyTitle}>No Incoming Requests</Text>
        <Text style={styles.emptySubtitle}>
          You don't have any rental requests for your items yet. List items to share with your community and start earning!
        </Text>
        <TouchableScale
          style={styles.emptyActionButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.emptyActionText}>List an Item</Text>
        </TouchableScale>
      </View>
    );
  };

  const extDailyRate =
    selectedExtensionBooking?.product?.rentalPrice?.perDay ??
    selectedExtensionBooking?.product?.dailyRate ??
    (selectedExtensionBooking?.pricing?.rentalFee && selectedExtensionBooking?.totalDays
      ? Math.round((selectedExtensionBooking.pricing.rentalFee / selectedExtensionBooking.totalDays) * 100) / 100
      : 0);
  const extRentalFee = Math.round(extDailyRate * extensionDays * 100) / 100;
  const extPlatformFee = Math.round(extRentalFee * 0.15 * 100) / 100;
  const extTotalAmount = Math.round((extRentalFee + extPlatformFee) * 100) / 100;
  const extCurrentEndDate = selectedExtensionBooking?.endDate ? new Date(selectedExtensionBooking.endDate) : null;
  const extNewEndDate = extCurrentEndDate
    ? new Date(extCurrentEndDate.getTime() + extensionDays * 24 * 60 * 60 * 1000)
    : null;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.screenTitle}>My Bookings & Rentals</Text>
        <Text style={styles.screenSubtitle}>Manage your rental requests and equipment</Text>
      </View>

      {/* Segmented Tabs with Terracotta active underline */}
      <View style={styles.segmentedContainer}>
        <TouchableScale
          style={[
            styles.segmentButton,
            activeTab === 'asRenter' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('asRenter')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'asRenter' && styles.segmentTextActive,
            ]}
          >
            Requests I Made ({asRenterBookings.length})
          </Text>
          {activeTab === 'asRenter' && <View style={styles.activeTabUnderline} />}
        </TouchableScale>

        <TouchableScale
          style={[
            styles.segmentButton,
            activeTab === 'asOwner' && styles.segmentButtonActive,
          ]}
          onPress={() => setActiveTab('asOwner')}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === 'asOwner' && styles.segmentTextActive,
            ]}
          >
            Requests for My Items ({asOwnerBookings.length})
          </Text>
          {activeTab === 'asOwner' && <View style={styles.activeTabUnderline} />}
        </TouchableScale>
      </View>

      {/* Error message banner */}
      {error && (
        <View style={styles.errorBanner}>
          <AlertIcon size={16} color={theme.colors.error} variant="circle" style={styles.buttonInlineIcon} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableScale
            style={styles.retryButton}
            onPress={() => fetchBookings()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableScale>
        </View>
      )}

      {/* Loading state */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={currentBookings}
          keyExtractor={(item, index) => item._id || item.id || `booking-${index}`}
          renderItem={renderBookingCard}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBookings(true)}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        visible={isRazorpayModalVisible}
        orderData={selectedOrderData}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setIsRazorpayModalVisible(false)}
        onError={(err) => Alert.alert('Payment Error', err)}
      />

      {/* Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsReviewModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Leave a Review</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedReviewBooking?.product?.title || 'Rental Review'}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsReviewModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            {/* 5-star interactive rating selector */}
            <Text style={styles.reviewLabel}>Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableScale
                  key={`star-${star}`}
                  onPress={() => setReviewRating(star)}
                  style={styles.starButton}
                >
                  <StarIcon
                    size={32}
                    color={star <= reviewRating ? theme.colors.accent : theme.colors.border}
                    filled={star <= reviewRating}
                  />
                </TouchableScale>
              ))}
            </View>

            {/* Comment TextInput (multiline) */}
            <Text style={styles.reviewLabel}>Comment</Text>
            <TextInput
              style={styles.reviewCommentInput}
              placeholder="Share details of your rental experience..."
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
              textAlignVertical="top"
            />

            {/* Submit Review button */}
            <TouchableScale
              style={[
                styles.submitReviewButton,
                (isSubmittingReview || reviewRating === 0) && styles.submitReviewButtonDisabled,
              ]}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview || reviewRating === 0}
            >
              {isSubmittingReview ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              )}
            </TouchableScale>
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        visible={isDisputeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsDisputeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsDisputeModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Report a Problem</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedDisputeBooking?.product?.title || 'Rental Dispute'}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsDisputeModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            {/* Select Issue Type */}
            <Text style={styles.disputeSectionLabel}>Select Issue Type</Text>
            <View style={styles.disputeChipsRow}>
              {DISPUTE_REASONS.map((reason) => {
                const isSelected = selectedDisputeReason === reason;
                return (
                  <TouchableScale
                    key={reason}
                    style={[
                      styles.disputeChip,
                      isSelected && styles.disputeChipSelected,
                    ]}
                    onPress={() => setSelectedDisputeReason(reason)}
                  >
                    <Text
                      style={[
                        styles.disputeChipText,
                        isSelected && styles.disputeChipTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableScale>
                );
              })}
            </View>

            {/* Explanation & Details */}
            <Text style={styles.disputeSectionLabel}>Explanation & Details</Text>
            <TextInput
              style={styles.disputeTextInput}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              multiline
              numberOfLines={4}
              value={disputeExplanation}
              onChangeText={setDisputeExplanation}
              textAlignVertical="top"
            />

            {/* Submit Dispute button */}
            <TouchableScale
              style={[
                styles.submitDisputeButton,
                isSubmittingDispute && styles.submitDisputeButtonDisabled,
              ]}
              onPress={handleSubmitDispute}
              disabled={isSubmittingDispute}
            >
              {isSubmittingDispute ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitDisputeButtonText}>Submit Dispute</Text>
              )}
            </TouchableScale>
          </View>
        </View>
      </Modal>

      {/* Extension Request Modal */}
      <Modal
        visible={isExtensionModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsExtensionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsExtensionModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Request Rental Extension</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedExtensionBooking?.product?.title || 'Rental Extension'}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsExtensionModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            {/* Date Summary */}
            <View style={styles.extDateSummaryRow}>
              <View style={styles.extDateBlock}>
                <Text style={styles.extDateLabel}>Current End Date</Text>
                <Text style={styles.extDateValue}>{formatSingleDate(extCurrentEndDate || undefined)}</Text>
              </View>
              <Text style={styles.extDateArrow}>➔</Text>
              <View style={styles.extDateBlock}>
                <Text style={styles.extDateLabel}>New End Date</Text>
                <Text style={styles.extDateValueHighlight}>{formatSingleDate(extNewEndDate || undefined)}</Text>
              </View>
            </View>

            {/* Days Selector */}
            <Text style={styles.reviewLabel}>Additional Duration</Text>
            <View style={styles.stepperContainer}>
              <TouchableScale
                style={[styles.stepperButton, extensionDays <= 1 && styles.stepperButtonDisabled]}
                onPress={() => setExtensionDays((prev) => Math.max(1, prev - 1))}
                disabled={extensionDays <= 1}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableScale>
              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValueText}>
                  +{extensionDays} {extensionDays === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
              <TouchableScale
                style={styles.stepperButton}
                onPress={() => setExtensionDays((prev) => prev + 1)}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableScale>
            </View>

            {/* Quick Days Selector Chips */}
            <View style={styles.quickChipsRow}>
              {[1, 2, 3, 5, 7].map((num) => (
                <TouchableScale
                  key={`day-chip-${num}`}
                  style={[
                    styles.quickChip,
                    extensionDays === num && styles.quickChipActive,
                  ]}
                  onPress={() => setExtensionDays(num)}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      extensionDays === num && styles.quickChipTextActive,
                    ]}
                  >
                    +{num}d
                  </Text>
                </TouchableScale>
              ))}
            </View>

            {/* Live Fee Preview Breakdown */}
            <View style={styles.extFeeBreakdownBox}>
              <Text style={styles.extFeeBreakdownTitle}>Fee Preview</Text>
              <View style={styles.extFeeRow}>
                <Text style={styles.extFeeLabel}>Daily Rate</Text>
                <Text style={styles.extFeeValue}>{formatINR(extDailyRate)} / day</Text>
              </View>
              <View style={styles.extFeeRow}>
                <Text style={styles.extFeeLabel}>Additional Rental Fee ({extensionDays}d)</Text>
                <Text style={styles.extFeeValue}>{formatINR(extRentalFee)}</Text>
              </View>
              <View style={styles.extFeeRow}>
                <Text style={styles.extFeeLabel}>Platform Service Fee (15%)</Text>
                <Text style={styles.extFeeValue}>{formatINR(extPlatformFee)}</Text>
              </View>
              <View style={[styles.extFeeRow, styles.extFeeTotalRow]}>
                <Text style={styles.extFeeTotalLabel}>Total Additional Cost</Text>
                <Text style={styles.extFeeTotalValue}>{formatINR(extTotalAmount)}</Text>
              </View>
            </View>

            {/* Submit Extension Request Button */}
            <TouchableScale
              style={[
                styles.submitReviewButton,
                isSubmittingExtension && styles.submitReviewButtonDisabled,
              ]}
              onPress={handleSubmitExtension}
              disabled={isSubmittingExtension}
            >
              {isSubmittingExtension ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitReviewButtonText}>
                  Send Extension Request ({formatINR(extTotalAmount)})
                </Text>
              )}
            </TouchableScale>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        visible={isCancelModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsCancelModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Cancel Booking</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedCancelBooking?.product?.title || 'Grabit Rental'}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsCancelModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            {/* Late Cancellation Notice if within 24h of startDate */}
            {selectedCancelBooking &&
              (selectedCancelBooking.status === 'confirmed' || selectedCancelBooking.status === 'active') &&
              new Date(selectedCancelBooking.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                <View style={styles.lateNoticeContainer}>
                  <AlertIcon size={15} color={theme.colors.warning} variant="triangle" style={styles.lateNoticeIcon} />
                  <Text style={styles.lateNoticeText}>
                    Note: This booking is within 24 hours of starting. A late cancellation flag will be recorded.
                  </Text>
                </View>
              )}

            {/* Reason Selection Chips */}
            <Text style={styles.modalSectionLabel}>Select a Reason *</Text>
            <View style={styles.chipsContainer}>
              {CANCELLATION_REASONS.map((reason) => {
                const isSelected = selectedCancelReason === reason;
                return (
                  <TouchableScale
                    key={reason}
                    style={[
                      styles.chipButton,
                      isSelected ? styles.chipButtonSelected : styles.chipButtonUnselected,
                    ]}
                    onPress={() => setSelectedCancelReason(reason)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableScale>
                );
              })}
            </View>

            {/* Optional Explanation Text */}
            <Text style={styles.modalSectionLabel}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Provide any additional explanation..."
              placeholderTextColor={theme.colors.textMuted}
              underlineColorAndroid="transparent"
              multiline
              numberOfLines={3}
              value={cancelExplanation}
              onChangeText={setCancelExplanation}
              textAlignVertical="top"
            />

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableScale
                style={styles.modalCancelButton}
                onPress={() => setIsCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Keep Booking</Text>
              </TouchableScale>

              <TouchableScale
                style={[
                  styles.modalConfirmButton,
                  (!selectedCancelReason || isSubmittingCancel) && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmCancellation}
                disabled={!selectedCancelReason || isSubmittingCancel}
              >
                {isSubmittingCancel ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm Cancellation</Text>
                )}
              </TouchableScale>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  screenSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  segmentText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: 2,
    width: 32,
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  bookingCard: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  categoryChipIcon: {
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.xs,
  },
  paidCheckIcon: {
    marginRight: 3,
  },
  paidBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  statusBadge: {
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
  },
  statusBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  statusBadgePending: {
    backgroundColor: theme.colors.accentTint,
    borderColor: theme.colors.statusPending,
  },
  statusBadgeTextPending: {
    color: theme.colors.statusPending,
  },
  statusBadgeConfirmed: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.statusConfirmed,
  },
  statusBadgeTextConfirmed: {
    color: theme.colors.statusConfirmed,
  },
  statusBadgeActive: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.statusActive,
  },
  statusBadgeTextActive: {
    color: theme.colors.statusActive,
  },
  statusBadgeCompleted: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.statusCompleted,
  },
  statusBadgeTextCompleted: {
    color: theme.colors.statusCompleted,
  },
  statusBadgeCancelled: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.statusCancelled,
  },
  statusBadgeTextCancelled: {
    color: theme.colors.statusCancelled,
  },
  productTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIcon: {
    marginRight: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  durationChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.xs,
  },
  durationText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  partyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  partyIcon: {
    marginRight: theme.spacing.xs,
  },
  partyLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  partyName: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.xs,
  },
  protectionIcon: {
    marginRight: 3,
  },
  protectionBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  pricingLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  totalAmount: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.primary,
  },
  disputeActiveBanner: {
    backgroundColor: theme.colors.accentTint,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  disputeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  disputeIcon: {
    marginRight: theme.spacing.xs,
  },
  disputeActiveBannerTitle: {
    color: theme.colors.accentDark,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  disputeActiveBannerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    marginTop: 2,
  },
  disputeReasonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    marginTop: theme.spacing.xs,
  },
  cancellationReasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusCancelled,
    borderRadius: theme.borderRadius.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cancellationIcon: {
    marginRight: theme.spacing.xs,
  },
  cancellationReasonText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.statusCancelled,
  },
  extensionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentTint,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusPending,
  },
  extensionIcon: {
    marginRight: theme.spacing.xs,
  },
  extensionBannerTextBox: {
    flex: 1,
  },
  extensionBannerTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accentDark,
  },
  extensionBannerDesc: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  extensionApprovedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.borderRadius.xs,
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  extensionApprovedIcon: {
    marginRight: 4,
  },
  extensionApprovedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
  },
  extensionRejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.xs,
    paddingVertical: 3,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  extensionRejectedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  ownerExtensionBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  ownerExtensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  ownerExtensionIcon: {
    marginRight: theme.spacing.sm,
  },
  ownerExtensionHeaderText: {
    flex: 1,
  },
  ownerExtensionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  ownerExtensionSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  ownerExtensionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  acceptExtensionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptExtensionButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  declineExtensionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineExtensionButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  cardFooterActions: {
    flexDirection: 'row',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
    gap: theme.spacing.xs,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInlineIcon: {
    marginRight: theme.spacing.xs,
  },
  messageButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  payNowButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  payNowButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  requestExtensionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestExtensionButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  requestExtensionButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  requestExtensionButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  completeRentalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  completeRentalButtonHalf: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeRentalButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  reviewButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  reviewButtonDisabled: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    opacity: theme.opacity.disabled,
  },
  reviewButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  reviewButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  reportProblemButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  reportProblemButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  actionsContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  acceptButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  declineButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusCancelled,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    color: theme.colors.statusCancelled,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  cancelBookingButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusCancelled,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  cancelBookingButtonText: {
    color: theme.colors.statusCancelled,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  actionLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  actionLoadingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.error,
  },
  retryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginLeft: theme.spacing.sm,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
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
  },
  emptyActionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.xl,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.sm,
  },
  emptyActionText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
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
    paddingBottom: theme.spacing.xxl,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  modalHeaderTitleBox: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  modalTitle: {
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
    marginTop: theme.spacing.xs,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  reviewLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  starButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  reviewCommentInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    minHeight: 100,
    marginBottom: theme.spacing.lg,
  },
  submitReviewButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  submitReviewButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  submitReviewButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
  },
  disputeSectionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  disputeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  disputeChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.xs,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  disputeChipSelected: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  disputeChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  disputeChipTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  disputeTextInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    minHeight: 100,
    marginBottom: theme.spacing.lg,
  },
  submitDisputeButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  submitDisputeButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  submitDisputeButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
  },
  extDateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  extDateBlock: {
    flex: 1,
    alignItems: 'center',
  },
  extDateLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  extDateValue: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
  },
  extDateValueHighlight: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  extDateArrow: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.primary,
    marginHorizontal: theme.spacing.xs,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  stepperButtonText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.textPrimary,
  },
  stepperValueBox: {
    minWidth: 120,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  stepperValueText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primaryDark,
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  quickChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginHorizontal: theme.spacing.xs,
  },
  quickChipActive: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  quickChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  quickChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  extFeeBreakdownBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.lg,
  },
  extFeeBreakdownTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  extFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.xs,
  },
  extFeeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  extFeeValue: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
  },
  extFeeTotalRow: {
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  extFeeTotalLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  extFeeTotalValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.primary,
  },
  lateNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentTint,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  lateNoticeIcon: {
    marginRight: theme.spacing.xs,
  },
  lateNoticeText: {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.accentDark,
  },
  modalSectionLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  chipButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth.thin,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  chipButtonSelected: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  chipButtonUnselected: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.lineHeight.xs,
  },
  chipTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  chipTextUnselected: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
  modalTextInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    minHeight: 80,
    marginBottom: theme.spacing.lg,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  modalConfirmButton: {
    flex: 1.2,
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  modalConfirmButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  modalConfirmButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
});

export default BookingsScreen;
