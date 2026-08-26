const WHY_US = [
  'End-to-end visa filing and mock interview prep',
  'Merit & need-based scholarship guidance at no extra cost',
  'Shortlisting to offer letter in as little as 8 weeks',
  'Dedicated regional counselors for every destination',
]

export function WhyUsPage() {
  return (
    <section className="px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Why Choose Us</h2>
      <ul className="mx-auto max-w-2xl space-y-3">
        {WHY_US.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
            <span className="mt-0.5 text-green-600">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
