import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { portalApi } from '@/services/portalApi'
import { ACCENT } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { AnimatedCharacter } from '@/components/voice/AnimatedCharacter'
import { SpeechBubble } from '@/components/voice/SpeechBubble'
import { MASCOT_OPTIONS, MASCOT_ENERGY_OPTIONS, type MascotEnergy } from '@/lib/mascotRegistry'
import type { PortalContext } from '@/pages/portal/PortalLayout'

const PERSONA_EXAMPLE =
  'You are Maya, a warm and knowledgeable fitness consultant at Acme Fitness Studio. Your main focus is ' +
  'understanding what the visitor wants to achieve (weight loss, strength, a specific event) and guiding them ' +
  'toward booking a free trial class — never toward answering questions and stopping there.'

export function PortalBotSetupPage() {
  const { business, refetchBusiness } = useOutletContext<PortalContext>()
  const [persona, setPersona] = useState(business.persona_description)
  const [greeting, setGreeting] = useState(business.greeting_template)
  const [mascotKey, setMascotKey] = useState(business.mascot_key)
  const [energy, setEnergy] = useState<MascotEnergy>((business.mascot_energy as MascotEnergy) ?? 'balanced')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      await portalApi.updateMe({
        persona_description: persona,
        greeting_template: greeting,
        mascot_key: mascotKey,
        mascot_energy: energy,
      })
      refetchBusiness()
      setStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bot Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          What your bot mainly focuses on, how it greets visitors, and how it looks and moves while talking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Field
            label="What should your bot mainly focus on?"
            hint="Its name, tone, and — most importantly — the ONE outcome every conversation should steer toward (a booking, a trial, a call)."
          >
            <textarea
              rows={5}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className={INPUT_CLASS}
              placeholder={PERSONA_EXAMPLE}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Example: <span className="italic">"{PERSONA_EXAMPLE}"</span>
            </p>
          </Field>

          <Field label="Greeting" hint="The first thing a visitor sees — keep it short and casual, not a paragraph.">
            <textarea
              rows={2}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Mascot">
            <div className="flex flex-wrap gap-2">
              {MASCOT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMascotKey(option.key)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium"
                  style={
                    mascotKey === option.key
                      ? { borderColor: ACCENT, color: ACCENT, backgroundColor: `${ACCENT}14` }
                      : { borderColor: '#e5e7eb', color: '#374151' }
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">More characters land here as they're added — this is a registry, not a fixed list.</p>
          </Field>

          <Field label="Expression / energy" hint="How lively the mascot's movement is — the same character, moving differently.">
            <div className="grid grid-cols-3 gap-2">
              {MASCOT_ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setEnergy(option.key)}
                  className="rounded-lg border px-3 py-2 text-left"
                  style={
                    energy === option.key
                      ? { borderColor: ACCENT, backgroundColor: `${ACCENT}14` }
                      : { borderColor: '#e5e7eb' }
                  }
                >
                  <span
                    className="block text-sm font-medium"
                    style={{ color: energy === option.key ? ACCENT : '#374151' }}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-gray-400">{option.hint}</span>
                </button>
              ))}
            </div>
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          {status === 'saved' && <p className="text-xs text-green-600">Saved.</p>}

          <button
            type="submit"
            disabled={status === 'saving'}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Live preview</p>
          <div className="flex h-72 flex-col items-center justify-end gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <SpeechBubble text={greeting || 'Your greeting will show here.'} />
            <AnimatedCharacter state="idle" mascotKey={mascotKey} energy={energy} compact />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Unsaved changes preview instantly here — nothing goes live until you save.
          </p>
        </div>
      </div>
    </div>
  )
}
