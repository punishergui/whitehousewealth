// ============================================================
// WHITE HOUSE WEALTH OS — App Constants
// ============================================================

export const APP_NAME = 'WHITE HOUSE WEALTH OS'
export const APP_SHORT_NAME = 'WHWOS'
export const APP_VERSION = '1.0.0'

export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  money: '/money',
  wealth: '/wealth',
  scenarios: '/scenarios',
  fire: '/fire',
  family: '/family',
  hermes: '/hermes',
  settings: '/settings',
} as const

export const NAV_ITEMS = [
  {
    label: 'Command Center',
    href: ROUTES.dashboard,
    icon: 'LayoutDashboard',
    description: 'Overview & priorities',
  },
  {
    label: 'Money Ops',
    href: ROUTES.money,
    icon: 'DollarSign',
    description: 'Transactions & budgets',
  },
  {
    label: 'Wealth',
    href: ROUTES.wealth,
    icon: 'TrendingUp',
    description: 'Net worth & accounts',
  },
  {
    label: 'Scenarios',
    href: ROUTES.scenarios,
    icon: 'FlaskConical',
    description: 'Decision simulation',
  },
  {
    label: 'FIRE',
    href: ROUTES.fire,
    icon: 'Flame',
    description: 'Financial independence',
  },
  {
    label: 'Family',
    href: ROUTES.family,
    icon: 'Users',
    description: 'Simplified family view',
  },
  {
    label: 'Hermes AI',
    href: ROUTES.hermes,
    icon: 'MessageSquare',
    description: 'AI financial advisor',
  },
] as const

export const SCENARIO_DEFINITIONS = [
  {
    type: 'disney_trip',
    name: 'Disney Trip',
    description: 'Plan a magical Disney vacation for the family',
    icon: '🏰',
    category: 'Vacation',
    typical_cost: 6500,
  },
  {
    type: 'branson_trip',
    name: 'Branson Trip',
    description: 'Weekend getaway to Branson, MO',
    icon: '🎭',
    category: 'Vacation',
    typical_cost: 1200,
  },
  {
    type: 'arkansas_vacation',
    name: 'Arkansas Vacation',
    description: 'Outdoor adventure in the Natural State',
    icon: '⛰️',
    category: 'Vacation',
    typical_cost: 2000,
  },
  {
    type: 'atv_purchase',
    name: 'ATV Purchase',
    description: 'Finance or buy an all-terrain vehicle',
    icon: '🏍️',
    category: 'Purchase',
    typical_cost: 12000,
  },
  {
    type: 'truck_purchase',
    name: 'Truck Purchase',
    description: 'New or used truck financing analysis',
    icon: '🚛',
    category: 'Purchase',
    typical_cost: 45000,
  },
  {
    type: 'ashley_quits',
    name: 'Ashley Quits',
    description: 'Financial impact if one spouse stops working',
    icon: '💼',
    category: 'Life Event',
    typical_cost: 48000,
  },
  {
    type: 'extra_debt_payment',
    name: 'Extra Debt Payment',
    description: 'Accelerate debt payoff strategy',
    icon: '💳',
    category: 'Debt',
    typical_cost: 500,
  },
  {
    type: 'tax_refund',
    name: 'Tax Refund Allocation',
    description: 'Optimize how to use your tax refund',
    icon: '🧾',
    category: 'Income',
    typical_cost: -4500,
  },
  {
    type: 'refinance_debt',
    name: 'Refinance Debt',
    description: 'Lower rates through debt consolidation',
    icon: '🏦',
    category: 'Debt',
    typical_cost: 0,
  },
  {
    type: 'emergency_event',
    name: 'Emergency Event',
    description: 'Model an unexpected financial emergency',
    icon: '🚨',
    category: 'Emergency',
    typical_cost: 5000,
  },
] as const

export const FIRE_MODES = [
  {
    id: 'lean',
    name: 'Lean FIRE',
    description: 'Minimal lifestyle, maximum freedom',
    multiplier: 25,
    typical_expenses: 30000,
    color: '#10b981',
  },
  {
    id: 'coast',
    name: 'Coast FIRE',
    description: 'Let investments grow, work part-time',
    multiplier: 0,
    typical_expenses: 50000,
    color: '#3b82f6',
  },
  {
    id: 'fat',
    name: 'Fat FIRE',
    description: 'Luxury lifestyle, full financial freedom',
    multiplier: 33,
    typical_expenses: 100000,
    color: '#f59e0b',
  },
  {
    id: 'barista',
    name: 'Barista FIRE',
    description: 'Part-time work for benefits & extras',
    multiplier: 25,
    typical_expenses: 50000,
    color: '#8b5cf6',
  },
] as const

export const COLORS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  red: '#ef4444',
  gold: '#f59e0b',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  orange: '#f97316',
  indigo: '#6366f1',
  teal: '#14b8a6',
} as const

export const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
]

export const EMERGENCY_FUND_TARGETS = {
  minimal: 3,
  standard: 6,
  conservative: 9,
  max: 12,
}

export const HERMES_SUGGESTIONS = [
  'What is my safe to spend this week?',
  'How am I doing on my grocery budget?',
  'When will I pay off my credit card debt?',
  'Can I afford a Disney trip this year?',
  'What is my projected net worth in 5 years?',
  'How am I tracking toward FIRE?',
  'What should I do with my tax refund?',
  'Show me my biggest spending categories this month',
  'What bills are due this week?',
  'How much have I saved this year?',
]

export const DEBT_APR_THRESHOLDS = {
  low: 5,
  medium: 15,
  high: 20,
  extreme: 25,
}
