export interface LeadRead {
  id: number
  conversation_id: number
  name: string | null
  phone: string | null
  email: string | null
  budget: string | null
  location: string | null
  intent: string | null
  intent_score: number
  lead_score: number
  category: 'Hot' | 'Warm' | 'Cold'
  summary: string
  next_action: string
  status: 'new' | 'contacted' | 'qualified' | 'booked' | 'lost'
  created_at: string
}
