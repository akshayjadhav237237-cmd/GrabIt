/**
 * Formats a numeric amount in Indian Rupees (INR / ₹) with standard Indian numbering system grouping (e.g. lakh, crore).
 * Returns whole rupee amounts formatted as "₹1,200", "₹650", "₹15,000".
 *
 * @param amount The numeric amount to format (number | undefined | null)
 * @returns Formatted string with ₹ symbol and Indian grouping, no decimals
 */
export function formatINR(amount: number | undefined | null): string {
  const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `₹${Math.round(numericAmount).toLocaleString('en-IN')}`;
}

export default formatINR;
