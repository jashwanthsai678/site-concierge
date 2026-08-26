import { LeadCard } from '@/components/dashboard/LeadCard'
import type { LeadRead } from '@/types/lead'

const COLUMNS: { status: LeadRead['status']; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'qualified', label: 'Qualified' },
  { status: 'booked', label: 'Booked' },
  { status: 'lost', label: 'Lost' },
]

export function LeadPipeline({
  leads,
  onStatusChange,
}: {
  leads: LeadRead[]
  onStatusChange: (leadId: number, status: LeadRead['status']) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.status)
        return (
          <div key={col.status} className="min-w-[220px]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{col.label}</p>
              <span className="text-xs text-white/30">{columnLeads.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {columnLeads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/30">
                  No leads
                </p>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onStatusChange={(status) => onStatusChange(lead.id, status)} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
