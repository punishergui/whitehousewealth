'use client'

const SUGGESTED_QUESTIONS = [
  'Can we afford Disney this summer?',
  'What debt should we pay first?',
  "Why is spending high this month?",
  'How do we retire 5 years earlier?',
  'What if Ashley quits her job?',
  'How should we use our tax refund?',
  "What's our safe-to-spend this week?",
  'Am I on track for FIRE?',
]

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => !disabled && onSelect(q)}
            disabled={disabled}
            className="flex-shrink-0 text-xs px-3.5 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70 hover:border-white/[0.14] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
