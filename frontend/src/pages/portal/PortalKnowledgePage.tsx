import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/services/portalApi'
import { ACCENT } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { KnowledgeCategory, KnowledgeItemPayload } from '@/types/onboarding'

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  faq: 'FAQ',
  pricing: 'Pricing',
  product: 'Product',
  policy: 'Policy',
}

export function PortalKnowledgePage() {
  const query = useQuery({ queryKey: ['portal-knowledge'], queryFn: portalApi.listKnowledge })
  const [newItem, setNewItem] = useState<KnowledgeItemPayload>({ category: 'faq', question: '', content: '' })
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [ingestStatus, setIngestStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [ingestMessage, setIngestMessage] = useState<string | null>(null)

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newItem.content.trim()) return
    await portalApi.addKnowledge([newItem])
    setNewItem({ category: 'faq', question: '', content: '' })
    query.refetch()
  }

  const handleDelete = async (id: number) => {
    await portalApi.deleteKnowledgeItem(id)
    query.refetch()
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
      <div>
        <h1 className="text-xl font-bold text-gray-900">Knowledge</h1>
        <p className="mt-1 text-sm text-gray-500">
          FAQ, pricing, product, and policy rows the AI can reference — never invents beyond what's here.
        </p>
      </div>

      {query.isLoading ? (
        <LoadingSpinner size={20} />
      ) : (
        <div className="space-y-2">
          {(query.data ?? []).length === 0 && <p className="text-xs text-gray-400">No knowledge rows yet.</p>}
          {(query.data ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {CATEGORY_LABELS[item.category]}
                </p>
                {item.question && <p className="mt-1 text-sm font-medium text-gray-900">{item.question}</p>}
                <p className="mt-1 text-sm text-gray-600">{item.content}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="shrink-0 text-gray-400 hover:text-red-500"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-gray-200 p-3">
        <h2 className="text-sm font-semibold text-gray-900">Add a row</h2>
        <div className="flex items-center gap-2">
          <select
            value={newItem.category}
            onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value as KnowledgeCategory }))}
            className="flex-none w-28 rounded-lg border border-gray-300 px-2 py-2 text-xs"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            value={newItem.question ?? ''}
            onChange={(e) => setNewItem((prev) => ({ ...prev, question: e.target.value }))}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-2 text-xs"
            placeholder="Question / title (optional)"
          />
        </div>
        <textarea
          value={newItem.content}
          onChange={(e) => setNewItem((prev) => ({ ...prev, content: e.target.value }))}
          rows={2}
          className={`${INPUT_CLASS} text-xs`}
          placeholder="Answer / content"
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Add row
        </button>
      </form>

      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
        <h2 className="text-sm font-semibold text-gray-900">Re-run knowledge ingestion</h2>
        <p className="text-xs text-gray-500">
          Embeds the rows above (and, if given, a live website) for RAG retrieval. Requires Qdrant to be configured
          on the backend — otherwise this fails with a clear error, and the widget still works without it.
        </p>
        <Field label="Website URL (optional)" hint="Crawls this site's pages alongside the rows above">
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className={INPUT_CLASS}
            placeholder="https://theirsite.com"
          />
        </Field>
        <button
          type="button"
          onClick={handleIngest}
          disabled={ingestStatus === 'running'}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
        >
          {ingestStatus === 'running' ? 'Running…' : 'Run ingestion'}
        </button>
        {ingestMessage && (
          <p className={`text-xs ${ingestStatus === 'error' ? 'text-red-600' : 'text-green-600'}`}>{ingestMessage}</p>
        )}
      </div>
    </div>
  )
}
