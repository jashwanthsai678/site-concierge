// Mirrors backend/app/voice/ws_protocol.py — keep these in sync by hand;
// the envelope shape and event names are the contract both sides agree on.

export type ServerEventType =
  | 'greeting'
  | 'assistant_chunk'
  | 'assistant_done'
  | 'lead_update'
  | 'stage_change'
  | 'error'
  | 'conversation_end'

export type ClientEventType = 'client_ready' | 'user_utterance' | 'heartbeat' | 'end_conversation'

export interface WSEnvelope<T = unknown> {
  type: ServerEventType
  data: T
  seq: number
  ts: string
}

export interface GreetingData {
  text: string
}

export interface AssistantChunkData {
  text: string
  chunk_index: number
  is_sentence_boundary: boolean
}

export interface AssistantDoneData {
  full_text: string
  stage: string
}

export interface LeadFieldsData {
  name: string | null
  phone: string | null
  email: string | null
  budget: string | null
  location: string | null
  intent: string | null
}

export interface LeadUpdateData {
  fields: LeadFieldsData
  intent_score: number
  lead_score: number
  category: 'Hot' | 'Warm' | 'Cold'
  stage: string
}

export interface DashboardLeadUpdateData extends LeadUpdateData {
  lead_id: number
  business_id: number
  conversation_id: number
}

export interface StageChangeData {
  from_stage: string
  to_stage: string
}

export interface ErrorData {
  code: string
  message: string
}

export interface ConversationEndData {
  reason: 'completed' | 'timeout' | 'visitor_left'
  lead_id: number | null
}

export type TranscriptRole = 'assistant' | 'visitor'

export interface TranscriptEntry {
  id: string
  role: TranscriptRole
  text: string
}
