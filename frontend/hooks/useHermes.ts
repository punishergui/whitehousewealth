'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hermesApi } from '@/lib/api'
import type { ChatMessage } from '@/types'
import { useState, useCallback } from 'react'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => hermesApi.getConversations(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useHermesChat(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const queryClient = useQueryClient()

  // Load initial messages
  const { isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const msgs = await hermesApi.getMessages(conversationId)
      setMessages(msgs)
      return msgs
    },
    enabled: !!conversationId,
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsTyping(true)

      const response = await hermesApi.sendMessage(conversationId, content)
      return response
    },
    onSuccess: (aiMessage) => {
      setIsTyping(false)
      setMessages((prev) => [...prev, aiMessage])
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: () => {
      setIsTyping(false)
    },
  })

  const startNewConversation = useCallback(async () => {
    const conv = await hermesApi.createConversation('New Conversation')
    setConversationId(conv.id)
    setMessages([])
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    return conv
  }, [queryClient])

  return {
    conversationId,
    messages,
    isTyping,
    isLoadingMessages,
    sendMessage: (content: string) => sendMutation.mutate(content),
    isSending: sendMutation.isPending,
    startNewConversation,
    setConversationId,
  }
}
