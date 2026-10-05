import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamApi, teamAuth } from '@/services/teamApi'
import { ACCENT_STRONG } from '@/lib/palette'
import { INPUT_CLASS } from '@/lib/formStyles'
import { Field } from '@/components/common/Field'
import { PortalButton } from '@/components/portal/PortalUI'
import { SparkIcon } from '@/components/portal/icons'

export function TeamLoginPage() {
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
      const { token } = await teamApi.login({ email, password })
      teamAuth.setToken(token)
      navigate('/team/businesses')
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

        {/* The icon mark rather than the wordmark: the wordmark is navy on
            navy here, whereas the mark's white bubble and green bars read
            cleanly against the panel. */}
        <div className="relative flex items-center gap-2.5 text-sm font-semibold tracking-wide">
          <img src="/brand/qualeadio-icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          Qualeadio Team
        </div>

        <div className="relative max-w-sm">
          <SparkIcon className="mb-4 h-8 w-8 opacity-80" />
          <h2 className="text-2xl font-semibold leading-snug">Internal admin access.</h2>
          <p className="mt-3 text-sm text-white/70">
            Manage client businesses, review usage, and support accounts from one place. Staff only.
          </p>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Qualeadio</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          {/* The tagline-free lockup: the full logo's strapline is unreadable
              below ~80px tall. Light side only — that strapline and the
              wordmark are navy, which would vanish on the dark panel. */}
          <img
            src="/brand/qualeadio-wordmark-240.png"
            alt="Qualeadio"
            className="mb-3 h-8 w-auto lg:hidden"
          />

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team sign in</h1>
            <p className="mt-1.5 text-sm text-gray-500">Internal staff access only — not for clients.</p>
          </div>

          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
              placeholder="you@qualeadio.com"
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </PortalButton>
        </form>
      </div>
    </div>
  )
}
