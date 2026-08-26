import { useEffect, useRef } from 'react'
import type { TranscriptEntry } from '@/types/conversation'

export function TranscriptPanel({ entries }: { entries: TranscriptEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries])

  return (
    <div className="flex min-h-full flex-col gap-2 px-1 py-2">
      {entries.map((entry) => (
        <div key={entry.id} className={`flex ${entry.role === 'visitor' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
              entry.role === 'visitor' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {entry.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
