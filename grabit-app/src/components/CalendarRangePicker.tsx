import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { ChevronIcon, CalendarIcon } from './icons';
import theme from '../theme';

export interface BlackoutRange {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface BookedRange {
  startDate: string;
  endDate: string;
}

export interface CalendarRangePickerProps {
  startDate?: string | null;
  endDate?: string | null;
  onDateRangeChange: (start: string | null, end: string | null) => void;
  blackoutDates?: Array<BlackoutRange>;
  bookedRanges?: Array<BookedRange>;
  minDate?: Date;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a Date or year/month/day tuple to a local 'YYYY-MM-DD' string.
 */
export const toDateString = (dateOrYear: Date | number, month?: number, day?: number): string => {
  if (typeof dateOrYear === 'number') {
    const y = dateOrYear;
    const m = String((month ?? 0) + 1).padStart(2, '0');
    const d = String(day ?? 1).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = dateOrYear.getFullYear();
  const m = String(dateOrYear.getMonth() + 1).padStart(2, '0');
  const d = String(dateOrYear.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Normalize an ISO string or Date to 'YYYY-MM-DD'.
 */
export const normalizeDateString = (input?: string | Date | null): string => {
  if (!input) return '';
  if (typeof input === 'string') {
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return input;
    }
    // If it's an ISO timestamp
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return toDateString(parsed);
    }
    return input.split('T')[0];
  }
  if (input instanceof Date && !isNaN(input.getTime())) {
    return toDateString(input);
  }
  return '';
};

/**
 * Parse a 'YYYY-MM-DD' string to a local midnight Date.
 */
const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date(dateStr);
};

export const CalendarRangePicker: React.FC<CalendarRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  blackoutDates = [],
  bookedRanges = [],
  minDate,
}) => {
  const normalizedStart = normalizeDateString(startDate);
  const normalizedEnd = normalizeDateString(endDate);

  // Compute effective minDate (default: today midnight)
  const effectiveMinDate = useMemo(() => {
    if (minDate && minDate instanceof Date && !isNaN(minDate.getTime())) {
      const d = new Date(minDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, [minDate]);

  const minDateStr = useMemo(() => toDateString(effectiveMinDate), [effectiveMinDate]);

  // Initial month view: startDate month if provided, otherwise today's month
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    if (normalizedStart) {
      const parsed = parseLocalDate(normalizedStart);
      if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const currentYear = currentMonthDate.getFullYear();
  const currentMonthIndex = currentMonthDate.getMonth();
  const monthTitle = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;

  // Check if previous month navigation is allowed (cannot go before minDate month)
  const canGoPrevMonth = useMemo(() => {
    const prevMonthDate = new Date(currentYear, currentMonthIndex, 0); // last day of prev month
    const minMonthDate = new Date(effectiveMinDate.getFullYear(), effectiveMinDate.getMonth(), 1);
    return prevMonthDate >= minMonthDate;
  }, [currentYear, currentMonthIndex, effectiveMinDate]);

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Normalized blackout & booked ranges for fast lookups
  const normalizedBlackouts = useMemo(() => {
    return blackoutDates
      .map((b) => ({
        start: normalizeDateString(b.startDate),
        end: normalizeDateString(b.endDate),
        reason: b.reason,
      }))
      .filter((b) => b.start && b.end);
  }, [blackoutDates]);

  const normalizedBookings = useMemo(() => {
    return bookedRanges
      .map((b) => ({
        start: normalizeDateString(b.startDate),
        end: normalizeDateString(b.endDate),
      }))
      .filter((b) => b.start && b.end);
  }, [bookedRanges]);

  // Check if a specific dateStr is disabled
  const checkIsDisabled = useCallback(
    (dateStr: string): { disabled: boolean; reason?: 'past' | 'blackout' | 'booked' } => {
      // 1. Past dates check (< minDate)
      if (dateStr < minDateStr) {
        return { disabled: true, reason: 'past' };
      }

      // 2. Blackout dates check
      const inBlackout = normalizedBlackouts.some((b) => dateStr >= b.start && dateStr <= b.end);
      if (inBlackout) {
        return { disabled: true, reason: 'blackout' };
      }

      // 3. Booked dates check
      const inBooked = normalizedBookings.some((b) => dateStr >= b.start && dateStr <= b.end);
      if (inBooked) {
        return { disabled: true, reason: 'booked' };
      }

      return { disabled: false };
    },
    [minDateStr, normalizedBlackouts, normalizedBookings]
  );

  // Check if any date in a range is disabled
  const hasBlockedDateInRange = useCallback(
    (startStr: string, endStr: string): boolean => {
      const start = parseLocalDate(startStr);
      const end = parseLocalDate(endStr);
      const curr = new Date(start);
      curr.setDate(curr.getDate() + 1);

      while (curr <= end) {
        const curStr = toDateString(curr);
        if (checkIsDisabled(curStr).disabled) {
          return true;
        }
        curr.setDate(curr.getDate() + 1);
      }
      return false;
    },
    [checkIsDisabled]
  );

  // Handle date tap with explicit 3-state machine:
  // State 1 (Empty): Sets startDate, endDate = null
  // State 2 (Start Only): Sets endDate (swapping if earlier), highlights full range
  // State 3 (Range Selected): Resets both, sets new startDate from tapped date
  const handleDatePress = (dateStr: string) => {
    const { disabled } = checkIsDisabled(dateStr);
    if (disabled) return;

    // STATE 1: Empty selection (no start and no end)
    if (!normalizedStart && !normalizedEnd) {
      onDateRangeChange(dateStr, null);
      return;
    }

    // STATE 2: Start date only (no end date yet)
    if (normalizedStart && !normalizedEnd) {
      // 2a. If tapped date is before start date -> swap order (tapped date is start, previous start is end)
      if (dateStr < normalizedStart) {
        if (hasBlockedDateInRange(dateStr, normalizedStart)) {
          onDateRangeChange(dateStr, null);
        } else {
          onDateRangeChange(dateStr, normalizedStart);
        }
        return;
      }

      // 2b. If tapped date is exact same date -> single 1-day rental range (start === end)
      if (dateStr === normalizedStart) {
        onDateRangeChange(normalizedStart, dateStr);
        return;
      }

      // 2c. If tapped date is after start date -> set end date and highlight range
      if (dateStr > normalizedStart) {
        if (hasBlockedDateInRange(normalizedStart, dateStr)) {
          onDateRangeChange(dateStr, null);
        } else {
          onDateRangeChange(normalizedStart, dateStr);
        }
        return;
      }
    }

    // STATE 3: Range already selected (both start and end exist)
    // Third tap clears both and starts fresh range with tapped date as start
    if (normalizedStart && normalizedEnd) {
      onDateRangeChange(dateStr, null);
      return;
    }
  };

  // Build calendar matrix (weeks of 7 days)
  const calendarWeeks = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0: Sun ... 6: Sat

    const weeks: Array<Array<{ day: number | null; dateStr: string }>> = [];
    let currentWeek: Array<{ day: number | null; dateStr: string }> = [];

    // Leading empty slots for starting day offset
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ day: null, dateStr: '' });
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateString(currentYear, currentMonthIndex, day);
      currentWeek.push({ day, dateStr });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Trailing empty slots to complete the last week row
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ day: null, dateStr: '' });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, currentMonthIndex]);

  // Selected range summary calculation
  const rangeSummary = useMemo(() => {
    if (!normalizedStart) {
      return { text: 'Select rental start date', isComplete: false };
    }
    if (normalizedStart && !normalizedEnd) {
      return {
        text: `From ${normalizedStart} • Select return date`,
        isComplete: false,
      };
    }
    if (normalizedStart && normalizedEnd) {
      const d1 = parseLocalDate(normalizedStart);
      const d2 = parseLocalDate(normalizedEnd);
      const diffMs = d2.getTime() - d1.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        text: `${normalizedStart} to ${normalizedEnd} (${days} ${days === 1 ? 'day' : 'days'})`,
        isComplete: true,
        days,
      };
    }
    return { text: '', isComplete: false };
  }, [normalizedStart, normalizedEnd]);

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.navButton, !canGoPrevMonth && styles.navButtonDisabled]}
          onPress={handlePrevMonth}
          disabled={!canGoPrevMonth}
          accessibilityLabel="Previous month"
        >
          <ChevronIcon
            size={18}
            color={canGoPrevMonth ? theme.colors.primary : theme.colors.textMuted}
            direction="left"
          />
        </TouchableOpacity>

        <View style={styles.monthTitleWrapper}>
          <CalendarIcon size={16} color={theme.colors.primary} />
          <Text style={styles.monthTitleText}>{monthTitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleNextMonth}
          accessibilityLabel="Next month"
        >
          <ChevronIcon size={18} color={theme.colors.primary} direction="right" />
        </TouchableOpacity>
      </View>

      {/* Day of Week Labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((dayLabel, idx) => (
          <View key={`label-${idx}`} style={styles.dayLabelCell}>
            <Text
              style={[
                styles.dayLabelText,
                (idx === 0 || idx === 6) && styles.dayLabelWeekend,
              ]}
            >
              {dayLabel}
            </Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.weeksContainer}>
        {calendarWeeks.map((week, weekIdx) => (
          <View key={`week-${weekIdx}`} style={styles.weekRow}>
            {week.map((cell, dayIdx) => {
              if (!cell.day || !cell.dateStr) {
                return <View key={`empty-${weekIdx}-${dayIdx}`} style={styles.dayCell} />;
              }

              const { dateStr, day } = cell;
              const { disabled, reason } = checkIsDisabled(dateStr);

              const isStart = Boolean(normalizedStart && dateStr === normalizedStart);
              const isEnd = Boolean(normalizedEnd && dateStr === normalizedEnd);
              const hasRange = Boolean(
                normalizedStart && normalizedEnd && normalizedStart !== normalizedEnd
              );
              const isInRange = Boolean(
                hasRange && dateStr > (normalizedStart || '') && dateStr < (normalizedEnd || '')
              );

              const isToday = dateStr === minDateStr;

              return (
                <View key={`cell-${dateStr}`} style={styles.dayCell}>
                  {/* Range connecting background pill */}
                  {hasRange && (
                    <>
                      {/* Left half connector for End date and In-range */}
                      {(isEnd || isInRange) && (
                        <View
                          style={[
                            styles.rangePillLeft,
                            isInRange && dayIdx === 0 && styles.rangePillLeftRounded,
                          ]}
                        />
                      )}
                      {/* Right half connector for Start date and In-range */}
                      {(isStart || isInRange) && (
                        <View
                          style={[
                            styles.rangePillRight,
                            isInRange && dayIdx === 6 && styles.rangePillRightRounded,
                          ]}
                        />
                      )}
                    </>
                  )}

                  {/* Interactive Day Button */}
                  <TouchableOpacity
                    style={[
                      styles.dayButton,
                      (isStart || isEnd) && styles.dayButtonSelected,
                      isToday && !isStart && !isEnd && styles.dayButtonToday,
                      disabled && styles.dayButtonDisabled,
                    ]}
                    onPress={() => handleDatePress(dateStr)}
                    disabled={disabled}
                    activeOpacity={theme.opacity.active}
                    accessibilityLabel={`${monthTitle} ${day}${disabled ? ' unavailable' : ''}${
                      isStart ? ' start date' : ''
                    }${isEnd ? ' end date' : ''}`}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        (isStart || isEnd) && styles.dayTextSelected,
                        isInRange && styles.dayTextInRange,
                        disabled && styles.dayTextDisabled,
                        isToday && !isStart && !isEnd && styles.dayTextToday,
                      ]}
                    >
                      {day}
                    </Text>

                    {/* Blackout / Booked indicator dot */}
                    {disabled && reason !== 'past' && (
                      <View
                        style={[
                          styles.statusDot,
                          reason === 'blackout' && styles.statusDotBlackout,
                          reason === 'booked' && styles.statusDotBooked,
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected Range Summary Bar */}
      <View
        style={[
          styles.summaryBar,
          rangeSummary.isComplete && styles.summaryBarComplete,
        ]}
      >
        <Text
          style={[
            styles.summaryText,
            rangeSummary.isComplete && styles.summaryTextComplete,
          ]}
        >
          {rangeSummary.text}
        </Text>
        {Boolean(normalizedStart) && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => onDateRangeChange(null, null)}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotSelected]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotInRange]} />
          <Text style={styles.legendText}>Duration</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotUnavailable]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  navButton: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: theme.opacity.disabled,
    backgroundColor: theme.colors.surface,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.borderSubtle,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayLabelWeekend: {
    color: theme.colors.textMuted,
  },
  weeksContainer: {
    marginVertical: theme.spacing.xs / 2,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.xs / 2,
  },
  dayCell: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rangePillLeft: {
    position: 'absolute',
    left: 0,
    right: '50%',
    top: 2,
    bottom: 2,
    backgroundColor: theme.colors.primarySurface,
    borderTopWidth: theme.borderWidth.thin,
    borderBottomWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.accent,
    borderBottomColor: theme.colors.accent,
  },
  rangePillLeftRounded: {
    borderTopLeftRadius: theme.borderRadius.full,
    borderBottomLeftRadius: theme.borderRadius.full,
    borderLeftWidth: theme.borderWidth.thin,
    borderLeftColor: theme.colors.accent,
  },
  rangePillRight: {
    position: 'absolute',
    left: '50%',
    right: 0,
    top: 2,
    bottom: 2,
    backgroundColor: theme.colors.primarySurface,
    borderTopWidth: theme.borderWidth.thin,
    borderBottomWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.accent,
    borderBottomColor: theme.colors.accent,
  },
  rangePillRightRounded: {
    borderTopRightRadius: theme.borderRadius.full,
    borderBottomRightRadius: theme.borderRadius.full,
    borderRightWidth: theme.borderWidth.thin,
    borderRightColor: theme.colors.accent,
  },
  dayButton: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.accent,
    ...theme.shadows.md,
  },
  dayButtonToday: {
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
  },
  dayButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  dayText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  dayTextSelected: {
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold,
  },
  dayTextInRange: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  dayTextDisabled: {
    color: theme.colors.textMuted,
  },
  dayTextToday: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: theme.borderRadius.full,
    position: 'absolute',
    bottom: 2,
  },
  statusDotBlackout: {
    backgroundColor: theme.colors.error,
  },
  statusDotBooked: {
    backgroundColor: theme.colors.warning,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  summaryBarComplete: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primaryLight,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  summaryTextComplete: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  resetButton: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
  },
  resetButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accentDark,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.xs / 2,
  },
  legendDotSelected: {
    backgroundColor: theme.colors.accent,
  },
  legendDotInRange: {
    backgroundColor: theme.colors.primarySurface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
  },
  legendDotUnavailable: {
    backgroundColor: theme.colors.textMuted,
    opacity: theme.opacity.disabled,
  },
  legendText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.regular,
  },
});

export default CalendarRangePicker;
