export type Topic = 'destinations' | 'pricing' | 'why-us' | 'testimonials' | 'process' | 'faq'

// Simple, no-backend-changes-needed keyword matching on the assistant's
// reply text. A host page maps each topic to its own section id (it owns
// its DOM, the widget shouldn't assume it) — see VoiceWidget's
// `onTopicMatch` prop and CompanyWebsitePage's usage of it.
//
// Keywords are scored, not first-match — a reply mentioning "up to 6
// universities" in a pricing sentence shouldn't out-vote "pricing" just
// because "universities" is technically a destinations-adjacent word.
// Generic words that show up incidentally across topics (e.g. "budget",
// which the AI also uses when just ASKING about the visitor's budget, not
// stating a price) are deliberately left out.
const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  destinations: ['country', 'countries', 'destination', 'usa', 'united states', 'uk', 'canada', 'australia', 'germany', 'intake'],
  pricing: ['price', 'pricing', 'cost', 'fee', 'package', 'inr', '₹'],
  'why-us': ['scholarship', 'visa', 'why choose', 'guarantee', 'mock interview'],
  testimonials: ['testimonial', 'review', 'success stor', 'student said', 'placed'],
  process: ['process', 'how it works', 'timeline', 'step by step', 'application process', 'roadmap'],
  faq: ['faq', 'frequently asked', 'common question', 'documents required', 'processing time'],
}

export function matchTopic(text: string): Topic | null {
  const lower = text.toLowerCase()

  let bestTopic: Topic | null = null
  let bestScore = 0

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as [Topic, string[]][]) {
    const score = keywords.reduce((count, k) => count + (lower.includes(k) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestTopic = topic
    }
  }

  return bestTopic
}
