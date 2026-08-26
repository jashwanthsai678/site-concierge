const TESTIMONIALS = [
  { name: 'Ananya R.', quote: "They handled my entire Canada application — I didn't have to chase anything myself." },
  { name: 'Rohit K.', quote: 'Got a partial scholarship I didn\'t even know I was eligible for. Highly recommend.' },
]

export function TestimonialsPage() {
  return (
    <section className="bg-gray-50 px-6 py-16 sm:px-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">What Our Students Say</h2>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm italic text-gray-600">"{t.quote}"</p>
            <p className="mt-3 text-xs font-semibold text-gray-800">{t.name}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
