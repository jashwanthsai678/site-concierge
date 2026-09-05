import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Badge, PortalButton, PortalCard, PortalPageHeader } from '@/components/portal/PortalUI'
import type { KnowledgeCategory, KnowledgeItemPayload } from '@/types/onboarding'

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  faq: 'FAQ',
  pricing: 'Pricing',
  product: 'Product',
  policy: 'Policy',
}

const CATEGORY_COLOR: Record<KnowledgeCategory, string> = {
  faq: '#3987e5',
  pricing: '#199e70',
  product: '#9085e9',
  policy: '#d95926',
}

export function PortalKnowledgePage() {
  const query = useQuery({ queryKey: ['portal-knowledge'], queryFn: portalApi.listKnowledge })
  const [newItem, setNewItem] = useState<KnowledgeItemPayload>({ category: 'faq', question: '', content: '' })
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [ingestMessage, setIngestMessage] = useState<string | null>(null)
  const [addStatus, setAddStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [addError, setAddError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newItem.content.trim()) return
    setAddStatus('saving')
    setAddError(null)
    try {
      await portalApi.addKnowledge([newItem])
      setNewItem({ category: 'faq', question: '', content: '' })
      await query.refetch()
      setAddStatus('idle')
    } catch (err) {
      setAddStatus('error')
      setAddError(err instanceof Error ? err.message : 'Failed to add this row — please try again.')
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    setDeleteError(null)
    try {
      await portalApi.deleteKnowledgeItem(id)
      await query.refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete this row — please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleIngest = async () => {
    setIngestStatus('running')
    setIngestMessage(null)
    try {
      const result = await portalApi.triggerIngestion(websiteUrl.trim() || undefined)
      setIngestMessage(`${result.chunks_ingested} chunks embedded.`)
      setIngestStatus('done')
    } catch (err) {
      setIngestMessage(err instanceof Error ? err.message : 'Ingestion failed.')
      setIngestStatus('error')
    }
  }

  return (
    <div className="space-y-8">
      <PortalPageHeader
        title="Knowledge"
        description="FAQ, pricing, product, and policy rows the AI can reference — never invents beyond what's here."
      />

      <PortalCard>
        {query.isLoading ? (
          <LoadingSpinner size={20} />
        ) : query.isError ? (
          <p className="text-xs text-red-600">
            Couldn't load your knowledge rows — {query.error instanceof Error ? query.error.message : 'please refresh.'}
          </p>
        ) : (query.data ?? []).length === 0 ? (
          <p className="text-xs text-gray-400">No knowledge rows yet — add one below.</p>
        ) : (
          <div className="space-y-2">
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            {(query.data ?? []).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3 hover:border-gray-200"
              >
                <div>
                  <Badge color={CATEGORY_COLOR[item.category]}>{CATEGORY_LABELS[item.category]}</Badge>
                  {item.question && <p className="mt-1.5 text-sm font-medium text-gray-900">{item.question}</p>}
                  <p className="mt-1 text-sm text-gray-600">{item.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  aria-label="Delete"
                >
                  {deletingId === item.id ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </PortalCard>

      <PortalCard>
        <form onSubmit={handleAdd} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Add a row</h2>
          <div className="flex items-center gap-2">
            <select
              value={newItem.category}
              onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value as KnowledgeCategory }))}
              className="w-32 shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-xs"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              value={newItem.question ?? ''}
              onChange={(e) => setNewItem((prev) => ({ ...prev, question: e.target.value }))}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Question / title (optional)"
            />
          </div>
          <textarea
            value={newItem.content}
            onChange={(e) => setNewItem((prev) => ({ ...prev, content: e.target.value }))}
            rows={2}
            className={INPUT_CLASS}
            placeholder="Answer / content"
          />
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <PortalButton type="submit" disabled={addStatus === 'saving'}>
            {addStatus === 'saving' ? 'Adding…' : 'Add row'}
          </PortalButton>
        </form>
      </PortalCard>

      <PortalCard>
        <h2 className="text-sm font-semibold text-gray-900">Re-run knowledge ingestion</h2>
        <p className="mt-1 text-xs text-gray-500">
          Embeds the rows above (and, if given, a live website) for RAG retrieval. Requires Qdrant to be configured
          on the backend — otherwise this fails with a clear error, and the widget still works without it.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Website URL (optional)" hint="Crawls this site's pages alongside the rows above">
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={INPUT_CLASS}
              placeholder="https://theirsite.com"
            />
          </Field>
          <PortalButton variant="secondary" onClick={handleIngest} disabled={ingestStatus === 'running'}>
            {ingestStatus === 'running' ? 'Running…' : 'Run ingestion'}
          </PortalButton>
          {ingestMessage && (
            <p className={`text-xs font-medium ${ingestStatus === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {ingestMessage}
            </p>
          )}
        </div>
      </PortalCard>
    </div>
  )
}
