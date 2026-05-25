// ============================================================
// WHITE HOUSE WEALTH OS — API Client
// ============================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type {
  DashboardData,
  WealthData,
  Transaction,
  TransactionFilters,
  ScenarioParams,
  ScenarioResult,
  FIREData,
  FIREAssumptions,
  ChatMessage,
  Conversation,
  Account,
  Budget,
  SpendingTrend,
  NetWorthPoint,
} from '@/types'
import {
  MOCK_DASHBOARD_DATA,
  MOCK_WEALTH_DATA,
  MOCK_TRANSACTIONS,
  MOCK_BUDGETS,
  MOCK_SPENDING_TRENDS,
  MOCK_FIRE_DATA,
  MOCK_SCENARIO_RESULT,
  MOCK_CHAT_MESSAGES,
  MOCK_CONVERSATIONS,
} from './mockData'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true

// ─── Axios Instance ───────────────────────────────────────

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor: inject auth token
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('whwos_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  })

  // Response interceptor: handle 401s
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('whwos_token')
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }
  )

  return instance
}

const apiClient = createAxiosInstance()

// ─── Generic fetch wrapper ────────────────────────────────

async function fetchWithAuth<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request<T>({
    url,
    ...config,
  })
  return response.data
}

// ─── Mock delay helper ────────────────────────────────────

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withMockFallback<T>(
  apiFn: () => Promise<T>,
  mockFn: () => T,
  mockDelay: number = 600
): Promise<T> {
  if (USE_MOCK) {
    await delay(mockDelay)
    return mockFn()
  }
  try {
    return await apiFn()
  } catch {
    await delay(mockDelay)
    return mockFn()
  }
}

// ─── Auth ─────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    return withMockFallback(
      () => fetchWithAuth<{ token: string; user: { id: string; name: string; email: string } }>('/auth/login', {
        method: 'POST',
        data: { email, password },
      }),
      () => ({
        token: 'mock_jwt_token_whwos',
        user: { id: 'user_1', name: 'Josh White', email },
      }),
      1000
    )
  },

  logout: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('whwos_token')
    }
  },

  me: async () => {
    return withMockFallback(
      () => fetchWithAuth<{ id: string; name: string; email: string }>('/auth/me'),
      () => ({ id: 'user_1', name: 'Josh White', email: 'josh@whitehouse.com' })
    )
  },
}

// ─── Dashboard ────────────────────────────────────────────

export const dashboardApi = {
  getDashboardData: (): Promise<DashboardData> =>
    withMockFallback(
      () => fetchWithAuth<DashboardData>('/api/v1/dashboard'),
      () => MOCK_DASHBOARD_DATA
    ),
}

// ─── Wealth ───────────────────────────────────────────────

export const wealthApi = {
  getWealthData: (): Promise<WealthData> =>
    withMockFallback(
      () => fetchWithAuth<WealthData>('/api/v1/wealth'),
      () => MOCK_WEALTH_DATA
    ),

  getNetWorthHistory: (months: number = 12): Promise<NetWorthPoint[]> =>
    withMockFallback(
      () => fetchWithAuth<NetWorthPoint[]>(`/api/v1/wealth/net-worth-history?months=${months}`),
      () => MOCK_WEALTH_DATA.net_worth_history
    ),

  getAccounts: (): Promise<Account[]> =>
    withMockFallback(
      () => fetchWithAuth<Account[]>('/api/v1/accounts'),
      () => MOCK_WEALTH_DATA.accounts
    ),
}

// ─── Transactions ─────────────────────────────────────────

