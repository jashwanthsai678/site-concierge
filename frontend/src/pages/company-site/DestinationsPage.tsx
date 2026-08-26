const DESTINATIONS = [
  { country: 'USA', blurb: 'STEM & Business Master\'s, strong OPT pathways.' },
  { country: 'UK', blurb: '1-year Master\'s programs, fast return on investment.' },
  { country: 'Canada', blurb: 'PR-friendly programs, co-op work terms.' },
  { country: 'Australia', blurb: 'January & July intakes, post-study work visa.' },
]

export function DestinationsPage() {
  return (
    <section className="px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Popular Destinations</h2>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {DESTINATIONS.map((d) => (
          <div key={d.country} className="rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-semibold text-gray-900">{d.country}</p>
            <p className="mt-1 text-sm text-gray-500">{d.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
