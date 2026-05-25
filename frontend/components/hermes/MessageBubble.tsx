'use client'

import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatters'
import type { ChatMessage } from '@/types'

function parseBasicMarkdown(text: string): string {
  return text
    // Code blocks
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```[a-z]*\n?/, '').replace(/```$/, '')
      return `<pre class="bg-black/30 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-white/10"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-blue-300">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em class="italic text-white/80">$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-blue-400 mt-0.5 flex-shrink-0">•</span><span>$1</span></li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="space-y-1 my-2">${match}</ul>`)
    // Line breaks
    .replace(/\n\n/g, '<br class="my-2" />')
    .replace(/\n/g, '<br />')
}

interface MessageBubbleProps {
  message: ChatMessage
  userInitials?: string
}

export function MessageBubble({ message, userInitials = 'JW' }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            {userInitials}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Bot size={16} className="text-cyan-400" />
          </div>
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-600/30 border border-blue-500/25 text-white rounded-tr-sm'
              : 'bg-white/[0.04] border border-white/[0.08] text-white/80 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div
              className="prose-sm space-y-1"
              dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(message.content) }}
            />
          )}
        </div>

        <span className="text-[10px] text-white/20 px-1">
          {formatRelativeTime(message.created_at)}
        </span>

        {/* Suggested follow-ups */}
        {!isUser && message.suggested_follow_ups && message.suggested_follow_ups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {message.suggested_follow_ups.map((q, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 cursor-pointer hover:bg-white/[0.08] hover:text-white/60 transition-all"
              >
                {q}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
