import { useOutletContext } from 'react-router-dom'
import type { CompanySiteContext } from '@/pages/CompanyWebsiteLayout'
import { Highlightable } from '@/components/company-site/Highlightable'

const PRICING = [
  { id: 'counseling-package', name: 'Counseling & Application Package', price: 'INR 45,000', blurb: 'Full-service counseling, shortlisting, and filing for up to 6 universities.' },
  { id: 'visa-addon', name: 'Visa Filing Add-on', price: 'INR 15,000', blurb: 'End-to-end visa documentation and mock interview prep.' },
]

export function PricingPage() {
  const { business } = useOutletContext<CompanySiteContext>()

  return (
    <section className="bg-gray-50 px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Pricing</h2>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        {PRICING.map((p) => (
          <Highlightable key={p.id} id={p.id}>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="font-semibold text-gray-900">{p.name}</p>
              <p className="mt-1 text-lg font-bold" style={{ color: business.branding_color }}>{p.price}</p>
              <p className="mt-1 text-sm text-gray-500">{p.blurb}</p>
            </div>
          </Highlightable>
        ))}
      </div>
    </section>
  )
}
