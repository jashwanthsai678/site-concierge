import type { Topic } from '@/lib/topicMatch'

// The 4-step funnel shown to the visitor as a progress indicator. Backend
// stage values (see backend/app/models/conversation.py::Stage) map onto it:
// greeting sits before step 1, objection_handling shares recommendation's
// step (a detour, not a regression — stage_strategy.py is itself monotonic
// so this mapping never needs to move backwards), and booking completes
// step 4.
const STAGE_STEP_INDEX: Record<string, number> = {
  greeting: 0,
  discovery: 1,
  qualification: 2,
  recommendation: 3,
  objection_handling: 3,
  closing: 4,
  booking: 4,
}

export function stepIndexForStage(stage: string): number {
  return STAGE_STEP_INDEX[stage] ?? 0
}

interface StageSuggestion {
  topic: Topic
  label: string
  prompt: string
}

// What the mascot proactively nudges the visitor toward next, keyed by the
// backend's current stage — this is what makes the widget guide instead of
// only reacting to whatever the visitor happens to ask.
const STAGE_SUGGESTION: Record<string, StageSuggestion> = {
  greeting: {
    topic: 'destinations',
    label: 'Curious which countries are popular?',
    prompt: 'Which countries do you place students in?',
  },
  discovery: {
    topic: 'destinations',
    label: 'Curious which countries are popular?',
    prompt: 'Which countries do you place students in?',
  },
  qualification: {
    topic: 'pricing',
    label: 'Want to see our pricing packages?',
    prompt: 'Can you tell me about your pricing?',
  },
  recommendation: {
    topic: 'process',
    label: 'Want to see how the process works, step by step?',
    prompt: 'How does the process work, step by step?',
  },
  objection_handling: {
    topic: 'why-us',
    label: "Not sure yet? Here's why students choose us.",
    prompt: 'Why should I choose you over other consultants?',
  },
  closing: {
    topic: 'testimonials',
    label: "Want to hear from students who've done this before?",
    prompt: 'Can you share some student testimonials?',
  },
}

/** Returns null once the suggested topic has already been covered (visited) — a suggestion should never repeat itself. */
export function suggestionForStage(stage: string, visited: ReadonlySet<Topic>): StageSuggestion | null {
  const suggestion = STAGE_SUGGESTION[stage]
  if (!suggestion || visited.has(suggestion.topic)) return null
  return suggestion
}
