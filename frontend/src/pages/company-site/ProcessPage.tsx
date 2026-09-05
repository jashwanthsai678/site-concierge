import { useOutletContext } from 'react-router-dom'
import type { CompanySiteContext } from '@/pages/CompanyWebsiteLayout'
import { Highlightable } from '@/components/company-site/Highlightable'

const PROCESS = [
  { id: 'step-1', step: '1', title: 'Free Consultation', blurb: 'Share your goals, budget, and background with a counselor.' },
  { id: 'step-2', step: '2', title: 'Shortlisting', blurb: 'We match you to universities that fit your profile and budget.' },
  { id: 'step-3', step: '3', title: 'Application & Documentation', blurb: 'We handle forms, SOPs, and recommendation letters end-to-end.' },
  { id: 'step-4', step: '4', title: 'Visa Filing', blurb: 'Complete visa documentation plus mock interview preparation.' },
  { id: 'step-5', step: '5', title: 'Fly & Settle', blurb: 'Pre-departure briefing and support once you land.' },
]

export function ProcessPage() {
  const { business } = useOutletContext<CompanySiteContext>()

  return (
    <section className="px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">How It Works</h2>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-5">
        {PROCESS.map((p) => (
          <Highlightable key={p.id} id={p.id}>
            <div className="p-2 text-center">
              <div
                className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: business.branding_color }}
              >
                {p.step}
              </div>
              <p className="font-semibold text-gray-900">{p.title}</p>
              <p className="mt-1 text-xs text-gray-500">{p.blurb}</p>
            </div>
          </Highlightable>
        ))}
      </div>
    </section>
  )
}
