import { Highlightable } from '@/components/company-site/Highlightable'

const WHY_US = [
  { id: 'why-visa', text: 'End-to-end visa filing and mock interview prep' },
  { id: 'why-scholarship', text: 'Merit & need-based scholarship guidance at no extra cost' },
  { id: 'why-speed', text: 'Shortlisting to offer letter in as little as 8 weeks' },
  { id: 'why-counselors', text: 'Dedicated regional counselors for every destination' },
]

export function WhyUsPage() {
  return (
    <section className="px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Why Choose Us</h2>
      <div className="mx-auto max-w-2xl space-y-3">
        {WHY_US.map((item) => (
          <Highlightable key={item.id} id={item.id}>
            <div className="flex items-start gap-3 px-3 py-2 text-sm text-gray-600">
              <span className="mt-0.5 text-green-600">✓</span>
              {item.text}
            </div>
          </Highlightable>
        ))}
      </div>
    </section>
  )
}
