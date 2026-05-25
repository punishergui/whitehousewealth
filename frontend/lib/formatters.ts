// ============================================================
// WHITE HOUSE WEALTH OS — Formatters
// ============================================================

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(
  amount: number,
  options: {
    compact?: boolean
    showSign?: boolean
    decimals?: number
  } = {}
): string {
  const { compact = false, showSign = false, decimals = 0 } = options

  if (compact && Math.abs(amount) >= 1000) {
    const abs = Math.abs(amount)
    const sign = showSign && amount > 0 ? '+' : amount < 0 ? '-' : ''
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    }
    if (abs >= 1000) {
      return `${sign}$${(abs / 1000).toFixed(1)}K`
    }
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount))

  if (showSign && amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

/**
 * Format a number as a percentage
 */
export function formatPercent(
  value: number,
  options: { decimals?: number; showSign?: boolean } = {}
): string {
  const { decimals = 1, showSign = false } = options
  const formatted = `${Math.abs(value).toFixed(decimals)}%`
  if (showSign && value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

/**
 * Format a date string
 */
export function formatDate(
  dateString: string,
  formatStr: string = 'MMM d, yyyy'
): string {
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return dateString
    return format(date, formatStr)
  } catch {
    return dateString
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return dateString
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

/**
 * Format a large number with commas
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Get color class for a currency value
 */
export function getValueColor(value: number, inverse: boolean = false): string {
  if (inverse) {
    return value > 0 ? 'text-red-400' : value < 0 ? 'text-emerald-400' : 'text-gray-400'
  }
  return value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
}

/**
 * Format APR for display
 */
export function formatAPR(apr: number): string {
  return `${apr.toFixed(2)}% APR`
}

/**
 * Get APR color based on rate
 */
export function getAPRColor(apr: number): string {
  if (apr <= 5) return 'text-emerald-400'
  if (apr <= 15) return 'text-blue-400'
  if (apr <= 20) return 'text-yellow-400'
  if (apr <= 25) return 'text-orange-400'
  return 'text-red-400'
}

/**
 * Format months as human-readable runway
 */
export function formatRunway(months: number): string {
  if (months < 1) return `${Math.round(months * 30)} days`
  if (months === 1) return '1 month'
  if (months < 12) return `${months.toFixed(1)} months`
  const years = months / 12
  return `${years.toFixed(1)} years`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Format category name for display
 */
export function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Calculate progress percentage
 */
export function calcProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.max(0, (current / target) * 100))
}

/**
 * Get progress color based on percentage
 */
export function getProgressColor(percent: number, inverse: boolean = false): string {
  if (inverse) {
    if (percent >= 90) return '#ef4444'
    if (percent >= 75) return '#f59e0b'
    return '#10b981'
  }
  if (percent >= 90) return '#10b981'
  if (percent >= 50) return '#3b82f6'
  if (percent >= 25) return '#f59e0b'
  return '#ef4444'
}

/**
 * Format date for chart display
 */
export function formatChartDate(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'MMM d')
  } catch {
    return dateString
  }
}

/**
 * Format month for chart display
 */
export function formatChartMonth(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'MMM yy')
  } catch {
    return dateString
  }
}
