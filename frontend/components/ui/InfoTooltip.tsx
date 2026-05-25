'use client'

import * as Tooltip from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  content: string
  size?: number
}

export function InfoTooltip({ content, size = 12 }: InfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
            aria-label="More info"
            type="button"
          >
            <HelpCircle size={size} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="max-w-[220px] bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white/80 text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed z-[100]"
            sideOffset={6}
          >
            {content}
            <Tooltip.Arrow className="fill-gray-900/95" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
