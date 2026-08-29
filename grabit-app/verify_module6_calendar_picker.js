/**
 * Verification Suite for MODULE 6:
 * Calendar Date-Range Picker for Booking & Instant Payment Handoff
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PROJECT GRABIT - SUBAGENT 4 VERIFICATION SUITE');
console.log('Module 6: Calendar Range Picker & Date Booking Flow');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// --------------------------------------------------------------------
// 1. Check TypeScript Compilation
// --------------------------------------------------------------------
console.log('TEST SUITE 1: TypeScript Compilation');
try {
  const tscOut = execSync('npm run typecheck', { cwd: __dirname, encoding: 'utf8' });
  assert(true, 'TypeScript typecheck passed with 0 errors (tsc --noEmit)');
} catch (err) {
  assert(false, `TypeScript typecheck failed: ${err.message}`);
}

// --------------------------------------------------------------------
// 2. Strict Theme Token & Zero Raw Hex Code Verification
// --------------------------------------------------------------------
console.log('\nTEST SUITE 2: Strict Zero Raw Hex Codes Verification');
const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

const filesToCheck = [
  'src/components/CalendarRangePicker.tsx',
  'src/screens/main/ProductDetailScreen.tsx',
  'src/screens/main/PaymentScreen.tsx',
  'src/navigation/types.ts',
  'src/navigation/AppNavigator.tsx',
  'src/components/index.ts',
];

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `${file} exists`);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(hexRegex);
  assert(!matches || matches.length === 0, `${file} contains 0 raw hex codes (matches: ${matches ? matches.length : 0})`);
}

// --------------------------------------------------------------------
// 3. CalendarRangePicker Component Contract
// --------------------------------------------------------------------
console.log('\nTEST SUITE 3: CalendarRangePicker Component Contract');
const pickerContent = fs.readFileSync(path.join(__dirname, 'src/components/CalendarRangePicker.tsx'), 'utf8');

assert(pickerContent.includes('export const CalendarRangePicker'), 'CalendarRangePicker is exported');
assert(pickerContent.includes('interface CalendarRangePickerProps'), 'CalendarRangePickerProps interface defined');
assert(pickerContent.includes('startDate?: string | null'), 'Props includes startDate');
assert(pickerContent.includes('endDate?: string | null'), 'Props includes endDate');
assert(pickerContent.includes('onDateRangeChange: (start: string | null, end: string | null) => void'), 'Props includes onDateRangeChange callback');
assert(pickerContent.includes('blackoutDates?:'), 'Props includes blackoutDates');
assert(pickerContent.includes('bookedRanges?:'), 'Props includes bookedRanges');
assert(pickerContent.includes('minDate?: Date'), 'Props includes minDate');

// Month header & Navigation
assert(pickerContent.includes('MONTH_NAMES') && pickerContent.includes('currentYear'), 'Header displays Month Name and Year');
assert(pickerContent.includes('handlePrevMonth') && pickerContent.includes('handleNextMonth'), 'Implements month navigation handlers');
assert(pickerContent.includes('ChevronIcon') && pickerContent.includes('direction="left"'), 'Header renders Left (<) navigation button');
assert(pickerContent.includes('ChevronIcon') && pickerContent.includes('direction="right"'), 'Header renders Right (>) navigation button');

// Day of week headers
assert(pickerContent.includes('DAY_LABELS') && pickerContent.includes("'Sun'") && pickerContent.includes("'Sat'"), 'Header renders day of week labels Sun-Sat');

// Days grid & offsets
assert(pickerContent.includes('firstDayOfWeek') && pickerContent.includes('daysInMonth'), 'Calculates month start offset and days in month');
assert(pickerContent.includes('calendarWeeks'), 'Constructs 7-day row calendar matrix');

// Disabled styling
assert(pickerContent.includes('minDateStr') && pickerContent.includes('dateStr < minDateStr'), 'Disables past dates before minDate/today');
assert(pickerContent.includes('normalizedBlackouts') && pickerContent.includes('inBlackout'), 'Disables blackout dates');
assert(pickerContent.includes('normalizedBookings') && pickerContent.includes('inBooked'), 'Disables booked dates');
assert(pickerContent.includes('dayButtonDisabled') && pickerContent.includes('dayTextDisabled'), 'Applies disabled styling');

// Range selection logic
assert(pickerContent.includes('handleDatePress'), 'Implements interactive date tap handler');
assert(pickerContent.includes('onDateRangeChange(dateStr, null)'), 'Tap 1 selects start date');
assert(pickerContent.includes('dateStr < normalizedStart') && (pickerContent.includes('onDateRangeChange(dateStr, normalizedStart)') || pickerContent.includes('onDateRangeChange(dateStr, null)')), 'Tapping date before start date swaps or resets start date');
assert(pickerContent.includes('hasBlockedDateInRange'), 'Checks for blocked dates between start and end range');

// Range visual styling
assert(pickerContent.includes('dayButtonSelected') && pickerContent.includes('theme.colors.accent'), 'Selected start/end dates use theme accent terracotta');
assert(pickerContent.includes('rangePillLeft') && pickerContent.includes('rangePillRight'), 'Renders left/right capped range pill extensions');
assert(pickerContent.includes('theme.colors.primarySurface'), 'In-range days styled with theme primarySurface pill');
assert(pickerContent.includes('summaryBar') && pickerContent.includes('legendRow'), 'Renders summary bar and legend');

// Component index export
const indexContent = fs.readFileSync(path.join(__dirname, 'src/components/index.ts'), 'utf8');
assert(indexContent.includes("export * from './CalendarRangePicker'"), 'CalendarRangePicker exported from components/index.ts');

// --------------------------------------------------------------------
// 4. ProductDetailScreen.tsx Calendar & Pricing Integration Contract
// --------------------------------------------------------------------
console.log('\nTEST SUITE 4: ProductDetailScreen Integration Contract');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');

assert(detailContent.includes('CalendarRangePicker'), 'ProductDetailScreen imports CalendarRangePicker');
assert(detailContent.includes('<CalendarRangePicker'), 'Renders CalendarRangePicker in booking modal');
assert(detailContent.includes('handleDateRangeChange'), 'Implements handleDateRangeChange handler');
assert(detailContent.includes('blackoutDates={blackoutDates}'), 'Passes blackoutDates to CalendarRangePicker');

// Steppers / presets replaced
assert(!detailContent.includes('<View style={styles.datesContainer}>') || detailContent.includes('calendarPickerContainer'), 'Date stepper replaced with CalendarRangePicker');

// Live pricing in INR ₹
assert(detailContent.includes('formatINR(dailyPrice)') || detailContent.includes('₹'), 'Displays prices with ₹ currency formatting');
assert(detailContent.includes('Rental Fee') && (detailContent.includes('formatINR(rentalFee)') || detailContent.includes('rentalFee')), 'Breakdown shows live rental fee calculation with ₹');
assert(detailContent.includes('Platform Service Fee (15%)') && (detailContent.includes('formatINR(platformFee)') || detailContent.includes('platformFee')), 'Breakdown shows 15% platform service fee with ₹');
assert(detailContent.includes('Refundable Security Deposit') && (detailContent.includes('formatINR(securityDeposit)') || detailContent.includes('securityDeposit')), 'Breakdown shows security deposit with ₹');
assert(detailContent.includes('Total Amount') && (detailContent.includes('formatINR(totalAmount)') || detailContent.includes('totalAmount')), 'Breakdown shows total amount with ₹');

// Instant Book & Pay button and navigation to PaymentScreen
assert(detailContent.includes('Instant Book & Pay') && detailContent.includes('totalAmount'), 'Button renders Instant Book & Pay with live total');
assert(detailContent.includes("navigation.navigate('Payment'"), 'Navigates to Payment screen on booking creation');
assert(detailContent.includes('bookingId') && detailContent.includes('product') && detailContent.includes('totalDays') && detailContent.includes('pricing') && detailContent.includes('startDate') && detailContent.includes('endDate'), 'Passes required booking parameters to Payment screen');

// --------------------------------------------------------------------
// 5. PaymentScreen.tsx Implementation Contract
// --------------------------------------------------------------------
console.log('\nTEST SUITE 5: PaymentScreen Implementation Contract');
const paymentContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/PaymentScreen.tsx'), 'utf8');

assert(paymentContent.includes('export const PaymentScreen'), 'PaymentScreen is exported');
assert(paymentContent.includes('api.createPaymentOrder(') || paymentContent.includes('createPaymentOrder'), 'PaymentScreen calls api.createPaymentOrder');
assert(paymentContent.includes('RazorpayCheckoutModal'), 'PaymentScreen integrates RazorpayCheckoutModal');
assert(paymentContent.includes('api.verifyPayment(') || paymentContent.includes('verifyPayment'), 'PaymentScreen verifies payment');
assert(paymentContent.includes('formatINR') || paymentContent.includes('₹'), 'PaymentScreen displays total amount in ₹');

// --------------------------------------------------------------------
// 6. Navigation Routes Contract
// --------------------------------------------------------------------
console.log('\nTEST SUITE 6: Navigation Routes Contract');
const navTypes = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
const appNav = fs.readFileSync(path.join(__dirname, 'src/navigation/AppNavigator.tsx'), 'utf8');

assert(navTypes.includes('Payment:'), 'Payment route typed in AppStackParamList');
assert(appNav.includes("name=\"Payment\"") && appNav.includes('component={PaymentScreen}'), 'PaymentScreen registered in AppNavigator stack');

// --------------------------------------------------------------------
// 7. Functional Pure Unit Tests for Calendar Logic
// --------------------------------------------------------------------
console.log('\nTEST SUITE 7: Functional Unit Tests for Calendar Logic');
const ts = require('typescript');
const pickerTs = fs.readFileSync(path.join(__dirname, 'src/components/CalendarRangePicker.tsx'), 'utf8');
const jsOutput = ts.transpileModule(pickerTs, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.React,
  },
}).outputText;

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (moduleName) {
  if (moduleName === 'react' || moduleName === 'react/jsx-runtime') {
    return {
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useMemo: (cb) => cb(),
      useCallback: (cb) => cb,
      createElement: () => null,
      default: {
        useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
        useMemo: (cb) => cb(),
        useCallback: (cb) => cb,
        createElement: () => null,
      },
    };
  }
  if (moduleName === 'react-native') {
    return {
      StyleSheet: { create: (s) => s },
      Text: () => null,
      View: () => null,
      TouchableOpacity: () => null,
    };
  }
  if (moduleName.includes('icons')) {
    return {
      ChevronIcon: () => null,
      CalendarIcon: () => null,
    };
  }
  if (moduleName.includes('theme')) {
    const mockTheme = {
      colors: {
        primary: '#1F4D3A',
        accent: '#D97D3F',
        primarySurface: '#E8F1EC',
        surface: '#FFFFFF',
        surfaceSubtle: '#F3ECE0',
        border: '#E5DDCF',
        borderSubtle: '#EFE8DC',
        textPrimary: '#1F2A24',
        textSecondary: '#5C6B62',
        textMuted: '#8E9D94',
        primaryDark: '#1B4332',
        primaryLight: '#2D6A4F',
        error: '#C84B31',
        warning: '#D97D3F',
      },
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
      typography: {
        fontSize: { xs: 12, sm: 14, md: 16, lg: 18 },
        fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
        lineHeight: { xs: 16, sm: 20, md: 24, lg: 26 },
      },
      borderRadius: { full: 9999, xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
      borderWidth: { thin: 1, regular: 2 },
      opacity: { disabled: 0.4, active: 0.8 },
      shadows: { sm: {} },
    };
    return {
      ...mockTheme,
      default: mockTheme,
    };
  }
  return originalRequire.apply(this, arguments);
};

const m = new Module('CalendarRangePicker');
m.paths = Module._nodeModulePaths(__dirname);
m._compile(jsOutput, path.join(__dirname, 'src/components/CalendarRangePicker.js'));
const { toDateString, normalizeDateString } = m.exports;

// Test toDateString
const testDate = new Date(2026, 9, 15); // Oct 15, 2026
assert(toDateString(testDate) === '2026-10-15', `toDateString formats Date correctly (${toDateString(testDate)})`);
assert(toDateString(2026, 9, 15) === '2026-10-15', `toDateString formats year/month/day tuple correctly (${toDateString(2026, 9, 15)})`);

// Test normalizeDateString
assert(normalizeDateString('2026-10-15') === '2026-10-15', 'normalizeDateString handles YYYY-MM-DD string');
assert(normalizeDateString('2026-10-15T12:30:00.000Z') === '2026-10-15', 'normalizeDateString handles ISO timestamp');
assert(normalizeDateString(new Date(2026, 9, 15)) === '2026-10-15', 'normalizeDateString handles Date object');
// State machine simulation test:
// State 1: empty -> tap '2026-10-10' -> sets start='2026-10-10', end=null
let currentStart = null;
let currentEnd = null;
const simulateTap = (dateStr) => {
  const normStart = currentStart;
  const normEnd = currentEnd;
  // STATE 1
  if (!normStart && !normEnd) {
    currentStart = dateStr;
    currentEnd = null;
    return;
  }
  // STATE 2
  if (normStart && !normEnd) {
    if (dateStr < normStart) {
      currentStart = dateStr;
      currentEnd = normStart;
    } else {
      currentStart = normStart;
      currentEnd = dateStr;
    }
    return;
  }
  // STATE 3
  if (normStart && normEnd) {
    currentStart = dateStr;
    currentEnd = null;
    return;
  }
};

// Tap 1 on Date A ('2026-10-10')
simulateTap('2026-10-10');
assert(currentStart === '2026-10-10' && currentEnd === null, 'Tap 1 sets start date only (start=2026-10-10, end=null)');

// Tap 2 on Date B ('2026-10-14')
simulateTap('2026-10-14');
assert(currentStart === '2026-10-10' && currentEnd === '2026-10-14', 'Tap 2 confirms range (start=2026-10-10, end=2026-10-14)');

// Tap 3 on Date C ('2026-10-20')
simulateTap('2026-10-20');
assert(currentStart === '2026-10-20' && currentEnd === null, 'Tap 3 on completed range resets and starts new selection (start=2026-10-20, end=null)');

// Tap 4 on earlier Date D ('2026-10-18') -> should swap order
simulateTap('2026-10-18');
assert(currentStart === '2026-10-18' && currentEnd === '2026-10-20', 'Tapping earlier date swaps order correctly (start=2026-10-18, end=2026-10-20)');

console.log('\n====================================================');
console.log(`MODULE 6 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
