import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { portalApi } from '@/services/portalApi'
import { ACCENT, ACCENT_TEXT } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { AnimatedCharacter } from '@/components/voice/AnimatedCharacter'
import { SpeechBubble } from '@/components/voice/SpeechBubble'
import { PortalButton, PortalCard, PortalPageHeader, PreviewFrame } from '@/components/portal/PortalUI'
import { MASCOT_OPTIONS, MASCOT_ENERGY_OPTIONS, type MascotEnergy } from '@/lib/mascotRegistry'
import type { PortalContext } from '@/pages/portal/PortalLayout'

const PERSONA_EXAMPLE =
  'You are Maya, a warm and knowledgeable fitness consultant at Acme Fitness Studio. Your main focus is ' +
  'understanding what the visitor wants to achieve (weight loss, strength, a specific event) and guiding them ' +
  'toward booking a free trial class — never toward answering questions and stopping there.'

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 3 * 1024 * 1024

export function PortalBotSetupPage() {
  const { business, refetchBusiness } = useOutletContext<PortalContext>()
  const [persona, setPersona] = useState(business.persona_description)
  const [greeting, setGreeting] = useState(business.greeting_template)
  const [mascotKey, setMascotKey] = useState(business.mascot_key)
  const [energy, setEnergy] = useState<MascotEnergy>((business.mascot_energy as MascotEnergy) ?? 'balanced')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [customImageUrl, setCustomImageUrl] = useState(business.mascot_image_url)
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageStatus('error')
      setImageError('Only PNG, JPEG, or WebP images are accepted.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageStatus('error')
      setImageError('Image must be under 3MB.')
      return
    }

    setImageStatus('uploading')
    setImageError(null)
    try {
      const updated = await portalApi.uploadMascotImage(file)
      setCustomImageUrl(updated.mascot_image_url)
      refetchBusiness()
      setImageStatus('idle')
    } catch (err) {
      setImageStatus('error')
      setImageError(err instanceof Error ? err.message : 'Upload failed.')
    }
  }

  const handleRemoveImage = async () => {
    setImageStatus('uploading')
    setImageError(null)
    try {
      await portalApi.removeMascotImage()
      setCustomImageUrl(null)
      refetchBusiness()
      setImageStatus('idle')
    } catch (err) {
      setImageStatus('error')
      setImageError(err instanceof Error ? err.message : 'Failed to remove image.')
    }
  }

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
      <PortalPageHeader
        title="Bot Setup"
        description="What your bot mainly focuses on, how it greets visitors, and how it looks and moves while talking."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <PortalCard className="space-y-5">
            <SectionLabel>Focus &amp; personality</SectionLabel>
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
              <p className="mt-1.5 text-[11px] text-gray-400">
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
          </PortalCard>

          <PortalCard className="space-y-5">
            <SectionLabel>Character</SectionLabel>

            <Field label="Mascot image" hint="Bring your own character art — used instead of the built-in mascot, everywhere the widget renders.">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handleImageSelected}
                className="hidden"
              />
              {customImageUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={customImageUrl}
                    alt="Your uploaded mascot"
                    className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                  />
                  <div className="flex flex-col items-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageStatus === 'uploading'}
                      className="text-xs font-semibold disabled:opacity-50"
                      style={{ color: ACCENT_TEXT }}
                    >
                      Replace image
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={imageStatus === 'uploading'}
                      className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Remove — use a built-in mascot instead
                    </button>
                  </div>
                </div>
              ) : (
                <PortalButton
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageStatus === 'uploading'}
                >
                  {imageStatus === 'uploading' ? 'Uploading…' : 'Upload an image'}
                </PortalButton>
              )}
              {imageError && <p className="mt-1.5 text-[11px] text-red-600">{imageError}</p>}
              <p className="mt-1.5 text-[11px] text-gray-400">PNG, JPEG, or WebP, up to 3MB.</p>
            </Field>

            <Field label="Built-in mascot" hint={customImageUrl ? 'Not used while a custom image is uploaded above.' : undefined}>
              <div className="flex flex-wrap gap-2">
                {MASCOT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMascotKey(option.key)}
                    disabled={Boolean(customImageUrl)}
                    aria-pressed={mascotKey === option.key}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    style={
                      mascotKey === option.key
                        ? { borderColor: ACCENT, color: ACCENT_TEXT, backgroundColor: `${ACCENT}12` }
                        : { borderColor: '#e5e7eb', color: '#374151' }
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                More characters land here as they're added — this is a registry, not a fixed list.
              </p>
            </Field>

            <Field label="Expression / energy" hint="How lively the mascot's movement is — the same character, moving differently.">
              <div className="grid grid-cols-3 gap-2">
                {MASCOT_ENERGY_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setEnergy(option.key)}
                    aria-pressed={energy === option.key}
                    className="rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={
                      energy === option.key
                        ? { borderColor: ACCENT, backgroundColor: `${ACCENT}12` }
                        : { borderColor: '#e5e7eb' }
                    }
                  >
                    <span
                      className="block text-sm font-medium"
                      style={{ color: energy === option.key ? ACCENT_TEXT : '#374151' }}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-400">{option.hint}</span>
                  </button>
                ))}
              </div>
            </Field>
          </PortalCard>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          {status === 'saved' && <p className="text-xs font-medium text-green-600">Saved.</p>}

          <PortalButton type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save changes'}
          </PortalButton>
        </form>

        <div className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Live preview</p>
          <PreviewFrame label={business.name}>
            <SpeechBubble text={greeting || 'Your greeting will show here.'} />
            <AnimatedCharacter
              state="idle"
              mascotKey={mascotKey}
              customImageUrl={customImageUrl}
              energy={energy}
              compact
            />
          </PreviewFrame>
          <p className="mt-2 text-[11px] text-gray-400">
            Unsaved changes preview instantly here — nothing goes live until you save.
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</h2>
}