export const transactionsApi = {
  getTransactions: (filters?: TransactionFilters): Promise<{ transactions: Transaction[]; total: number }> =>
    withMockFallback(
      () => {
        const params = new URLSearchParams()
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) params.set(key, String(value))
          })
        }
        return fetchWithAuth<{ transactions: Transaction[]; total: number }>(
          `/api/v1/transactions?${params.toString()}`
        )
      },
      () => ({ transactions: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length })
    ),

  searchTransactions: (query: string): Promise<Transaction[]> =>
    withMockFallback(
      () => fetchWithAuth<Transaction[]>(`/api/v1/transactions/search?q=${encodeURIComponent(query)}`),
      () => MOCK_TRANSACTIONS.filter((t) =>
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.merchant_name.toLowerCase().includes(query.toLowerCase()) ||
        t.category.toLowerCase().includes(query.toLowerCase())
      )
    ),

  getBudgets: (): Promise<Budget[]> =>
    withMockFallback(
      () => fetchWithAuth<Budget[]>('/api/v1/budgets'),
      () => MOCK_BUDGETS
    ),

  getSpendingTrends: (months: number = 6): Promise<SpendingTrend[]> =>
    withMockFallback(
      () => fetchWithAuth<SpendingTrend[]>(`/api/v1/spending/trends?months=${months}`),
      () => MOCK_SPENDING_TRENDS
    ),
}

// ─── Scenarios ────────────────────────────────────────────

export const scenariosApi = {
  runScenario: (params: ScenarioParams): Promise<ScenarioResult> =>
    withMockFallback(
      () => fetchWithAuth<ScenarioResult>('/api/v1/scenarios/run', {
        method: 'POST',
        data: params,
      }),
      () => ({
        ...MOCK_SCENARIO_RESULT,
        cash_impact: -(params.amount ?? 6500),
      }),
      2000
    ),
}

// ─── FIRE ─────────────────────────────────────────────────

export const fireApi = {
  getFIREData: (): Promise<FIREData> =>
    withMockFallback(
      () => fetchWithAuth<FIREData>('/api/v1/fire'),
      () => MOCK_FIRE_DATA
    ),

  updateFIREAssumptions: (assumptions: Partial<FIREAssumptions>): Promise<FIREData> =>
    withMockFallback(
      () => fetchWithAuth<FIREData>('/api/v1/fire/assumptions', {
        method: 'PUT',
        data: assumptions,
      }),
      () => ({
        ...MOCK_FIRE_DATA,
        assumptions: { ...MOCK_FIRE_DATA.assumptions, ...assumptions },
      }),
      800
    ),
}

// ─── Hermes AI ────────────────────────────────────────────

export const hermesApi = {
  getConversations: (): Promise<Conversation[]> =>
    withMockFallback(
      () => fetchWithAuth<Conversation[]>('/api/v1/hermes/conversations'),
      () => MOCK_CONVERSATIONS
    ),

  getMessages: (conversationId: string): Promise<ChatMessage[]> =>
    withMockFallback(
      () => fetchWithAuth<ChatMessage[]>(`/api/v1/hermes/conversations/${conversationId}/messages`),
      () => MOCK_CHAT_MESSAGES
    ),

  sendMessage: async (conversationId: string | null, message: string): Promise<ChatMessage> => {
    return withMockFallback(
      () => fetchWithAuth<ChatMessage>('/api/v1/hermes/chat', {
        method: 'POST',
        data: { conversation_id: conversationId, message },
      }),
      () => ({
        id: `msg_${Date.now()}`,
        role: 'assistant' as const,
        content: `I'm processing your question: "${message}"\n\nBased on your financial data, here's my analysis...\n\n*[This is a demo response. Connect to the backend for real AI responses.]*`,
        created_at: new Date().toISOString(),
        suggested_follow_ups: [
          'Tell me more',
          'What should I do next?',
          'How does this affect my FIRE date?',
        ],
      }),
      1500
    )
  },

  createConversation: (title: string): Promise<Conversation> =>
    withMockFallback(
      () => fetchWithAuth<Conversation>('/api/v1/hermes/conversations', {
        method: 'POST',
        data: { title },
      }),
      () => ({
        id: `conv_${Date.now()}`,
        title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
      })
    ),
}


// ─── Bills ─────────────────────────────────────────────────────────────────────

export const billsApi = {
  getBills: (): Promise<import("@/types").Bill[]> =>
    withMockFallback(
      () => fetchWithAuth<import("@/types").Bill[]>('/bills'),
      () => []
    ),

  markAsPaid: (id: string): Promise<void> =>
    withMockFallback(
      () => fetchWithAuth<void>(`/bills/${id}/mark-paid`, { method: 'POST' }),
      () => undefined
    ),
}

export default apiClient
