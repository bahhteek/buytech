import { useEffect, useState } from 'react'

const INTRO_KEY = 'buytech_intro'
const PUSH_MS = 2200

export function HomeIntro({ ready }: { ready: boolean }) {
  const [skip] = useState(() => sessionStorage.getItem(INTRO_KEY) === '1')
  const [animDone, setAnimDone] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (skip || animDone) return
    const timer = window.setTimeout(() => setAnimDone(true), PUSH_MS)
    return () => window.clearTimeout(timer)
  }, [skip, animDone])

  useEffect(() => {
    if (skip || !animDone || !ready) return
    sessionStorage.setItem(INTRO_KEY, '1')
    setLeaving(true)
    const timer = window.setTimeout(() => setGone(true), 480)
    return () => window.clearTimeout(timer)
  }, [skip, animDone, ready])

  useEffect(() => {
    if (skip || leaving || gone) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [skip, leaving, gone])

  if (skip || gone) return null

  return (
    <div className={`home-intro${animDone && !ready ? ' is-hold' : ''}${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <img className="home-intro-logo" src="/logo-lockup.svg" alt="buytechkz" />
      <span className="home-intro-bar" aria-hidden="true" />
    </div>
  )
}
