import { Highlightable } from '@/components/company-site/Highlightable'

const FAQS = [
  { id: 'faq-timeline', q: 'How long does the process take?', a: 'Typically 8-12 weeks from shortlisting to offer letter, depending on the destination.' },
  { id: 'faq-documents', q: 'What documents do I need?', a: 'Academic transcripts, passport, English proficiency scores, and a statement of purpose.' },
  { id: 'faq-scholarship', q: 'Do you help with scholarships?', a: 'Yes — we screen every applicant for merit and need-based scholarships at no extra cost.' },
  { id: 'faq-visa-rejected', q: 'What if my visa gets rejected?', a: 'We offer free re-filing support and additional mock interview prep to maximize approval chances.' },
]

export function FaqPage() {
  return (
    <section className="bg-gray-50 px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
      <div className="mx-auto max-w-2xl space-y-4">
        {FAQS.map((f) => (
          <Highlightable key={f.id} id={f.id}>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="font-semibold text-gray-900">{f.q}</p>
              <p className="mt-1 text-sm text-gray-500">{f.a}</p>
            </div>
          </Highlightable>
        ))}
      </div>
    </section>
  )
}
