'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Plus, Bot } from 'lucide-react'
import { MessageBubble } from './MessageBubble'
import { SuggestedQuestions } from './SuggestedQuestions'
import { useHermesChat } from '@/hooks/useHermes'
import { MOCK_CHAT_MESSAGES } from '@/lib/mockData'

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Bot size={16} className="text-cyan-400" />
      </div>
      <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function ChatInterface() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isTyping,
    sendMessage,
    isSending,
    startNewConversation,
  } = useHermesChat()

  // Use mock messages if no real messages yet
  const displayMessages = messages.length === 0 ? MOCK_CHAT_MESSAGES : messages

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages, isTyping])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return
    sendMessage(trimmed)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionSelect = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
        {/* Header inside chat area */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]">
              <div className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
            <span className="text-xs text-white/40">Hermes AI is online</span>
          </div>
          <button
            onClick={() => startNewConversation()}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/[0.07]"
          >
            <Plus size={12} />
            New chat
          </button>
        </div>

        <AnimatePresence initial={false}>
          {displayMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl p-4">
        {/* Suggested questions */}
        <div className="mb-3">
          <SuggestedQuestions
            onSelect={handleSuggestionSelect}
            disabled={isSending}
          />
        </div>

        {/* Text input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Hermes anything about your finances..."
              rows={1}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 transition-colors resize-none min-h-[48px] max-h-[120px] leading-relaxed"
              style={{ overflowY: 'auto' }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send size={16} />
          </motion.button>
        </div>

        <p className="text-[10px] text-white/15 text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
