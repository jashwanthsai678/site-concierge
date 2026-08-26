import { Badge } from '@/components/common/Badge'
import { LEAD_CATEGORY_COLOR } from '@/lib/palette'
import type { LeadRead } from '@/types/lead'

export function LeadCard({ lead, onStatusChange }: { lead: LeadRead; onStatusChange: (status: LeadRead['status']) => void }) {
  const color = LEAD_CATEGORY_COLOR[lead.category]

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{lead.name ?? 'Unnamed visitor'}</p>
          <p className="text-xs text-white/50">{lead.phone ?? lead.email ?? 'No contact yet'}</p>
        </div>
        <Badge color={color}>
          {lead.category} · {lead.lead_score}
        </Badge>
      </div>

      {lead.intent && <p className="mt-3 text-xs text-white/70">{lead.intent}</p>}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
        {lead.location && <span className="rounded-full bg-white/5 px-2 py-0.5">{lead.location}</span>}
        {lead.budget && <span className="rounded-full bg-white/5 px-2 py-0.5">{lead.budget}</span>}
      </div>

      {lead.summary && <p className="mt-3 text-xs italic text-white/40">{lead.summary}</p>}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60">{lead.next_action}</span>
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(e.target.value as LeadRead['status'])}
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="booked">Booked</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>
  )
}
