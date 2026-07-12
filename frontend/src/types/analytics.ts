export interface DashboardSummary {
  visitors_today: number
  conversations_today: number
  qualified_leads_today: number
  booked_meetings_today: number
  avg_conversation_seconds: number | null
}

export interface FunnelCounts {
  visitors: number
  conversations: number
  qualified_leads: number
  booked_meetings: number
}

export interface ConversationRead {
  id: number
  visitor_id: number
  current_stage: string
  turn_count: number
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  ended_at: string | null
}

export interface MessageRead {
  role: 'user' | 'assistant'
  content: string
  sequence_number: number
  created_at: string
}
