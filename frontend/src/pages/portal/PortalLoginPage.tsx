import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { portalApi, portalAuth } from '@/services/portalApi'
import { ACCENT, ACCENT_STRONG } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { PortalButton } from '@/components/portal/PortalUI'
import { BotIcon, SparkIcon } from '@/components/portal/icons'

export function PortalLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { token } = await portalApi.login({ email, password })
      portalAuth.setToken(token)
      navigate('/portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
      <div
        className="relative hidden w-[42%] flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{ background: `linear-gradient(160deg, ${ACCENT_STRONG}, #12294f)` }}
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-2 text-sm font-semibold tracking-wide">
          <BotIcon className="h-6 w-6" />
          Site Concierge
        </div>

        <div className="relative max-w-sm">
          <SparkIcon className="mb-4 h-8 w-8 opacity-80" />
          <h2 className="text-2xl font-semibold leading-snug">
            Your AI sales concierge, configured your way.
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Set what it focuses on, what it knows, and how it presents itself — all from here.
          </p>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Site Concierge</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 lg:hidden">
            <BotIcon className="h-6 w-6" style={{ color: ACCENT }} />
            Site Concierge
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-gray-500">Log in to manage your bot's setup and leads.</p>
          </div>

          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              placeholder="owner@acmefitness.com"
              autoFocus
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <PortalButton type="submit" disabled={submitting} className="w-full py-2.5">
            {submitting ? 'Logging in…' : 'Log in'}
          </PortalButton>
        </form>
      </div>
    </div>
  )
}
