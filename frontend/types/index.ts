// ============================================================
// WHITE HOUSE WEALTH OS — Core Type Definitions
// ============================================================

export type AccountType =
  | 'checking'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'credit_card'
  | 'loan'
  | 'mortgage'
  | 'real_estate'
  | 'crypto'
  | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  institution: string
  color: string
  icon: string
  last_updated?: string
  account_number_last4?: string
  interest_rate?: number
}

export type TransactionType = 'debit' | 'credit' | 'transfer'
export type TransactionStatus = 'posted' | 'pending' | 'cleared'

export interface Transaction {
  id: string
  date: string
  amount: number
  description: string
  merchant_name: string
  category: string
  subcategory?: string
  type: TransactionType
  status: TransactionStatus
  account_id: string
  account_name: string
  notes?: string
  tags?: string[]
}

export interface Budget {
  id: string
  name: string
  amount: number
  spent: number
  period: 'monthly' | 'weekly' | 'annual'
  category: string
  color?: string
  rollover?: boolean
}

export type GoalType = 'savings' | 'debt_payoff' | 'investment' | 'emergency' | 'vacation' | 'home' | 'vehicle' | 'other'

export interface Goal {
  id: string
  name: string
  type: GoalType
  current_amount: number
  target_amount: number
  target_date: string
  color: string
  monthly_contribution?: number
  icon?: string
}

export interface SinkingFund {
  id: string
  name: string
  current: number
  target: number
  monthly_contribution: number
  target_date?: string
  color: string
  icon: string
}

export interface Debt {
  id: string
  name: string
  balance: number
  apr: number
  min_payment: number
  monthly_payment: number
  promo_expiry?: string
  promo_apr?: number
  payoff_date?: string
  original_balance?: number
  institution: string
  type: 'credit_card' | 'personal_loan' | 'auto_loan' | 'student_loan' | 'mortgage' | 'other'
  color?: string
}

export interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  status: 'upcoming' | 'due' | 'overdue' | 'paid'
  category: string
  auto_pay: boolean
  account_id?: string
  icon?: string
}

export interface WeeklyPriority {
  id: string
  title: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  type: 'action' | 'alert' | 'opportunity' | 'reminder'
  amount?: number
  deadline?: string
}

export interface ForecastPoint {
  date: string
  balance_30: number
  balance_60: number
  balance_90: number
  events?: ForecastEvent[]
}

export interface ForecastEvent {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
}

export interface DashboardData {
  safe_to_spend: number
  safe_to_spend_breakdown: {
    total_cash: number
    upcoming_bills_7d: number
    upcoming_bills_30d: number
    buffer_reserve: number
    sinking_fund_reserve: number
  }
  total_liquid_cash: number
  emergency_fund: {
    current: number
    target: number
    months_runway: number
    monthly_expenses: number
  }
  accounts: Account[]
  debts: Debt[]
  upcoming_bills: Bill[]
  sinking_funds: SinkingFund[]
  weekly_priorities: WeeklyPriority[]
  hermes_briefing: string
  monthly_forecast: ForecastPoint[]
  net_worth: number
  total_assets: number
  total_liabilities: number
  last_updated: string
}

export type ScenarioType =
  | 'disney_trip'
  | 'branson_trip'
  | 'arkansas_vacation'
  | 'atv_purchase'
  | 'truck_purchase'
  | 'ashley_quits'
  | 'extra_debt_payment'
  | 'tax_refund'
  | 'refinance_debt'
  | 'emergency_event'
  | 'custom'

export interface ScenarioParams {
  type: ScenarioType
  amount?: number
  duration_months?: number
  income_reduction?: number
  description?: string
  custom_params?: Record<string, unknown>
}

export interface LogicTraceStep {
  step: number
  label: string
  calculation: string
  result: string
  impact: 'positive' | 'negative' | 'neutral'
  detail?: string
}

export type ScenarioVerdict = 'DO_IT' | 'CAUTION' | 'NOT_NOW'

export interface ScenarioResult {
  verdict: ScenarioVerdict
  verdict_reason: string
  cash_impact: number
  cash_impact_percent: number
  emergency_impact: {
    before_months: number
    after_months: number
    delta: number
  }
  debt_timeline_impact: {
    current_payoff_date: string
    new_payoff_date: string
    extra_interest: number
  }
  retirement_impact: {
    fi_date_before: string
    fi_date_after: string
    delta_months: number
  }
  warnings: string[]
  opportunities: string[]
  logic_trace: LogicTraceStep[]
  monthly_cost?: number
  breakeven_date?: string
}

export interface MonteCarloPoint {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  target?: number
}

export type FIREMode = 'lean' | 'coast' | 'fat' | 'barista'

export interface FIREAssumptions {
  annual_expenses: number
  swr: number
  expected_return: number
  inflation_rate: number
  social_security_age: number
  social_security_benefit: number
  fire_age: number
  fire_mode: FIREMode
}

export interface FIREData {
  fi_number: number
  fi_percentage: number
  current_savings: number
  monthly_contribution: number
  estimated_fi_date: string
  years_to_fi: number
  monte_carlo: MonteCarloPoint[]
  fire_mode: FIREMode
  assumptions: FIREAssumptions
  coast_fi_number?: number
  barista_fi_number?: number
  lean_fi_number?: number
  fat_fi_number?: number
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  created_at: string
  context_used?: string[]
  suggested_follow_ups?: string[]
}

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  last_message?: string
}

export interface WealthData {
  net_worth: number
  net_worth_history: NetWorthPoint[]
  total_assets: number
  total_liabilities: number
  asset_allocation: AssetAllocationItem[]
  accounts: Account[]
  debts: Debt[]
  debt_by_category: DebtCategoryItem[]
}

export interface NetWorthPoint {
  date: string
  net_worth: number
  assets: number
  liabilities: number
}

export interface AssetAllocationItem {
  name: string
  value: number
  percentage: number
  color: string
}

export interface DebtCategoryItem {
  name: string
  total: number
  count: number
  avg_apr: number
  color: string
}

export interface TransactionFilters {
  search?: string
  category?: string
  account_id?: string
  date_from?: string
  date_to?: string
  type?: TransactionType
  min_amount?: number
  max_amount?: number
  page?: number
  page_size?: number
}

export interface SpendingTrend {
  month: string
  total: number
  by_category: Record<string, number>
}

export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  family_name?: string
  role: 'admin' | 'member' | 'viewer'
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface UIState {
  sidebarCollapsed: boolean
  activeSection: string
  notifications: Notification[]
}

export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  created_at: string
  read: boolean
}
