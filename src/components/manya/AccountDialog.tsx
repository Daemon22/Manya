'use client'

import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { signIn } from 'next-auth/react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartIndexing: () => void
}

type Mode = 'signup' | 'signin'

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-gold-600/20 bg-white/75 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-gold-600/55 focus:ring-2 focus:ring-gold-400/25'

const primaryClass =
  'inline-flex w-full items-center justify-center rounded-full bg-gold-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gold-800 disabled:cursor-not-allowed disabled:opacity-60'

export function AccountDialog({ open, onOpenChange, onStartIndexing }: Props) {
  const [mode, setMode] = useState<Mode>('signup')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setComplete(false)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    const values = new FormData(event.currentTarget)
    const password = String(values.get('password') ?? '')

    try {
      if (mode === 'signup') {
        const name = String(values.get('name') ?? '').trim()
        const username = String(values.get('username') ?? '').trim()
        const email = String(values.get('email') ?? '').trim()
        const confirmation = String(values.get('confirmPassword') ?? '')
        if (password !== confirmation) throw new Error('The passwords do not match.')

        const response = await fetch('/api/account/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email, password }),
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error ?? 'Your account could not be created.')

        const result = await signIn('credentials', {
          identifier: username,
          password,
          redirect: false,
        })
        if (result?.error) {
          setMode('signin')
          setError('Your account was created. Sign in with your new details to continue.')
          return
        }
      } else {
        const identifier = String(values.get('identifier') ?? '').trim()
        const result = await signIn('credentials', {
          identifier,
          password,
          redirect: false,
        })
        if (result?.error) throw new Error('That username or email and password did not match.')
      }

      setComplete(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-gold-600/20 bg-background p-6 shadow-2xl outline-none sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mny-caps text-gold-700/90">✦ Manya account</p>
              <Dialog.Title className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {complete ? 'Welcome to the circle' : mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {complete
                  ? 'Your account is ready. Continue with indexing whenever you are.'
                  : 'Sign in with your username or email, or create a new account to begin.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close account dialog" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold-600/20 text-xl text-muted-foreground transition hover:bg-gold-400/10">
                ×
              </button>
            </Dialog.Close>
          </div>

          {complete ? (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onStartIndexing()
              }}
              className={primaryClass + ' mt-7'}
            >
              Begin indexing →
            </button>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 rounded-full border border-gold-600/15 bg-gold-400/[0.06] p-1" role="tablist" aria-label="Account action">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => switchMode('signup')}
                  className={mode === 'signup' ? 'rounded-full bg-white px-3 py-2 text-sm font-medium text-gold-800 shadow-sm' : 'rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground'}
                >
                  Create account
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => switchMode('signin')}
                  className={mode === 'signin' ? 'rounded-full bg-white px-3 py-2 text-sm font-medium text-gold-800 shadow-sm' : 'rounded-full px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground'}
                >
                  Sign in
                </button>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4">
                {mode === 'signup' ? (
                  <>
                    <label className="block text-sm font-medium">
                      Name
                      <input name="name" autoComplete="name" minLength={2} maxLength={80} required className={fieldClass} />
                    </label>
                    <label className="block text-sm font-medium">
                      Username
                      <input name="username" autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required className={fieldClass} />
                    </label>
                    <label className="block text-sm font-medium">
                      Email address
                      <input name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClass} />
                    </label>
                  </>
                ) : (
                  <label className="block text-sm font-medium">
                    Username or email
                    <input name="identifier" autoComplete="username" maxLength={254} required className={fieldClass} />
                  </label>
                )}

                <label className="block text-sm font-medium">
                  Password
                  <input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} maxLength={128} required className={fieldClass} />
                </label>

                {mode === 'signup' && (
                  <label className="block text-sm font-medium">
                    Confirm password
                    <input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={fieldClass} />
                  </label>
                )}

                {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">{error}</p>}

                <button type="submit" disabled={busy} className={primaryClass}>
                  {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
